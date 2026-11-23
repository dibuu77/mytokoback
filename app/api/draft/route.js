
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

    return NextResponse.json({
      success: true,
      data: hasil,
    });
  } catch (error) {
    console.error("GET DRAFT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
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

    const namaPembeli = body.namaPembeli?.trim();
    const { produkId, varianId, jumlah } = body;

    if (
      typeof namaPembeli !== "string" ||
      !namaPembeli ||
      typeof produkId !== "string" ||
      !produkId.trim() ||
      (varianId !== undefined &&
        varianId !== null &&
        (typeof varianId !== "string" || !varianId.trim())) ||
      !Number.isSafeInteger(jumlah) ||
      jumlah < 1
    ) {
      return NextResponse.json(
        {
          success: false,
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
          throw new Error("PRODUK_TIDAK_DITEMUKAN");
        }

        let harga = produk.harga;
        let stok = produk.stok;
        let namaVarian = null;

        // Validasi varian jika dipilih
        if (varianId) {
          const varian = await tx.varianProduk.findFirst({
            where: {
              id: varianId,
              produkId,
            },
          });

          if (!varian) {
            throw new Error("VARIAN_TIDAK_DITEMUKAN");
          }

          harga = varian.harga;
          stok = varian.stok;
          namaVarian = varian.nama;
        }

        if (
          !Number.isSafeInteger(harga) ||
          harga < 0 ||
          !Number.isSafeInteger(stok) ||
          stok < 0
        ) {
          throw new Error("DATA_PRODUK_TIDAK_VALID");
        }

        // Cari Draft aktif berdasarkan nama pembeli
        let draft = await tx.draftPesanan.findFirst({
          where: {
            namaPembeli: {
              equals: namaPembeli,
              mode: "insensitive",
            },
            status: "DRAFT",
          },
          orderBy: {
            updatedAt: "desc",
          },
        });

        // Buat Draft jika belum tersedia
        if (!draft) {
          draft = await tx.draftPesanan.create({
            data: {
              namaPembeli,
            },
          });
        }

        // Hitung seluruh jumlah produk/varian di semua Draft aktif.
        // Perhitungan mencakup tanggal berbeda dan harga berbeda.
        const jumlahLama = await tx.itemDraft.aggregate({
          where: {
            produkId,
            varianId: varianId || null,
            draft: {
              is: {
                status: "DRAFT",
              },
            },
          },
          _sum: {
            jumlah: true,
          },
        });

        const totalJumlah =
          (jumlahLama._sum.jumlah || 0) + jumlah;

        if (totalJumlah > stok) {
          throw new Error(
            `STOK_TIDAK_CUKUP:${stok}:${totalJumlah}`
          );
        }

        // Batas tanggal berdasarkan WIB
        const { start, end } = getBatasTanggalWIB();

        // Cari item yang sama:
        // Draft, produk, varian, harga, dan tanggal WIB
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

        // Perbarui aktivitas Draft
        await tx.draftPesanan.update({
          where: {
            id: draft.id,
          },
          data: {
            updatedAt: new Date(),
          },
        });

        return {
          ...item,
          draftId: draft.id,
          namaPembeli: draft.namaPembeli,
        };
      },
      {
        isolationLevel: "Serializable",
      }
    );

    return NextResponse.json(
      {
        success: true,
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
          success: false,
          message:
            "Draft sedang mengalami perubahan. Silakan coba kembali.",
        },
        { status: 409 }
      );
    }

    if (error.message.startsWith("STOK_TIDAK_CUKUP:")) {
      const [, stok, total] = error.message.split(":");

      return NextResponse.json(
        {
          success: false,
          message: `Stok tidak mencukupi. Stok tersedia: ${stok}, sedangkan total permintaan Draft: ${total}.`,
        },
        { status: 409 }
      );
    }

    const errors = {
      PRODUK_TIDAK_DITEMUKAN: [
        "Produk tidak ditemukan atau tidak aktif.",
        404,
      ],
      VARIAN_TIDAK_DITEMUKAN: [
        "Varian produk tidak ditemukan.",
        404,
      ],
      DATA_PRODUK_TIDAK_VALID: [
        "Data harga atau stok produk tidak valid.",
        400,
      ],
    };

    const known = errors[error.message];

    return NextResponse.json(
      {
        success: false,
        message: known?.[0] || "Gagal menambahkan produk ke Draft.",
      },
      { status: known?.[1] || 400 }
    );
  }
}
