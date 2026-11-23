
import prisma from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

// GET: Riwayat dan ringkasan seluruh penjualan
export async function GET() {
  try {
    const [riwayat, totalTransaksi, aggregate] =
      await Promise.all([
        prisma.pesanan.findMany({
          orderBy: {
            createdAt: "desc",
          },
          include: {
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
          },
        }),

        prisma.pesanan.count(),

        prisma.pesanan.aggregate({
          _sum: {
            total: true,
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      totalTransaksi,
      totalPenjualan: aggregate._sum.total || 0,
      data: riwayat,
    });
  } catch (error) {
    console.error("GET PENJUALAN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil riwayat penjualan.",
      },
      { status: 500 }
    );
  }
}

// POST: Checkout Draft
export async function POST(request) {
  try {
    const body = await request.json();
    const { draftId, uangDiterima } = body;

    if (!draftId) {
      return NextResponse.json(
        {
          success: false,
          message: "ID Draft wajib diisi.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isSafeInteger(uangDiterima) ||
      uangDiterima < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Nominal uang diterima tidak valid.",
        },
        { status: 400 }
      );
    }

    const hasil = await prisma.$transaction(
      async (tx) => {
        // Ambil Draft dan seluruh item
        const draft = await tx.draftPesanan.findUnique({
          where: {
            id: draftId,
          },
          include: {
            items: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

        if (!draft) {
          throw new Error("DRAFT_TIDAK_DITEMUKAN");
        }

        if (draft.status !== "DRAFT") {
          throw new Error("DRAFT_SUDAH_SELESAI");
        }

        if (!draft.items.length) {
          throw new Error("DRAFT_KOSONG");
        }

        if (!draft.namaPembeli?.trim()) {
          throw new Error("NAMA_PEMBELI_KOSONG");
        }

        // Pastikan sesi kasir masih terbuka
        const sesi = await tx.sesiKasir.findFirst({
          where: {
            status: "BUKA",
          },
          orderBy: {
            dibukaPada: "desc",
          },
        });

        if (!sesi) {
          throw new Error("KASIR_BELUM_DIBUKA");
        }

        // Hitung total berdasarkan harga snapshot Draft
        const total = draft.items.reduce(
          (sum, item) =>
            sum + Number(item.harga) * Number(item.jumlah),
          0
        );

        if (!Number.isSafeInteger(total) || total < 0) {
          throw new Error("TOTAL_TIDAK_VALID");
        }

        if (uangDiterima < total) {
          throw new Error("UANG_TIDAK_CUKUP");
        }

        const kembalian = uangDiterima - total;

        // Kurangi stok berdasarkan setiap item Draft
        for (const item of draft.items) {
          if (
            !Number.isSafeInteger(item.jumlah) ||
            item.jumlah <= 0
          ) {
            throw new Error("JUMLAH_ITEM_TIDAK_VALID");
          }

          if (item.varianId) {
            const updateStok =
              await tx.varianProduk.updateMany({
                where: {
                  id: item.varianId,
                  produkId: item.produkId,
                  stok: {
                    gte: item.jumlah,
                  },
                },
                data: {
                  stok: {
                    decrement: item.jumlah,
                  },
                },
              });

            if (updateStok.count !== 1) {
              throw new Error(
                `Stok varian ${item.namaVarian || item.namaProduk} tidak mencukupi.`
              );
            }
          } else {
            const updateStok =
              await tx.produk.updateMany({
                where: {
                  id: item.produkId,
                  stok: {
                    gte: item.jumlah,
                  },
                },
                data: {
                  stok: {
                    decrement: item.jumlah,
                  },
                },
              });

            if (updateStok.count !== 1) {
              throw new Error(
                `Stok produk ${item.namaProduk} tidak mencukupi.`
              );
            }
          }
        }

        // Pastikan sesi belum ditutup sebelum mencatat penjualan
        const updateSesi = await tx.sesiKasir.updateMany({
          where: {
            id: sesi.id,
            status: "BUKA",
          },
          data: {
            totalJual: {
              increment: total,
            },
          },
        });

        if (updateSesi.count !== 1) {
          throw new Error("SESI_KASIR_SUDAH_DITUTUP");
        }

        // Buat nomor nota unik
        const nomorNota = `INV-${randomUUID()
          .replace(/-/g, "")
          .slice(0, 12)
          .toUpperCase()}`;

        // Simpan transaksi dan hubungkan ke sesi kasir
        const pesanan = await tx.pesanan.create({
          data: {
            namaPembeli: draft.namaPembeli,
            total,
            nomorNota,
            uangDiterima,
            kembalian,

            // Relasi transaksi dengan sesi kasir
            sesiKasirId: sesi.id,

            detailItems: {
              create: draft.items.map((item) => ({
                produkId: item.produkId,
                varianId: item.varianId,
                namaProduk: item.namaProduk,
                namaVarian: item.namaVarian,
                jumlah: item.jumlah,
                harga: item.harga,
              })),
            },
          },
          include: {
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
          },
        });

        // Tandai Draft selesai, jangan dihapus
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
          throw new Error("DRAFT_SUDAH_DIPROSES");
        }

        return pesanan;
      },
      {
        isolationLevel: "Serializable",
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Pembayaran berhasil.",
        data: hasil,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST PENJUALAN ERROR:", error);

    if (error.code === "P2034") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Transaksi mengalami konflik. Silakan coba kembali.",
        },
        { status: 409 }
      );
    }

    const errors = {
      DRAFT_TIDAK_DITEMUKAN: {
        message: "Draft tidak ditemukan.",
        status: 404,
      },
      DRAFT_SUDAH_SELESAI: {
        message: "Draft sudah selesai diproses.",
        status: 409,
      },
      DRAFT_SUDAH_DIPROSES: {
        message: "Draft sudah diproses oleh transaksi lain.",
        status: 409,
      },
      KASIR_BELUM_DIBUKA: {
        message: "Kasir belum dibuka.",
        status: 409,
      },
      SESI_KASIR_SUDAH_DITUTUP: {
        message: "Sesi kasir sudah ditutup.",
        status: 409,
      },
      DRAFT_KOSONG: {
        message: "Draft belum memiliki produk.",
        status: 400,
      },
      NAMA_PEMBELI_KOSONG: {
        message: "Nama pembeli belum tersedia.",
        status: 400,
      },
      UANG_TIDAK_CUKUP: {
        message: "Uang yang diterima tidak mencukupi.",
        status: 400,
      },
      TOTAL_TIDAK_VALID: {
        message: "Total transaksi tidak valid.",
        status: 400,
      },
      JUMLAH_ITEM_TIDAK_VALID: {
        message: "Jumlah item tidak valid.",
        status: 400,
      },
    };

    const knownError = errors[error.message];

    return NextResponse.json(
      {
        success: false,
        message:
          knownError?.message ||
          error.message ||
          "Pembayaran gagal.",
      },
      { status: knownError?.status || 400 }
    );
  }
}
