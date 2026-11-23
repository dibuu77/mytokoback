
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
        varian: {
          select: {
            id: true,
            nama: true,
            stok: true,
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

// POST: Tambah nota dan stok pembelian
export async function POST(request) {
  try {
    const body = await request.json();

    const {
      produkId,
      varianId,
      buyyer,
      jumlahbeli,
      tanggal,
      fotonota,
    } = body;

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
    const idVarian = varianId?.trim() || null;

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

      let stokTerbaru;

      // Pembelian produk dengan varian
      if (idVarian) {
        const varian = await tx.varianProduk.findFirst({
          where: {
            id: idVarian,
            produkId,
          },
        });

        if (!varian) {
          throw new Error("VARIAN_NOT_FOUND");
        }

        const updated = await tx.varianProduk.update({
          where: { id: idVarian },
          data: {
            stok: { increment: jumlah },
          },
          select: { stok: true },
        });

        stokTerbaru = updated.stok;
      } else {
        // Pembelian produk tanpa varian
        const updated = await tx.produk.update({
          where: { id: produkId },
          data: {
            stok: { increment: jumlah },
          },
          select: { stok: true },
        });

        stokTerbaru = updated.stok;
      }

      // Simpan catatan pembelian
      const notaBaru = await tx.nota.create({
        data: {
          produkId,
          varianId: idVarian,
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
          varian: {
            select: {
              id: true,
              nama: true,
            },
          },
        },
      });

      return {
        nota: notaBaru,
        stokTerbaru,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Nota berhasil ditambahkan dan stok diperbarui",
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

    if (error.message === "VARIAN_NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "Varian tidak ditemukan pada produk tersebut" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Gagal menambahkan nota pembelian" },
      { status: 500 }
    );
  }
}
