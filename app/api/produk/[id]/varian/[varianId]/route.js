
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";

export async function PATCH(request, { params }) {
  try {
    const { id, varianId } = await params;
    const contentType = request.headers.get("content-type") || "";

    let body = {};
    let foto = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      body.nama = formData.get("nama");
      body.harga = Number(formData.get("harga"));
      body.stok = Number(formData.get("stok"));
      foto = formData.get("foto");
    } else {
      body = await request.json();
    }

    if (
      typeof body.nama !== "string" ||
      body.nama.trim().length < 3 ||
      body.nama.trim().length > 50
    ) {
      return NextResponse.json(
        { success: false, message: "Nama varian harus 3-50 karakter" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(body.harga) || body.harga < 1) {
      return NextResponse.json(
        { success: false, message: "Harga varian tidak valid" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(body.stok) || body.stok < 0) {
      return NextResponse.json(
        { success: false, message: "Stok varian tidak valid" },
        { status: 400 }
      );
    }

    const existing = await prisma.varianProduk.findFirst({
      where: { id: varianId, produkId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Varian tidak ditemukan" },
        { status: 404 }
      );
    }

    let fotoUrl;

    if (foto && typeof foto !== "string") {
      if (
        !foto.type.startsWith("image/") ||
        foto.size > 5 * 1024 * 1024
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Foto harus berupa gambar maksimal 5 MB",
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await foto.arrayBuffer());

      const upload = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "mytoko/varian" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        stream.end(buffer);
      });

      fotoUrl = upload.secure_url;
    }

    const varian = await prisma.varianProduk.update({
      where: { id: varianId },
      data: {
        nama: body.nama.trim(),
        harga: body.harga,
        stok: body.stok,
        ...(fotoUrl && { fotoUrl }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Varian berhasil diperbarui",
      data: varian,
    });
  } catch (error) {
    console.error("EDIT VARIAN ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id, varianId } = await params;

    const existing = await prisma.varianProduk.findFirst({
      where: { id: varianId, produkId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Varian tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.varianProduk.delete({
      where: { id: varianId },
    });

    return NextResponse.json({
      success: true,
      message: "Varian berhasil dihapus",
    });
  } catch (error) {
    console.error("HAPUS VARIAN ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
