
import { NextResponse } from "next/server";
import * as v from "valibot";
import { prisma } from "@/lib/prisma";
import { createProdukSchema } from "@/lib/produk";
import cloudinary from "@/lib/cloudinary";

export async function GET(request) {
  try {
    const haha = await prisma.produk.findMany();

    return NextResponse.json({
      success: true,
      message: "GET Success",
      data: haha,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
console.log("1. FORMDATA BERHASIL");

    const foto = formData.get("foto");
    let fotoUrl;

    // Upload foto ke Cloudinary
    if (foto && typeof foto !== "string") {
      if (!foto.type.startsWith("image/")) {
        return NextResponse.json(
          { success: false, message: "File harus berupa gambar" },
          { status: 400 }
        );
      }
      console.log("2. CLOUDINARY UPLOAD BERHASIL:", fotoUrl);

      const buffer = Buffer.from(await foto.arrayBuffer());

      const upload = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "mytoko" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        stream.end(buffer);
      });

      fotoUrl = upload.secure_url;
    }

    // Ambil data dari FormData
    const body = {
      nama: formData.get("nama"),
      deskripsi: formData.get("deskripsi") || undefined,
      tempat: formData.get("tempat") || undefined,
      harga: Number(formData.get("harga")),
      stok: Number(formData.get("stok")),
      ...(fotoUrl && { fotoUrl }),
    };

    // Validasi Valibot
    const haha = v.safeParse(createProdukSchema, body);
    console.log("3. VALIDASI BERHASIL:", haha.output);

    if (!haha.success) {
      return NextResponse.json(
        {
          success: false,
          errors: v.flatten(haha.issues).nested,
        },
        { status: 400 }
      );
    }

    // Simpan produk ke database
    console.log("4. MULAI SIMPAN PRISMA");
    const isoh = await prisma.produk.create({
      
      data: haha.output,
    });
    console.log("5. PRISMA BERHASIL:", isoh);

    return NextResponse.json(
      { success: true, data: isoh },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST PRODUK ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
