
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Mengambil semua daftar draft aktif
export async function GET() {
  try {
    const drafts = await prisma.draftPesanan.findMany({
      where: { status: "DRAFT" },
      orderBy: { updatedAt: "desc" },
      include: {
        items: {
          include: {
            produk: true,
            varian: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const data = drafts.map((draft) => ({
      ...draft,
      total: draft.items.reduce(
        (sum, item) => sum + item.harga * item.jumlah,
        0
      ),
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// POST: Menambahkan produk ke draft pembeli
export async function POST(request) {
  try {
    const body = await request.json();

    const {
      namaPembeli,
      produkId,
      varianId = null,
      jumlah = 1,
    } = body;

    if (
      !namaPembeli?.trim() ||
      !produkId ||
      !Number.isInteger(jumlah) ||
      jumlah < 1
    ) {
      return NextResponse.json(
        { success: false, message: "Nama pembeli atau data produk tidak valid" },
        { status: 400 }
      );
    }

    const nama = namaPembeli.trim();

    const hasil = await prisma.$transaction(async (tx) => {
      const produk = await tx.produk.findUnique({
        where: { id: produkId },
      });

      if (!produk) {
        throw new Error("Produk tidak ditemukan");
      }

      let varian = null;
      let harga = produk.harga;
      let stok = produk.stok;

      if (varianId) {
        varian = await tx.varianProduk.findFirst({
          where: {
            id: varianId,
            produkId,
          },
        });

        if (!varian) {
          throw new Error("Varian tidak ditemukan");
        }

        harga = varian.harga;
        stok = varian.stok;
      }

      // Cari draft aktif milik pembeli
      let draft = await tx.draftPesanan.findFirst({
        where: {
          namaPembeli: {
            equals: nama,
            mode: "insensitive",
          },
          status: "DRAFT",
        },
        orderBy: { createdAt: "desc" },
      });

      // Jika belum ada, buat draft baru
      if (!draft) {
        draft = await tx.draftPesanan.create({
          data: {
            namaPembeli: nama,
            status: "DRAFT",
          },
        });
      }

      // Cari produk yang sama di draft pembeli
      const itemLama = await tx.itemDraft.findFirst({
        where: {
          draftId: draft.id,
          produkId,
          varianId,
        },
      });

      const jumlahBaru = (itemLama?.jumlah || 0) + jumlah;

      if (jumlahBaru > stok) {
        throw new Error(`Stok tidak cukup. Stok tersedia: ${stok}`);
      }

      let item;

      if (itemLama) {
        item = await tx.itemDraft.update({
          where: { id: itemLama.id },
          data: { jumlah: jumlahBaru },
        });
      } else {
        item = await tx.itemDraft.create({
          data: {
            draftId: draft.id,
            produkId,
            varianId,
            namaProduk: produk.nama,
            namaVarian: varian?.nama || null,
            harga,
            jumlah,
          },
        });
      }

      return { draft, item };
    });

    return NextResponse.json({
      success: true,
      message: "Produk berhasil ditambahkan ke draft pembeli",
      data: hasil,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}
