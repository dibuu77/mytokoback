
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Ambil nota, bisa difilter berdasarkan produkId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const produkId = searchParams.get("produkId");

    const data = await prisma.nota.findMany({
      where: produkId ? { produkId } : {},
      include: {
        produk: {
          select: {
            id: true,
            nama: true,
            fotoUrl: true,
          },
        },
      },
      orderBy: {
        tanggal: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("GET Nota:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data nota" },
      { status: 500 }
    );
  }
}

// POST: Tambah nota pembelian
export async function POST(request) {
  try {
    const body = await request.json();

    const { produkId, buyyer, jumlahbeli, tanggal, fotonota } = body;

    if (!produkId || !buyyer?.trim() || !jumlahbeli || !tanggal) {
      return NextResponse.json(
        { success: false, message: "Lengkapi semua data wajib" },
        { status: 400 }
      );
    }

    const jumlah = Number(jumlahbeli);
    const tanggalNota = new Date(tanggal);

    if (!Number.isInteger(jumlah) || jumlah < 1) {
      return NextResponse.json(
        { success: false, message: "Jumlah pembelian minimal 1" },
        { status: 400 }
      );
    }

    if (Number.isNaN(tanggalNota.getTime())) {
      return NextResponse.json(
        { success: false, message: "Tanggal tidak valid" },
        { status: 400 }
      );
    }

    const produk = await prisma.produk.findUnique({
      where: { id: produkId },
    });

    if (!produk) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    const notaBaru = await prisma.nota.create({
      data: {
        produkId,
        buyyer: buyyer.trim(),
        jumlahbeli: jumlah,
        tanggal: tanggalNota,
        fotonota: fotonota?.trim() || null,
      },
      include: {
        produk: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Nota berhasil ditambahkan",
        data: notaBaru,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Nota:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menambahkan nota" },
      { status: 500 }
    );
  }
}
