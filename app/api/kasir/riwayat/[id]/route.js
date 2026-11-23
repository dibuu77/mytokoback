
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const sesi = await prisma.sesiKasir.findUnique({
      where: { id },
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

    if (!sesi) {
      return NextResponse.json(
        {
          success: false,
          message: "Riwayat kasir tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    const modalAwal = Number(sesi.modalAwal);
    const totalJual = Number(sesi.totalJual);

    const uangSeharusnya =
      sesi.status === "BUKA"
        ? modalAwal + totalJual
        : Number(
            sesi.uangSeharusnya ?? modalAwal + totalJual
          );

    const uangAkhir =
      sesi.uangAkhir == null
        ? null
        : Number(sesi.uangAkhir);

    const selisih =
      sesi.status === "TUTUP"
        ? Number(
            sesi.selisih ??
              (uangAkhir != null
                ? uangAkhir - uangSeharusnya
                : 0)
          )
        : null;

    return NextResponse.json({
      success: true,
      data: {
        id: sesi.id,
        status: sesi.status,
        dibukaPada: sesi.dibukaPada,
        ditutupPada: sesi.ditutupPada,
        modalAwal,
        totalJual,
        uangSeharusnya,
        uangAkhir,
        selisih,
        totalTransaksi: sesi.pesanan.length,
        pesanan: sesi.pesanan,
      },
    });
  } catch (error) {
    console.error("GET DETAIL RIWAYAT KASIR ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil detail riwayat kasir.",
      },
      { status: 500 }
    );
  }
}
