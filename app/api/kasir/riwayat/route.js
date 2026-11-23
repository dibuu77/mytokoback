
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const sesi = await prisma.sesiKasir.findMany({
      orderBy: {
        dibukaPada: "desc",
      },
      include: {
        pesanan: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            nomorNota: true,
            namaPembeli: true,
            total: true,
            uangDiterima: true,
            kembalian: true,
            createdAt: true,
            detailItems: {
              orderBy: {
                id: "asc",
              },
              select: {
                id: true,
                namaProduk: true,
                namaVarian: true,
                harga: true,
                jumlah: true,
              },
            },
          },
        },
      },
    });

    const data = sesi.map((item) => {
      const modalAwal = Number(item.modalAwal);
      const totalJual = Number(item.totalJual);

      const uangSeharusnya =
        item.status === "BUKA"
          ? modalAwal + totalJual
          : Number(
              item.uangSeharusnya ?? modalAwal + totalJual
            );

      const uangAkhir =
        item.uangAkhir == null
          ? null
          : Number(item.uangAkhir);

      let selisih = null;

      if (item.status === "TUTUP") {
        selisih =
          item.selisih != null
            ? Number(item.selisih)
            : uangAkhir != null
              ? uangAkhir - uangSeharusnya
              : null;
      }

      return {
        id: item.id,
        status: item.status,
        dibukaPada: item.dibukaPada,
        ditutupPada: item.ditutupPada,
        modalAwal,
        totalJual,
        uangSeharusnya,
        uangAkhir,
        selisih,
        totalTransaksi: item.pesanan.length,
        pesanan: item.pesanan,
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("GET RIWAYAT KASIR ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil riwayat kasir.",
      },
      { status: 500 }
    );
  }
}
