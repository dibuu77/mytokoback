import { NextResponse } from 'next/server';
import { aturanakun, opsiemail, update, idSchema } from "@/lib/user";
import * as v from "valibot";
import prisma from "@/lib/prisma"; // 👈 Pakai kurung kurawal

export async function GET(request) {
  try {
    const panggil = await prisma.User.findMany();
    return NextResponse.json({ success: true, message: 'GET Success', data : panggil });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const haha = v.safeParse (aturanakun, body);
    if (!haha.success) {
        return NextResponse.json(
            { success: false, errors: v.flatten(haha.issues).nested },
        { status: 400 }
    );}
    const hasil = await prisma.user.create({data : haha.output})
    return NextResponse.json({ success: true, data: hasil });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const hahaha = v.safeParse(idSchema, body.id);
    if(!hahaha.success){
        return NextResponse.json({success : false, error : v.flatten(hahaha.issues)}, {status: 400})
    };  

    const hahahaha = v.safeParse(update, body);
    if(!hahahaha.success){
      NextResponse.json({success: false, errors : v.flatten, });
    }

    const result = await prisma.user.update({
      where: {id : hahaha.output},
      data : hahahaha.output})
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
