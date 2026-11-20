
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH: Mengubah jumlah produk
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const jumlah = Number(body.jumlah);

    if (!Number.isInteger(jumlah) || jumlah < 1) {
      return NextResponse.json(
        { success: false, message: "Jumlah harus bilangan bulat minimal 1" },
        { status: 400 }
      );
    }

    const item = await prisma.itemDraft.findUnique({
      where: { id },
      include: {
        produk: true,
        varian: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, message: "Item draft tidak ditemukan" },
        { status: 404 }
      );
    }

    const stok = item.varian
      ? item.varian.stok
      : item.produk.stok;

    if (jumlah > stok) {
      return NextResponse.json(
        { success: false, message: `Stok tersedia hanya ${stok}` },
        { status: 400 }
      );
    }

    const hasil = await prisma.itemDraft.update({
      where: { id },
      data: { jumlah },
    });

    return NextResponse.json({
      success: true,
      message: "Jumlah berhasil diperbarui",
      data: hasil,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus item dari draft
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const item = await prisma.itemDraft.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, message: "Item draft tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.itemDraft.delete({
        where: { id },
      });

      // Hapus draft jika sudah tidak memiliki produk
      const sisaItem = await tx.itemDraft.count({
        where: { draftId: item.draftId },
      });

      if (sisaItem === 0) {
        await tx.draftPesanan.delete({
          where: { id: item.draftId },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Produk berhasil dihapus dari draft",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
