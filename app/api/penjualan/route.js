
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request) {
  try {
    const { draftId } = await request.json();

    if (!draftId) {
      return NextResponse.json(
        { success: false, message: "ID Draft tidak ditemukan" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Ambil draft beserta item
      const draft = await tx.draftPesanan.findUnique({
        where: { id: draftId },
        include: { items: true },
      });

      if (!draft || draft.status !== "DRAFT") {
        throw new Error("Draft tidak ditemukan atau sudah diproses");
      }

      if (!draft.items.length) {
        throw new Error("Draft masih kosong");
      }

      if (!draft.namaPembeli?.trim()) {
        throw new Error("Nama pembeli belum tersedia");
      }

      // Pastikan kasir sedang dibuka
      const sesi = await tx.sesiKasir.findFirst({
        where: { status: "BUKA" },
      });

      if (!sesi) {
        throw new Error("Buka sesi kasir terlebih dahulu");
      }

      const total = draft.items.reduce(
        (sum, item) => sum + item.harga * item.jumlah,
        0
      );

      // Kurangi stok setiap item
      for (const item of draft.items) {
        const update = item.varianId
          ? await tx.varianProduk.updateMany({
              where: {
                id: item.varianId,
                produkId: item.produkId,
                stok: { gte: item.jumlah },
              },
              data: {
                stok: { decrement: item.jumlah },
              },
            })
          : await tx.produk.updateMany({
              where: {
                id: item.produkId,
                stok: { gte: item.jumlah },
              },
              data: {
                stok: { decrement: item.jumlah },
              },
            });

        if (update.count !== 1) {
          throw new Error(
            `Stok ${item.namaProduk}${item.namaVarian ? ` (${item.namaVarian})` : ""} tidak mencukupi`
          );
        }
      }

      // Buat transaksi penjualan beserta detailnya
      const pesanan = await tx.pesanan.create({
        data: {
          namaPembeli: draft.namaPembeli.trim(),
          total,
          detailItems: {
            create: draft.items.map((item) => ({
              produkId: item.produkId,
              varianId: item.varianId,
              namaVarian: item.namaVarian,
              jumlah: item.jumlah,
              harga: item.harga,
            })),
          },
        },
        include: {
          detailItems: true,
        },
      });

      // Perbarui total penjualan sesi kasir
      await tx.sesiKasir.update({
        where: { id: sesi.id },
        data: {
          totalJual: { increment: total },
        },
      });

      // Hapus draft beserta item-itemnya
      await tx.draftPesanan.delete({
        where: { id: draftId },
      });

      return pesanan;
    });

    return NextResponse.json({
      success: true,
      message: "Pembayaran berhasil diselesaikan",
      data: result,
    });
  } catch (error) {
    console.error("CHECKOUT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal memproses pembayaran",
      },
      { status: 400 }
    );
  }
}


export async function GET() {
  try {
    const [pesanan, totalTransaksi, hasilTotal] =
      await Promise.all([
        prisma.pesanan.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            detailItems: {
              include: {
                produk: true,
                varian: true,
              },
            },
          },
        }),

        prisma.pesanan.count(),

        prisma.pesanan.aggregate({
          _sum: { total: true },
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: pesanan,
      totalTransaksi,
      totalPenjualan: hasilTotal._sum.total || 0,
    });
  } catch (error) {
    console.error("GET PENJUALAN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data penjualan",
      },
      { status: 500 }
    );
  }
}

