
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as v from "valibot";

import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";

import {
  idSchema,
  updateProdukPUTSchema,
  updateProdukPATCHSchema,
} from "@/lib/produk";

// ==========================================
// HELPER: VALIDASI ID
// ==========================================
async function validasiId(params) {
  const { id } = await params;
  return v.safeParse(idSchema, id);
}

// ==========================================
// HELPER: AMBIL BODY JSON / FORMDATA
// ==========================================
async function ambilData(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    const body = {};

    const fields = [
      "nama",
      "deskripsi",
      "tempat",
      "harga",
      "hargabeli",
      "stok",
    ];

    for (const field of fields) {
      const value = formData.get(field);

      if (value !== null) {
        if (["harga", "hargabeli", "stok"].includes(field)) {
          body[field] = value === "" ? undefined : Number(value);
        } else {
          body[field] = value === "" ? undefined : value;
        }
      }
    }

    return {
      body,
      foto: formData.get("foto"),
    };
  }

  return {
    body: await request.json(),
    foto: null,
  };
}

// ==========================================
// HELPER: UPLOAD FOTO CLOUDINARY
// ==========================================
async function uploadFoto(foto, folder = "mytoko") {
  if (
    !foto ||
    typeof foto === "string" ||
    typeof foto.arrayBuffer !== "function"
  ) {
    return null;
  }

  if (!foto.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar");
  }

  if (foto.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran foto maksimal 5 MB");
  }

  const buffer = Buffer.from(await foto.arrayBuffer());

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    stream.end(buffer);
  });
}

// ==========================================
// HELPER: ERROR PRISMA
// ==========================================
function errorResponse(error) {
  console.error("API PRODUK ERROR:", error);

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    return NextResponse.json(
      { success: false, message: "Produk tidak ditemukan" },
      { status: 404 }
    );
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return NextResponse.json(
      { success: false, message: "Nama produk sudah digunakan" },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { success: false, message: error.message || "Terjadi kesalahan server" },
    { status: 500 }
  );
}

// ==========================================
// GET: DETAIL PRODUK + VARIAN
// ==========================================
export async function GET(request, { params }) {
  try {
    const idValidation = await validasiId(params);

    if (!idValidation.success) {
      return NextResponse.json(
        {
          success: false,
          errors: v.flatten(idValidation.issues).nested,
        },
        { status: 400 }
      );
    }

    const produk = await prisma.produk.findUnique({
      where: { id: idValidation.output },
      include: {
        varians: {
          orderBy: { createdAt: "desc" },
        },
      },
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
    return errorResponse(error);
  }
}

// ==========================================
// POST: TAMBAH VARIAN PRODUK
// Endpoint: POST /api/produk/:id
// ==========================================
export async function POST(request, { params }) {
  try {
    const idValidation = await validasiId(params);

    if (!idValidation.success) {
      return NextResponse.json(
        {
          success: false,
          errors: v.flatten(idValidation.issues).nested,
        },
        { status: 400 }
      );
    }

    // Pastikan produk induk tersedia dan masih aktif
    const produk = await prisma.produk.findUnique({
      where: { id: idValidation.output },
      select: {
        id: true,
        isAktif: true,
      },
    });

    if (!produk || !produk.isAktif) {
      return NextResponse.json(
        {
          success: false,
          message: "Produk tidak ditemukan atau sudah dinonaktifkan",
        },
        { status: 404 }
      );
    }

    const { body, foto } = await ambilData(request);

    // Validasi nama varian
    if (
      typeof body.nama !== "string" ||
      body.nama.trim().length < 3 ||
      body.nama.trim().length > 50
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Nama varian harus 3-50 karakter",
        },
        { status: 400 }
      );
    }

    // Validasi harga varian
    if (!Number.isInteger(body.harga) || body.harga < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Harga varian harus bilangan bulat lebih dari 0",
        },
        { status: 400 }
      );
    }

    // Validasi stok varian
    if (!Number.isInteger(body.stok) || body.stok < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Stok varian harus bilangan bulat minimal 0",
        },
        { status: 400 }
      );
    }

    // Upload foto varian jika tersedia
    const upload = await uploadFoto(foto, "mytoko/varian");

    // Simpan varian beserta stok
    const varian = await prisma.varianProduk.create({
      data: {
        produkId: idValidation.output,
        nama: body.nama.trim(),
        harga: body.harga,
        stok: body.stok,
        ...(upload && { fotoUrl: upload.secure_url }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Varian berhasil ditambahkan",
        data: varian,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

// ==========================================
// PUT: UPDATE SELURUH DATA PRODUK
// ==========================================
export async function PUT(request, { params }) {
  try {
    const idValidation = await validasiId(params);

    if (!idValidation.success) {
      return NextResponse.json(
        {
          success: false,
          errors: v.flatten(idValidation.issues).nested,
        },
        { status: 400 }
      );
    }

    const { body, foto } = await ambilData(request);

    const bodyValidation = v.safeParse(updateProdukPUTSchema, body);

    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          success: false,
          errors: v.flatten(bodyValidation.issues).nested,
        },
        { status: 400 }
      );
    }

    const upload = await uploadFoto(foto);

    const data = {
      ...bodyValidation.output,
      ...(upload && { fotoUrl: upload.secure_url }),
    };

    const updatedProduk = await prisma.produk.update({
      where: { id: idValidation.output },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "Produk berhasil diperbarui",
      data: updatedProduk,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// ==========================================
// PATCH: UPDATE SEBAGIAN DATA PRODUK
// ==========================================
export async function PATCH(request, { params }) {
  try {
    const idValidation = await validasiId(params);

    if (!idValidation.success) {
      return NextResponse.json(
        {
          success: false,
          errors: v.flatten(idValidation.issues).nested,
        },
        { status: 400 }
      );
    }

    const { body, foto } = await ambilData(request);

    if (Object.keys(body).length === 0 && !foto) {
      return NextResponse.json(
        { success: false, message: "Tidak ada data yang diperbarui" },
        { status: 400 }
      );
    }

    const bodyValidation = v.safeParse(updateProdukPATCHSchema, body);

    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          success: false,
          errors: v.flatten(bodyValidation.issues).nested,
        },
        { status: 400 }
      );
    }

    const upload = await uploadFoto(foto);

    const data = {
      ...bodyValidation.output,
      ...(upload && { fotoUrl: upload.secure_url }),
    };

    const updatedProduk = await prisma.produk.update({
      where: { id: idValidation.output },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "Produk berhasil diperbarui",
      data: updatedProduk,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// ==========================================
// DELETE: NONAKTIFKAN PRODUK (SOFT DELETE)
// ==========================================
export async function DELETE(request, { params }) {
  try {
    const idValidation = await validasiId(params);

    if (!idValidation.success) {
      return NextResponse.json(
        {
          success: false,
          errors: v.flatten(idValidation.issues).nested,
        },
        { status: 400 }
      );
    }

    const produk = await prisma.produk.findUnique({
      where: { id: idValidation.output },
    });

    if (!produk || !produk.isAktif) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.produk.update({
      where: { id: idValidation.output },
      data: {
        isAktif: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Produk berhasil dinonaktifkan",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
