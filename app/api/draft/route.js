
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Menghitung batas tanggal berdasarkan WIB (UTC+7)
function getBatasTanggalWIB() {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);

  const start = new Date(
    Date.UTC(
      wib.getUTCFullYear(),
      wib.getUTCMonth(),
      wib.getUTCDate()
    ) - 7 * 60 * 60 * 1000
  );

  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
}

// GET: Menampilkan semua Draft aktif
export async function GET() {
  try {
    const drafts = await prisma.draftPesanan.findMany({
      where: {
        status: "DRAFT",
      },
      include: {
        items: {
          include: {
            produk: true,
            varian: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const hasil = drafts.map((draft) => ({
      ...draft,
      total: draft.items.reduce(
        (total, item) =>
          total + Number(item.harga) * Number(item.jumlah),
        0
      ),
    }));

    return NextResponse.json(hasil);
  } catch (error) {
    console.error("GET DRAFT ERROR:", error);

    return NextResponse.json(
      {
        message: "Gagal mengambil data Draft.",
      },
      { status: 500 }
    );
  }
}

// POST: Menambahkan produk ke Draft
export async function POST(request) {
  try {
    const body = await request.json();

    const { namaPembeli, produkId, varianId, jumlah } = body;

    if (
      typeof namaPembeli !== "string" ||
      !namaPembeli.trim() ||
      !produkId ||
      !Number.isSafeInteger(jumlah) ||
      jumlah < 1
    ) {
      return NextResponse.json(
        {
          message: "Data Draft tidak valid.",
        },
        { status: 400 }
      );
    }

    const hasil = await prisma.$transaction(
      async (tx) => {
        // Ambil produk
        const produk = await tx.produk.findUnique({
          where: {
            id: produkId,
          },
        });

        if (!produk || !produk.isAktif) {
          throw new Error(
            "Produk tidak ditemukan atau tidak aktif."
          );
        }

        let harga = produk.harga;
        let stok = produk.stok;
        let namaVarian = null;

        // Jika menggunakan varian
        if (varianId) {
          const varian = await tx.varianProduk.findFirst({
            where: {
              id: varianId,
              produkId,
            },
          });

          if (!varian) {
            throw new Error("Varian produk tidak ditemukan.");
          }

          harga = varian.harga;
          stok = varian.stok;
          namaVarian = varian.nama;
        }

        // Cari atau buat Draft berdasarkan nama pembeli
        let draft = await tx.draftPesanan.findFirst({
          where: {
            namaPembeli: {
              equals: namaPembeli.trim(),
              mode: "insensitive",
            },
            status: "DRAFT",
          },
        });

        if (!draft) {
          draft = await tx.draftPesanan.create({
            data: {
              namaPembeli: namaPembeli.trim(),
            },
          });
        }

        // Hitung seluruh jumlah produk dalam Draft
        const jumlahLama = await tx.itemDraft.aggregate({
          where: {
            draftId: draft.id,
            produkId,
            varianId: varianId || null,
          },
          _sum: {
            jumlah: true,
          },
        });

        const totalJumlah =
          (jumlahLama._sum.jumlah || 0) + jumlah;

        if (totalJumlah > stok) {
          throw new Error(
            `Stok tidak mencukupi. Stok tersedia: ${stok}.`
          );
        }

        // Ambil batas tanggal hari ini berdasarkan WIB
        const { start, end } = getBatasTanggalWIB();

        // Cari item dengan produk, varian, harga,
        // dan tanggal yang sama
        const itemLama = await tx.itemDraft.findFirst({
          where: {
            draftId: draft.id,
            produkId,
            varianId: varianId || null,
            harga,
            createdAt: {
              gte: start,
              lt: end,
            },
          },
        });

        let item;

        if (itemLama) {
          // Item sama: tambahkan jumlah
          // Harga dan tanggal tetap dipertahankan
          item = await tx.itemDraft.update({
            where: {
              id: itemLama.id,
            },
            data: {
              jumlah: itemLama.jumlah + jumlah,
            },
          });
        } else {
          // Item berbeda: buat baris baru
          item = await tx.itemDraft.create({
            data: {
              draftId: draft.id,
              produkId,
              varianId: varianId || null,
              namaProduk: produk.nama,
              namaVarian,
              harga,
              jumlah,
            },
          });
        }

        // Perbarui aktivitas Draft agar urutan GET akurat
        await tx.draftPesanan.update({
          where: {
            id: draft.id,
          },
          data: {
            updatedAt: new Date(),
          },
        });

        return item;
      },
      {
        isolationLevel: "Serializable",
      }
    );

    return NextResponse.json(
      {
        message: "Produk berhasil ditambahkan ke Draft.",
        item: hasil,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST DRAFT ERROR:", error);

    if (error.code === "P2034") {
      return NextResponse.json(
        {
          message:
            "Draft sedang mengalami perubahan. Silakan coba kembali.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: error.message || "Gagal menambahkan produk.",
      },
      { status: 400 }
    );
  }
}
