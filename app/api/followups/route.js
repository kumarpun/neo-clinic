import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import FollowUp from "@/models/FollowUp";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectDB();
    const followups = await FollowUp.find().sort({ date: -1, createdAt: -1 }).lean();
    return NextResponse.json({ followups });
  } catch (error) {
    console.error("FollowUps GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const date = body.date ? new Date(body.date) : new Date();

    await connectDB();
    const followup = await FollowUp.create({
      date,
      patientName: body.patientName || "",
      address: body.address || "",
      contact: body.contact || "",
      ageSex: body.ageSex || "",
      newPatients: body.newPatients || "",
      followupPatients: body.followupPatients || "",
      diagnosis: body.diagnosis || "",
      amount: Number(body.amount) || 0,
      remarks: body.remarks || "",
      consultant: body.consultant || "",
      note: body.note || "",
    });

    return NextResponse.json({ followup }, { status: 201 });
  } catch (error) {
    console.error("FollowUps POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
