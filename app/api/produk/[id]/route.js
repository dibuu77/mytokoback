import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as v from "valibot";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/produk"; // Skema validasi ID
import { produkQuerySchema, createProdukSchema, updateProdukPUTSchema } from "@/lib/produk";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const idValidation = v.safeParse(idSchema, id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, errors: v.flatten(idValidation.issues).nested },
        { status: 400 }
      );
    }
    const produk = await prisma.produk.findUnique({
      where: { id: idValidation.output },
    });

    if (!produk) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: produk,
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// ========================================================
// 1. PUT (Update Menyeluruh - Semua Field Wajib Dikirim)
// ========================================================
export async function PUT(request, { params }) {
  try {
    const { id } = await params;

    // 1. Validasi ID dari URL
    const idValidation = v.safeParse(idSchema, id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, errors: v.flatten(idValidation.issues).nested },
        { status: 400 }
      );
    }

    const body = await request.json();

    // 2. Validasi Body (Semua field wajib ada)
    const bodyValidation = v.safeParse(updateProdukPUTSchema, body);
    if (!bodyValidation.success) {
      return NextResponse.json(
        { success: false, errors: v.flatten(bodyValidation.issues).nested },
        { status: 400 }
      );
    }

    // 3. Eksekusi Update ke Database
    const updatedProduk = await prisma.produk.update({
      where: { id: idValidation.output },
      data: bodyValidation.output,
    });

    return NextResponse.json({
      success: true,
      message: "Produk berhasil diperbarui (PUT)",
      data: updatedProduk,
    });

  } catch (error) {
    // Tangani jika ID tidak ditemukan di database
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Produk dengan ID tersebut tidak ditemukan" },
        { status: 404 }
      );
    }

    // Tangani jika nama bentrok / duplikat (@unique)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "Nama produk sudah digunakan produk lain" },
        { status: 409 }
      );
    }

    // Error umum lainnya
    console.error("DEBUG ERROR PUT:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
// ========================================================
// 2. PATCH (Update Sebagian - Hanya Field Tertentu Saja)
// ========================================================
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;

    // Validasi ID dari URL
    const idValidation = v.safeParse(idSchema, id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, errors: v.flatten(idValidation.issues).nested },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validasi Body (Field bersifat opsional/partial)
    const bodyValidation = v.safeParse(updateProdukPATCHSchema, body);
    if (!bodyValidation.success) {
      return NextResponse.json(
        { success: false, errors: v.flatten(bodyValidation.issues).nested },
        { status: 400 }
      );
    }

    // Eksekusi Update ke Database
    const updatedProduk = await prisma.produk.update({
      where: { id: idValidation.output },
      data: bodyValidation.output,
    });

    return NextResponse.json({
      success: true,
      message: "Produk berhasil diperbarui (PATCH)",
      data: updatedProduk,
    });

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Produk dengan ID tersebut tidak ditemukan" },
        { status: 404 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "Nama produk sudah digunakan produk lain" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// ========================================================
// 3. DELETE (Hapus Data Berdasarkan ID)
// ========================================================
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const idValidation = v.safeParse(idSchema, id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, errors: v.flatten(idValidation.issues).nested },
        { status: 400 }
      );
    }

    await prisma.produk.delete({
      where: { id: idValidation.output },
    });

    return NextResponse.json({
      success: true,
      message: "Produk berhasil dihapus",
    });

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan atau sudah dihapus sebelumnya" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}


