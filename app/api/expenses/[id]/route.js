import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";

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
    if (body.category !== undefined) updates.category = body.category;
    if (body.description !== undefined) updates.description = body.description;
    if (body.amount !== undefined) {
      const amt = Number(body.amount);
      if (!Number.isFinite(amt) || amt < 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
      updates.amount = amt;
    }
    if (body.paymentMethod !== undefined) updates.paymentMethod = body.paymentMethod;
    if (body.vendor !== undefined) updates.vendor = body.vendor;
    if (body.note !== undefined) updates.note = body.note;

    await connectDB();
    const expense = await Expense.findByIdAndUpdate(id, updates, { new: true });

    if (!expense) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ expense });
  } catch (error) {
    console.error("Expense PATCH error:", error);
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
    const expense = await Expense.findByIdAndDelete(id);

    if (!expense) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Expense DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
