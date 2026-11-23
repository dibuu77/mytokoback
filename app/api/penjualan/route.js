
import prisma from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

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
};

function buatNomorNota() {
  return `INV-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

function validasiNominal(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function hitungTotal(items) {
  const total = items.reduce(
    (sum, item) => sum + Number(item.harga) * Number(item.jumlah),
    0
  );

  if (!Number.isSafeInteger(total) || total <= 0) {
    throw new Error("TOTAL_TIDAK_VALID");
  }

  return total;
}

async function ambilSesiKasirAktif(tx) {
  const sesi = await tx.sesiKasir.findFirst({
    where: { status: "BUKA" },
    orderBy: { dibukaPada: "desc" },
  });

  if (!sesi) throw new Error("KASIR_BELUM_DIBUKA");
  return sesi;
}

async function kurangiStok(tx, items) {
  for (const item of items) {
    if (!Number.isSafeInteger(item.jumlah) || item.jumlah <= 0) {
      throw new Error("JUMLAH_ITEM_TIDAK_VALID");
    }

    if (item.varianId) {
      const result = await tx.varianProduk.updateMany({
        where: {
          id: item.varianId,
          produkId: item.produkId,
          stok: { gte: item.jumlah },
        },
        data: { stok: { decrement: item.jumlah } },
      });

      if (result.count !== 1) {
        throw new Error(
          `STOK_TIDAK_CUKUP:${item.namaVarian || item.namaProduk}`
        );
      }
    } else {
      const result = await tx.produk.updateMany({
        where: {
          id: item.produkId,
          stok: { gte: item.jumlah },
        },
        data: { stok: { decrement: item.jumlah } },
      });

      if (result.count !== 1) {
        throw new Error(`STOK_TIDAK_CUKUP:${item.namaProduk}`);
      }
    }
  }
}

async function simpanPenjualan(tx, { namaPembeli, items, uangDiterima, sesi }) {
  const total = hitungTotal(items);

  if (uangDiterima < total) {
    throw new Error("UANG_TIDAK_CUKUP");
  }

  await kurangiStok(tx, items);

  const updateSesi = await tx.sesiKasir.updateMany({
    where: { id: sesi.id, status: "BUKA" },
    data: { totalJual: { increment: total } },
  });

  if (updateSesi.count !== 1) {
    throw new Error("SESI_KASIR_SUDAH_DITUTUP");
  }

  return tx.pesanan.create({
    data: {
      namaPembeli: namaPembeli?.trim() || "Pelanggan",
      total,
      nomorNota: buatNomorNota(),
      uangDiterima,
      kembalian: uangDiterima - total,
      sesiKasirId: sesi.id,
      detailItems: {
        create: items.map((item) => ({
          produkId: item.produkId,
          varianId: item.varianId || null,
          namaProduk: item.namaProduk,
          namaVarian: item.namaVarian || null,
          jumlah: item.jumlah,
          harga: item.harga,
        })),
      },
    },
    include: detailInclude,
  });
}

// GET: Riwayat dan ringkasan seluruh penjualan
export async function GET() {
  try {
    const [data, totalTransaksi, aggregate] = await Promise.all([
      prisma.pesanan.findMany({
        orderBy: { createdAt: "desc" },
        include: detailInclude,
      }),
      prisma.pesanan.count(),
      prisma.pesanan.aggregate({
        _sum: { total: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      totalTransaksi,
      totalPenjualan: aggregate._sum.total || 0,
      data,
    });
  } catch (error) {
    console.error("GET PENJUALAN ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil riwayat penjualan." },
      { status: 500 }
    );
  }
}

// POST: Checkout Draft terpilih ATAU transaksi langsung dari Detail Produk
export async function POST(request) {
  try {
    const body = await request.json();
    const { draftId, itemIds, produkId, varianId, jumlah, uangDiterima } = body;

    if (!validasiNominal(uangDiterima)) {
      return NextResponse.json(
        { success: false, message: "Nominal uang diterima tidak valid." },
        { status: 400 }
      );
    }

    const hasil = await prisma.$transaction(
      async (tx) => {
        const sesi = await ambilSesiKasirAktif(tx);

        // JALUR 1: Checkout item Draft yang dipilih
        if (draftId) {
          if (!Array.isArray(itemIds) || itemIds.length === 0) {
            throw new Error("ITEM_DRAFT_BELUM_DIPILIH");
          }

          if (
            itemIds.some((id) => typeof id !== "string" || !id.trim()) ||
            new Set(itemIds).size !== itemIds.length
          ) {
            throw new Error("ITEM_DRAFT_TIDAK_VALID");
          }

          const draft = await tx.draftPesanan.findUnique({
            where: { id: draftId },
            include: { items: { where: { id: { in: itemIds } } } },
          });

          if (!draft) throw new Error("DRAFT_TIDAK_DITEMUKAN");
          if (draft.status !== "DRAFT") {
            throw new Error("DRAFT_SUDAH_SELESAI");
          }
          if (!draft.namaPembeli?.trim()) {
            throw new Error("NAMA_PEMBELI_KOSONG");
          }
          if (draft.items.length !== itemIds.length) {
            throw new Error("ITEM_DRAFT_TIDAK_DITEMUKAN");
          }

          const pesanan = await simpanPenjualan(tx, {
            namaPembeli: draft.namaPembeli,
            items: draft.items,
            uangDiterima,
            sesi,
          });

          // Hanya hapus item yang dibayar. Item lain tetap di Draft.
          await tx.itemDraft.deleteMany({
            where: { draftId, id: { in: itemIds } },
          });

          const sisaItem = await tx.itemDraft.count({
            where: { draftId },
          });

          if (sisaItem === 0) {
            await tx.draftPesanan.updateMany({
              where: { id: draftId, status: "DRAFT" },
              data: { status: "SELESAI" },
            });
          }

          return pesanan;
        }

        // JALUR 2: Transaksi langsung dari Detail Produk (tanpa Draft)
        if (!produkId) throw new Error("DATA_TRANSAKSI_TIDAK_LENGKAP");
        if (!Number.isSafeInteger(jumlah) || jumlah <= 0) {
          throw new Error("JUMLAH_ITEM_TIDAK_VALID");
        }

        const produk = await tx.produk.findUnique({
          where: { id: produkId },
          include: {
            varians: varianId ? { where: { id: varianId } } : false,
          },
        });

        if (!produk || !produk.isAktif) {
          throw new Error("PRODUK_TIDAK_DITEMUKAN");
        }

        let item;

        if (varianId) {
          const varian = produk.varians?.[0];
          if (!varian) throw new Error("VARIAN_TIDAK_DITEMUKAN");

          item = {
            produkId: produk.id,
            varianId: varian.id,
            namaProduk: produk.nama,
            namaVarian: varian.nama,
            harga: varian.harga,
            jumlah,
          };
        } else {
          item = {
            produkId: produk.id,
            varianId: null,
            namaProduk: produk.nama,
            namaVarian: null,
            harga: produk.harga,
            jumlah,
          };
        }

        return simpanPenjualan(tx, {
          namaPembeli: body.namaPembeli || "Pelanggan",
          items: [item],
          uangDiterima,
          sesi,
        });
      },
      { isolationLevel: "Serializable" }
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
          message: "Transaksi mengalami konflik. Silakan coba kembali.",
        },
        { status: 409 }
      );
    }

    const errors = {
      DRAFT_TIDAK_DITEMUKAN: ["Draft tidak ditemukan.", 404],
      DRAFT_SUDAH_SELESAI: ["Draft sudah selesai diproses.", 409],
      ITEM_DRAFT_BELUM_DIPILIH: ["Pilih minimal satu item Draft.", 400],
      ITEM_DRAFT_TIDAK_VALID: ["Daftar item Draft tidak valid.", 400],
      ITEM_DRAFT_TIDAK_DITEMUKAN: ["Sebagian item tidak ditemukan di Draft tersebut.", 404],
      KASIR_BELUM_DIBUKA: ["Kasir belum dibuka.", 409],
      SESI_KASIR_SUDAH_DITUTUP: ["Sesi kasir sudah ditutup.", 409],
      NAMA_PEMBELI_KOSONG: ["Nama pembeli belum tersedia.", 400],
      UANG_TIDAK_CUKUP: ["Uang yang diterima tidak mencukupi.", 400],
      TOTAL_TIDAK_VALID: ["Total transaksi tidak valid.", 400],
      JUMLAH_ITEM_TIDAK_VALID: ["Jumlah item tidak valid.", 400],
      DATA_TRANSAKSI_TIDAK_LENGKAP: ["Data transaksi tidak lengkap.", 400],
      PRODUK_TIDAK_DITEMUKAN: ["Produk tidak ditemukan atau tidak aktif.", 404],
      VARIAN_TIDAK_DITEMUKAN: ["Varian produk tidak ditemukan.", 404],
    };

    if (error.message.startsWith("STOK_TIDAK_CUKUP:")) {
      const nama = error.message.split(":").slice(1).join(":");
      return NextResponse.json(
        { success: false, message: `Stok ${nama} tidak mencukupi.` },
        { status: 409 }
      );
    }

    const known = errors[error.message];

    return NextResponse.json(
      {
        success: false,
        message: known?.[0] || "Pembayaran gagal.",
      },
      { status: known?.[1] || 400 }
    );
  }
}
