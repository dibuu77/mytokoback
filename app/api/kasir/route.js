
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Cek sesi kasir yang sedang aktif
export async function GET() {
  try {
    const sesi = await prisma.sesiKasir.findFirst({
      where: { status: "BUKA" },
      orderBy: { dibukaPada: "desc" },
    });

    return NextResponse.json({
      kasirBuka: !!sesi,
      sesi,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Gagal mengambil status kasir" },
      { status: 500 }
    );
  }
}

// POST: Membuka kasir
export async function POST(request) {
  try {
    const { modalAwal } = await request.json();
    const nominal = Number(modalAwal);

    if (
      modalAwal === undefined ||
      modalAwal === null ||
      modalAwal === "" ||
      !Number.isSafeInteger(nominal) ||
      nominal < 0
    ) {
      return NextResponse.json(
        { message: "Modal awal tidak valid" },
        { status: 400 }
      );
    }

    const sesiAktif = await prisma.sesiKasir.findFirst({
      where: { status: "BUKA" },
    });

    if (sesiAktif) {
      return NextResponse.json(
        { message: "Kasir masih dalam keadaan buka" },
        { status: 409 }
      );
    }

    const sesi = await prisma.sesiKasir.create({
      data: { modalAwal: nominal },
    });

    return NextResponse.json(
      { message: "Kasir berhasil dibuka", sesi },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Gagal membuka kasir" },
      { status: 500 }
    );
  }
}

// PATCH: Menutup kasir
export async function PATCH(request) {
  try {
    const { uangAkhir } = await request.json();
    const nominal = Number(uangAkhir);

    if (
      uangAkhir === undefined ||
      uangAkhir === null ||
      uangAkhir === "" ||
      !Number.isSafeInteger(nominal) ||
      nominal < 0
    ) {
      return NextResponse.json(
        { message: "Uang akhir tidak valid" },
        { status: 400 }
      );
    }

    const sesi = await prisma.sesiKasir.findFirst({
      where: { status: "BUKA" },
      orderBy: { dibukaPada: "desc" },
    });

    if (!sesi) {
      return NextResponse.json(
        { message: "Tidak ada sesi kasir yang aktif" },
        { status: 404 }
      );
    }

    const hasil = await prisma.sesiKasir.update({
      where: { id: sesi.id },
      data: {
        uangAkhir: nominal,
        status: "TUTUP",
        ditutupPada: new Date(),
      },
    });

    return NextResponse.json({
      message: "Kasir berhasil ditutup",
      sesi: hasil,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Gagal menutup kasir" },
      { status: 500 }
    );
  }
}
