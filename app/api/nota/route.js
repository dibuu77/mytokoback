
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Ambil nota pembelian
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

// POST: Tambah nota pembelian dan stok produk
export async function POST(request) {
  try {
    const body = await request.json();

    const { produkId, buyyer, jumlahbeli, tanggal, fotonota } = body;

    if (
      !produkId ||
      !buyyer?.trim() ||
      jumlahbeli === undefined ||
      jumlahbeli === null ||
      !tanggal
    ) {
      return NextResponse.json(
        { success: false, message: "Lengkapi semua data wajib" },
        { status: 400 }
      );
    }

    const jumlah = Number(jumlahbeli);
    const tanggalNota = new Date(tanggal);

    if (!Number.isSafeInteger(jumlah) || jumlah < 1) {
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

    const hasil = await prisma.$transaction(async (tx) => {
      const produk = await tx.produk.findUnique({
        where: { id: produkId },
        select: { id: true },
      });

      if (!produk) {
        throw new Error("PRODUK_NOT_FOUND");
      }

      // Simpan nota pembelian
      const notaBaru = await tx.nota.create({
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

      // Tambahkan stok produk
      await tx.produk.update({
        where: { id: produkId },
        data: {
          stok: {
            increment: jumlah,
          },
        },
      });

      // Ambil stok terbaru
      const produkTerbaru = await tx.produk.findUnique({
        where: { id: produkId },
        select: { stok: true },
      });

      return {
        nota: notaBaru,
        stokTerbaru: produkTerbaru.stok,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Nota berhasil ditambahkan dan stok berhasil diperbarui",
        data: hasil.nota,
        stokTerbaru: hasil.stokTerbaru,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Nota:", error);

    if (error.message === "PRODUK_NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Gagal menambahkan nota pembelian" },
      { status: 500 }
    );
  }
}
