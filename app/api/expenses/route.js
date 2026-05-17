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

export async function GET(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectDB();

    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const category = url.searchParams.get("category");
    const paymentMethod = url.searchParams.get("paymentMethod");
    const q = url.searchParams.get("q");
    const minAmount = url.searchParams.get("minAmount");
    const maxAmount = url.searchParams.get("maxAmount");

    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    if (category) filter.category = category;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { description: rx },
        { vendor: rx },
        { note: rx },
        { category: rx },
      ];
    }

    const expenses = await Expense.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error("Expenses GET error:", error);
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
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    await connectDB();
    const expense = await Expense.create({
      date: body.date ? new Date(body.date) : new Date(),
      category: body.category || "Other",
      description: body.description || "",
      amount,
      paymentMethod: body.paymentMethod || "Cash",
      vendor: body.vendor || "",
      note: body.note || "",
      createdBy: user.userId,
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("Expenses POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
