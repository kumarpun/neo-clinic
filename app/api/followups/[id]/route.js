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

export async function PATCH(request, { params }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updates = {};
    if (body.date !== undefined) updates.date = new Date(body.date);
    if (body.patientName !== undefined) updates.patientName = body.patientName;
    if (body.address !== undefined) updates.address = body.address;
    if (body.contact !== undefined) updates.contact = body.contact;
    if (body.ageSex !== undefined) updates.ageSex = body.ageSex;
    if (body.newPatients !== undefined) updates.newPatients = body.newPatients;
    if (body.followupPatients !== undefined) updates.followupPatients = body.followupPatients;
    if (body.diagnosis !== undefined) updates.diagnosis = body.diagnosis;
    if (body.amount !== undefined) updates.amount = Number(body.amount) || 0;
    if (body.remarks !== undefined) updates.remarks = body.remarks;
    if (body.consultant !== undefined) updates.consultant = body.consultant;
    if (body.note !== undefined) updates.note = body.note;

    await connectDB();
    const followup = await FollowUp.findByIdAndUpdate(id, updates, { new: true });

    if (!followup) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ followup });
  } catch (error) {
    console.error("FollowUp PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();
    const followup = await FollowUp.findByIdAndDelete(id);

    if (!followup) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("FollowUp DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
