
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Detail Draft berdasarkan ID
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const draft = await prisma.draftPesanan.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            produk: true,
            varian: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!draft || draft.status !== "DRAFT") {
      return NextResponse.json(
        {
          success: false,
          message: "Draft tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    const total = draft.items.reduce(
      (sum, item) =>
        sum + Number(item.harga) * Number(item.jumlah),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        ...draft,
        total,
      },
    });
  } catch (error) {
    console.error("GET DETAIL DRAFT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil detail Draft.",
      },
      { status: 500 }
    );
  }
}

// PATCH: Mengubah jumlah produk dalam Draft
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { itemId, jumlah } = body;

    if (
      !itemId ||
      !Number.isSafeInteger(jumlah) ||
      jumlah < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Jumlah tidak valid.",
        },
        { status: 400 }
      );
    }

    const hasil = await prisma.$transaction(
      async (tx) => {
        // Pastikan Draft masih aktif
        const draft = await tx.draftPesanan.findFirst({
          where: {
            id,
            status: "DRAFT",
          },
        });

        if (!draft) {
          throw new Error("DRAFT_TIDAK_DITEMUKAN");
        }

        // Ambil item yang akan diedit
        const item = await tx.itemDraft.findFirst({
          where: {
            id: itemId,
            draftId: id,
          },
        });

        if (!item) {
          throw new Error("ITEM_TIDAK_DITEMUKAN");
        }

        // Ambil stok produk atau varian
        let stok;

        if (item.varianId) {
          const varian = await tx.varianProduk.findFirst({
            where: {
              id: item.varianId,
              produkId: item.produkId,
            },
            select: {
              stok: true,
            },
          });

          if (!varian) {
            throw new Error("VARIAN_TIDAK_DITEMUKAN");
          }

          stok = varian.stok;
        } else {
          const produk = await tx.produk.findUnique({
            where: {
              id: item.produkId,
            },
            select: {
              stok: true,
            },
          });

          if (!produk) {
            throw new Error("PRODUK_TIDAK_DITEMUKAN");
          }

          stok = produk.stok;
        }

        // Hitung jumlah item yang sama pada seluruh
        // Draft aktif, kecuali item yang sedang diedit
        const jumlahLain = await tx.itemDraft.aggregate({
          where: {
            produkId: item.produkId,
            varianId: item.varianId,
            id: {
              not: itemId,
            },
            draft: {
              is: {
                status: "DRAFT",
              },
            },
          },
          _sum: {
            jumlah: true,
          },
        });

        const jumlahSudahAda =
          jumlahLain._sum.jumlah || 0;

        const totalJumlah = jumlahSudahAda + jumlah;

        // Pastikan total seluruh Draft tidak melebihi stok
        if (totalJumlah > stok) {
          const maksimal = Math.max(
            0,
            stok - jumlahSudahAda
          );

          throw new Error(
            `Stok tidak cukup. Maksimal jumlah produk ini adalah ${maksimal}.`
          );
        }

        // Ubah jumlah saja.
        // Harga dan tanggal item tetap dipertahankan.
        const itemUpdate = await tx.itemDraft.update({
          where: {
            id: itemId,
          },
          data: {
            jumlah,
          },
        });

        await tx.draftPesanan.update({
          where: {
            id,
          },
          data: {
            updatedAt: new Date(),
          },
        });

        return itemUpdate;
      },
      {
        isolationLevel: "Serializable",
      }
    );

    return NextResponse.json({
      success: true,
      message: "Jumlah produk berhasil diubah.",
      data: hasil,
    });
  } catch (error) {
    console.error("PATCH DETAIL DRAFT ERROR:", error);

    if (error.code === "P2034") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Draft sedang mengalami perubahan. Silakan coba kembali.",
        },
        { status: 409 }
      );
    }

    const errors = {
      DRAFT_TIDAK_DITEMUKAN: {
        message: "Draft tidak ditemukan.",
        status: 404,
      },
      ITEM_TIDAK_DITEMUKAN: {
        message: "Produk tidak ditemukan dalam Draft.",
        status: 404,
      },
      PRODUK_TIDAK_DITEMUKAN: {
        message: "Produk tidak ditemukan.",
        status: 404,
      },
      VARIAN_TIDAK_DITEMUKAN: {
        message: "Varian tidak ditemukan.",
        status: 404,
      },
    };

    const knownError = errors[error.message];

    return NextResponse.json(
      {
        success: false,
        message: knownError?.message || error.message,
      },
      { status: knownError?.status || 400 }
    );
  }
}

// DELETE: Menghapus produk dari Draft
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        {
          success: false,
          message: "ID produk wajib diisi.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      async (tx) => {
        // Pastikan Draft masih aktif
        const draft = await tx.draftPesanan.findFirst({
          where: {
            id,
            status: "DRAFT",
          },
        });

        if (!draft) {
          throw new Error("DRAFT_TIDAK_DITEMUKAN");
        }

        // Pastikan item merupakan bagian dari Draft
        const item = await tx.itemDraft.findFirst({
          where: {
            id: itemId,
            draftId: id,
          },
        });

        if (!item) {
          throw new Error("ITEM_TIDAK_DITEMUKAN");
        }

        // Hapus item
        await tx.itemDraft.delete({
          where: {
            id: itemId,
          },
        });

        // Periksa apakah masih ada item dalam Draft
        const sisaItem = await tx.itemDraft.count({
          where: {
            draftId: id,
          },
        });

        // Jika kosong, tandai Draft selesai
        await tx.draftPesanan.update({
          where: {
            id,
          },
          data: {
            updatedAt: new Date(),
            ...(sisaItem === 0
              ? { status: "SELESAI" }
              : {}),
          },
        });
      },
      {
        isolationLevel: "Serializable",
      }
    );

    return NextResponse.json({
      success: true,
      message: "Produk berhasil dihapus dari Draft.",
    });
  } catch (error) {
    console.error("DELETE DETAIL DRAFT ERROR:", error);

    if (error.code === "P2034") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Draft sedang mengalami perubahan. Silakan coba kembali.",
        },
        { status: 409 }
      );
    }

    const errors = {
      DRAFT_TIDAK_DITEMUKAN: {
        message: "Draft tidak ditemukan.",
        status: 404,
      },
      ITEM_TIDAK_DITEMUKAN: {
        message: "Produk tidak ditemukan dalam Draft.",
        status: 404,
      },
    };

    const knownError = errors[error.message];

    return NextResponse.json(
      {
        success: false,
        message: knownError?.message || error.message,
      },
      { status: knownError?.status || 400 }
    );
  }
}
