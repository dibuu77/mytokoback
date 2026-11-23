
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Detail draft berdasarkan ID
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const draft = await prisma.draftPesanan.findUnique({
      where: { id },
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

    if (!draft || draft.status !== "DRAFT") {
      return NextResponse.json(
        { success: false, message: "Draft tidak ditemukan" },
        { status: 404 }
      );
    }

    const total = draft.items.reduce(
      (sum, item) => sum + item.harga * item.jumlah,
      0
    );

    return NextResponse.json({
      success: true,
      data: { ...draft, total },
    });
  } catch (error) {
    console.error("GET DETAIL DRAFT ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail Draft" },
      { status: 500 }
    );
  }
}

// PATCH: Mengubah jumlah produk dalam Draft
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const { itemId, jumlah } = await request.json();

    if (!itemId || !Number.isInteger(jumlah) || jumlah < 1) {
      return NextResponse.json(
        { success: false, message: "Jumlah tidak valid" },
        { status: 400 }
      );
    }

    const hasil = await prisma.$transaction(async (tx) => {
      // Pastikan Draft masih aktif
      const draft = await tx.draftPesanan.findFirst({
        where: { id, status: "DRAFT" },
      });

      if (!draft) throw new Error("Draft tidak ditemukan");

      // Ambil item yang akan diedit
      const item = await tx.itemDraft.findFirst({
        where: {
          id: itemId,
          draftId: id,
        },
      });

      if (!item) {
        throw new Error("Produk tidak ditemukan dalam Draft");
      }

      // Ambil produk
      const produk = await tx.produk.findUnique({
        where: { id: item.produkId },
      });

      if (!produk) throw new Error("Produk tidak ditemukan");

      let stok = produk.stok;

      // Jika item menggunakan varian, ambil stok varian
      if (item.varianId) {
        const varian = await tx.varianProduk.findFirst({
          where: {
            id: item.varianId,
            produkId: item.produkId,
          },
        });

        if (!varian) throw new Error("Varian tidak ditemukan");

        stok = varian.stok;
      }

      // Hitung jumlah produk pada baris lain
      // dengan produk dan varian yang sama
      const jumlahLain = await tx.itemDraft.aggregate({
        where: {
          draftId: id,
          produkId: item.produkId,
          varianId: item.varianId,
          id: { not: itemId },
        },
        _sum: {
          jumlah: true,
        },
      });

      const totalJumlah =
        (jumlahLain._sum.jumlah || 0) + jumlah;

      // Pastikan total seluruh baris tidak melebihi stok
      if (totalJumlah > stok) {
        throw new Error(
          `Stok tidak cukup. Maksimal jumlah pada baris ini: ${
            stok - (jumlahLain._sum.jumlah || 0)
          }`
        );
      }

      // Ubah jumlah saja.
      // Harga dan tanggal item tetap dipertahankan.
      return await tx.itemDraft.update({
        where: { id: itemId },
        data: { jumlah },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Jumlah produk berhasil diubah",
      data: hasil,
    });
  } catch (error) {
    console.error("PATCH DETAIL DRAFT ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}

// DELETE: Menghapus produk dari Draft
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        { success: false, message: "ID produk wajib diisi" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Pastikan Draft masih aktif
      const draft = await tx.draftPesanan.findFirst({
        where: {
          id,
          status: "DRAFT",
        },
      });

      if (!draft) throw new Error("Draft tidak ditemukan");

      // Pastikan item merupakan bagian dari Draft tersebut
      const item = await tx.itemDraft.findFirst({
        where: {
          id: itemId,
          draftId: id,
        },
      });

      if (!item) {
        throw new Error("Produk tidak ditemukan dalam Draft");
      }

      await tx.itemDraft.delete({
        where: { id: itemId },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Produk berhasil dihapus dari Draft",
    });
  } catch (error) {
    console.error("DELETE DETAIL DRAFT ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}
