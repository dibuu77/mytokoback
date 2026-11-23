
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const detailInclude = {
  detailItems: {
    include: {
      produk: {
        select: {
          id: true,
          nama: true,
          fotoUrl: true,
        },
      },
      varian: {
        select: {
          id: true,
          nama: true,
        },
      },
    },
  },
  sesiKasir: true,
};

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID penjualan tidak ditemukan",
        },
        { status: 400 }
      );
    }

    const penjualan = await prisma.pesanan.findUnique({
      where: { id },
      include: detailInclude,
    });

    if (!penjualan) {
      return NextResponse.json(
        {
          success: false,
          message: "Data penjualan tidak ditemukan",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: penjualan,
    });
  } catch (error) {
    console.error("GET DETAIL PENJUALAN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil detail penjualan",
      },
      { status: 500 }
    );
  }
}
