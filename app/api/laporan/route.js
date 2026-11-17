import { NextResponse } from 'next/server';
import * as v from "valibot";
import { aturannota2 } from "@/lib/laporan";
import { prisma } from "@/lib/prisma";


export async function GET(request) {
  try {
    const tam = await prisma.nota.findMany();
    return NextResponse.json({ success: true, message: 'GET Success', data :tam });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const n = v.safeParse(aturannota2, body);
    if(!n.success){
        return NextResponse.json({ success: false, error : v.flatten(n.issues).nested}, {status : 400})}
    
    const acc = await prisma.nota.create({ data: n.output})
    return NextResponse.json({ success: true, data: acc });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
export async function PUT(request) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
export async function PATCH(request) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
export async function DELETE(request) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}