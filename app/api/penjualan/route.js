
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST: Checkout Draft menjadi transaksi penjualan
export async function POST(request) {
  try {
    const { draftId } = await request.json();

    if (!draftId) {
      return NextResponse.json(
        { success: false, message: "ID Draft tidak ditemukan" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Ambil Draft beserta item
        const draft = await tx.draftPesanan.findUnique({
          where: { id: draftId },
          include: { items: true },
        });

        if (!draft || draft.status !== "DRAFT") {
          throw new Error(
            "Draft tidak ditemukan atau sudah diproses"
          );
        }

        if (!draft.items.length) {
          throw new Error("Draft masih kosong");
        }

        if (!draft.namaPembeli?.trim()) {
          throw new Error("Nama pembeli belum tersedia");
        }

        // Pastikan sesi kasir sedang dibuka
        const sesi = await tx.sesiKasir.findFirst({
          where: { status: "BUKA" },
          orderBy: { dibukaPada: "desc" },
        });

        if (!sesi) {
          throw new Error("Buka sesi kasir terlebih dahulu");
        }

        // Hitung total berdasarkan harga snapshot Draft
        const total = draft.items.reduce(
          (sum, item) => sum + item.harga * item.jumlah,
          0
        );

        if (!Number.isSafeInteger(total) || total <= 0) {
          throw new Error("Total pembayaran tidak valid");
        }

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
              `Stok ${item.namaProduk}${
                item.namaVarian
                  ? ` (${item.namaVarian})`
                  : ""
              } tidak mencukupi`
            );
          }
        }

        // Buat transaksi penjualan
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

                // Gunakan harga snapshot Draft
                harga: item.harga,
              })),
            },
          },
          include: {
            detailItems: {
              include: {
                produk: true,
                varian: true,
              },
            },
          },
        });

        // Tambahkan total penjualan sesi kasir
        await tx.sesiKasir.update({
          where: { id: sesi.id },
          data: {
            totalJual: { increment: total },
          },
        });

        // Tandai Draft selesai, jangan hapus datanya
        const updateDraft = await tx.draftPesanan.updateMany({
          where: {
            id: draftId,
            status: "DRAFT",
          },
          data: {
            status: "SELESAI",
          },
        });

        if (updateDraft.count !== 1) {
          throw new Error(
            "Draft sudah diproses oleh transaksi lain"
          );
        }

        return pesanan;
      },
      {
        isolationLevel: "Serializable",
      }
    );

    return NextResponse.json({
      success: true,
      message: "Pembayaran berhasil diselesaikan",
      data: result,
    });
  } catch (error) {
    console.error("CHECKOUT ERROR:", error);

    // Konflik transaksi bersamaan
    if (error.code === "P2034") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Draft sedang diproses. Silakan periksa kembali transaksi.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal memproses pembayaran",
      },
      { status: 400 }
    );
  }
}

// GET: Mengambil riwayat penjualan
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
