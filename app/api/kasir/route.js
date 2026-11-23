
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function validasiNominal(value) {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    value === ""
  ) {
    return null;
  }

  const nominal = Number(value);

  if (!Number.isSafeInteger(nominal) || nominal < 0) {
    return null;
  }

  return nominal;
}

// GET: Cek sesi aktif atau sesi terakhir
export async function GET() {
  try {
    let sesi = await prisma.sesiKasir.findFirst({
      where: { status: "BUKA" },
      orderBy: { dibukaPada: "desc" },
    });

    const kasirBuka = Boolean(sesi);

    if (!sesi) {
      sesi = await prisma.sesiKasir.findFirst({
        where: { status: "TUTUP" },
        orderBy: { ditutupPada: "desc" },
      });
    }

    if (!sesi) {
      return NextResponse.json({
        success: true,
        kasirBuka: false,
        sesi: null,
      });
    }

    const uangSeharusnya = kasirBuka
      ? Number(sesi.modalAwal) + Number(sesi.totalJual)
      : Number(
          sesi.uangSeharusnya ??
            Number(sesi.modalAwal) + Number(sesi.totalJual)
        );

    return NextResponse.json({
      success: true,
      kasirBuka,
      sesi: {
        ...sesi,
        uangSeharusnya,
      },
    });
  } catch (error) {
    console.error("GET SESI KASIR ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil status kasir.",
      },
      { status: 500 }
    );
  }
}

// POST: Membuka sesi kasir
export async function POST(request) {
  try {
    const body = await request.json();
    const nominal = validasiNominal(body.modalAwal);

    if (nominal === null) {
      return NextResponse.json(
        {
          success: false,
          message: "Modal awal tidak valid.",
        },
        { status: 400 }
      );
    }

    const sesi = await prisma.$transaction(
      async (tx) => {
        const sesiAktif = await tx.sesiKasir.findFirst({
          where: { status: "BUKA" },
        });

        if (sesiAktif) {
          throw new Error("KASIR_SUDAH_BUKA");
        }

        return tx.sesiKasir.create({
          data: {
            modalAwal: nominal,
            totalJual: 0,
            status: "BUKA",
          },
        });
      },
      {
        isolationLevel: "Serializable",
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Kasir berhasil dibuka.",
        sesi,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST SESI KASIR ERROR:", error);

    if (error.message === "KASIR_SUDAH_BUKA") {
      return NextResponse.json(
        {
          success: false,
          message: "Kasir masih dalam keadaan buka.",
        },
        { status: 409 }
      );
    }

    if (error.code === "P2034") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Terjadi konflik transaksi. Silakan coba kembali.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Gagal membuka kasir.",
      },
      { status: 500 }
    );
  }
}

// PATCH: Menutup sesi kasir
export async function PATCH(request) {
  try {
    const body = await request.json();
    const nominal = validasiNominal(body.uangAkhir);

    if (nominal === null) {
      return NextResponse.json(
        {
          success: false,
          message: "Uang akhir tidak valid.",
        },
        { status: 400 }
      );
    }

    const hasil = await prisma.$transaction(
      async (tx) => {
        const sesi = await tx.sesiKasir.findFirst({
          where: { status: "BUKA" },
          orderBy: { dibukaPada: "desc" },
        });

        if (!sesi) {
          throw new Error("SESI_TIDAK_ADA");
        }

        const uangSeharusnya =
          Number(sesi.modalAwal) + Number(sesi.totalJual);

        const selisih = nominal - uangSeharusnya;
        const ditutupPada = new Date();

        const update = await tx.sesiKasir.updateMany({
          where: {
            id: sesi.id,
            status: "BUKA",
          },
          data: {
            uangAkhir: nominal,
            uangSeharusnya,
            selisih,
            status: "TUTUP",
            ditutupPada,
          },
        });

        if (update.count !== 1) {
          throw new Error("SESI_SUDAH_DIPROSES");
        }

        return {
          ...sesi,
          uangAkhir: nominal,
          uangSeharusnya,
          selisih,
          status: "TUTUP",
          ditutupPada,
        };
      },
      {
        isolationLevel: "Serializable",
      }
    );

    return NextResponse.json({
      success: true,
      message: "Kasir berhasil ditutup.",
      sesi: hasil,
    });
  } catch (error) {
    console.error("PATCH SESI KASIR ERROR:", error);

    if (error.message === "SESI_TIDAK_ADA") {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ada sesi kasir yang aktif.",
        },
        { status: 404 }
      );
    }

    if (
      error.message === "SESI_SUDAH_DIPROSES" ||
      error.code === "P2034"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sesi kasir berubah atau sudah diproses. Silakan coba kembali.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Gagal menutup kasir.",
      },
      { status: 500 }
    );
  }
}
