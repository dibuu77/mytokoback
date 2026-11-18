
import { NextResponse } from "next/server";
import * as v from "valibot";

import { prisma } from "@/lib/prisma";
import { createProdukSchema } from "@/lib/produk";
import cloudinary from "@/lib/cloudinary";

// ==========================================
// HELPER: UPLOAD FOTO CLOUDINARY
// ==========================================
async function uploadFoto(foto) {
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

  // Maksimal 5 MB
  if (foto.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran foto maksimal 5 MB");
  }

  const buffer = Buffer.from(await foto.arrayBuffer());

  const hasil = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "mytoko" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    stream.end(buffer);
  });

  return hasil;
}

// ==========================================
// GET: DAFTAR PRODUK
// ==========================================
export async function GET(request) {
  try {
    const produk = await prisma.produk.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      message: "GET Success",
      data: produk,
    });
  } catch (error) {
    console.error("GET PRODUK ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data produk",
      },
      { status: 500 }
    );
  }
}

// ==========================================
// POST: TAMBAH PRODUK
// ==========================================
export async function POST(request) {
  let publicId = null;

  try {
    // 1. Ambil FormData
    const formData = await request.formData();

    const foto = formData.get("foto");

    // 2. Ambil data produk
    const body = {
      nama: formData.get("nama"),
      deskripsi: formData.get("deskripsi") || undefined,
      tempat: formData.get("tempat") || undefined,
      harga: Number(formData.get("harga")),
      stok: Number(formData.get("stok")),
    };

    // 3. Validasi Valibot sebelum upload
    const validasi = v.safeParse(createProdukSchema, body);

    if (!validasi.success) {
      return NextResponse.json(
        {
          success: false,
          errors: v.flatten(validasi.issues).nested,
        },
        { status: 400 }
      );
    }

    // 4. Upload foto jika tersedia
    let fotoUrl;

    if (foto && typeof foto !== "string") {
      const upload = await uploadFoto(foto);

      fotoUrl = upload.secure_url;
      publicId = upload.public_id;
    }

    // 5. Simpan produk ke PostgreSQL
    const dataProduk = {
      ...validasi.output,
      ...(fotoUrl && { fotoUrl }),
    };

    const produk = await prisma.produk.create({
      data: dataProduk,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Produk berhasil ditambahkan",
        data: produk,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST PRODUK ERROR:", error);

    // Bersihkan foto jika upload berhasil tetapi penyimpanan gagal
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (cleanupError) {
        console.error("CLOUDINARY CLEANUP ERROR:", cleanupError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal menambahkan produk",
      },
      { status: 500 }
    );
  }
}
