export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import * as v from "valibot";
import prisma from "@/lib/prisma";
import { aturankeranjang, updatejumlah, idSchema } from "@/lib/keranjang";
import { error } from 'console';

export async function GET(request) {
  try {
    const kranjang = await prisma.cartItem.findMany();
    return NextResponse.json({ success: true, message: 'GET Success', data :kranjang });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const haha = v.safeParse(aturankeranjang, body)
    if (!haha.success) {
      return NextResponse.json(
        { success: false, errors: v.flatten(haha.issues).nested },
        { status: 400 }
      );
    }

    const kirim = await prisma.cartItem.create({
      data : haha.output})

    return NextResponse.json({ success: true, data: kirim });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


export async function PATCH(request) {
  try {
    const body = await request.json();
    console.log("👉 1. Raw Body Diterima:", body);
    const ide = v.safeParse(idSchema, body.id);
    if (!ide.success) {
      return NextResponse.json(
        {
          success: false,
          layer: "VALIDATION_ERROR", // 👈 Menunjukkan error ada di format input
          errors: v.flatten(ide.issues).root,
        },
        { status: 400 }
      );
    }

    const blak = v.safeParse(updatejumlah, body);
    if (!blak.success) {
      return NextResponse.json( // 👈 Wajib ada return
        { success: false, errors: v.flatten(blak.issues).nested },
        { status: 400 }
      );
    }

    const peh = await prisma.cartItem.update({
      where : {id : ide.output},
      data : blak.output
  })
    return NextResponse.json({ success: true, data: peh });
   } catch (error) {
    // 1. Tangani jika data tidak ada di DB
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Data tidak ada" },
        { status: 404 }
      );
    }

    // 2. 👈 Wajib ada penampung untuk error selain P2025
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}