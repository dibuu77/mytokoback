
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE: Hapus nota
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await prisma.nota.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Nota berhasil dihapus",
    });
  } catch (error) {
    console.error("DELETE Nota:", error);

    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Nota tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Gagal menghapus nota" },
      { status: 500 }
    );
  }
}
