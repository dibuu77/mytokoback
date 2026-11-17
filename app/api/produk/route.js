import { NextResponse } from "next/server";
import * as v from "valibot";
import { prisma } from "@/lib/prisma";
import { produkQuerySchema, createProdukSchema } from "@/lib/produk";

export async function GET(request) {
  try {
    const haha = await prisma.produk.findMany();
    return NextResponse.json({ success: true, message: 'GET Success', data: haha });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const haha = v.safeParse (createProdukSchema, body);
      if (!haha.success) {
        return NextResponse.json(
        { success: false, errors: v.flatten(haha.issues).nested },
        { status: 400 }
      );}
      const isoh = await prisma.produk.create({ data:haha.output })
    return NextResponse.json({ success: true, data: isoh });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


