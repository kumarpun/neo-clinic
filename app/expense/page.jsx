"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "Rent",
  "Utilities",
  "Salary",
  "Supplies",
  "Equipment",
  "Maintenance",
  "Marketing",
  "Travel",
  "Food",
  "Other",
];

const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "UPI", "Cheque", "Other"];

function toInputDate(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

const EMPTY_FORM = {
  date: toInputDate(new Date()),
  category: "Other",
  description: "",
  amount: "",
  paymentMethod: "Cash",
  vendor: "",
  note: "",
};

export default function ExpensePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form (add + edit)
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Filters
  const [datePreset, setDatePreset] = useState("today");
  const today = useMemo(() => new Date(), []);
  const [customFrom, setCustomFrom] = useState(toInputDate(today));
  const [customTo, setCustomTo] = useState(toInputDate(today));
  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [search, setSearch] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  function fetchExpenses() {
    setLoading(true);
    fetch("/api/expenses")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setExpenses(data.expenses || []);
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setUser(data.user))
      .catch(() => {});
    fetchExpenses();
  }, []);

  const isAdmin = user?.role === "admin";

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEditForm(exp) {
    setEditingId(exp._id);
    setForm({
      date: toInputDate(new Date(exp.date)),
      category: exp.category || "Other",
      description: exp.description || "",
      amount: String(exp.amount ?? ""),
      paymentMethod: exp.paymentMethod || "Cash",
      vendor: exp.vendor || "",
      note: exp.note || "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt < 0) {
      alert("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/expenses/${editingId}` : "/api/expenses";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: amt }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed");
        return;
      }
      closeForm();
      fetchExpenses();
    } catch {
      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchExpenses();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete");
    }
  }

  function resetFilters() {
    setDatePreset("today");
    setCategoryFilter("");
    setPaymentFilter("");
    setSearch("");
    setMinAmount("");
    setMaxAmount("");
    setCustomFrom(toInputDate(today));
    setCustomTo(toInputDate(today));
  }

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    let from = null, to = null;
    if (datePreset === "today") {
      from = startOfDay(now);
      to = endOfDay(now);
    } else if (datePreset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      from = startOfDay(y);
      to = endOfDay(y);
    } else if (datePreset === "week") {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      from = startOfDay(w);
      to = endOfDay(now);
    } else if (datePreset === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      to = endOfDay(now);
    } else if (datePreset === "year") {
      from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      to = endOfDay(now);
    } else if (datePreset === "custom") {
      if (customFrom) from = startOfDay(new Date(customFrom));
      if (customTo) to = endOfDay(new Date(customTo));
    }

    const min = minAmount === "" ? null : Number(minAmount);
    const max = maxAmount === "" ? null : Number(maxAmount);
    const q = search.trim().toLowerCase();

    return expenses.filter((e) => {
      const d = new Date(e.date);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (categoryFilter && e.category !== categoryFilter) return false;
      if (paymentFilter && e.paymentMethod !== paymentFilter) return false;
      if (min != null && Number.isFinite(min) && e.amount < min) return false;
      if (max != null && Number.isFinite(max) && e.amount > max) return false;
      if (q) {
        const hay = [e.description, e.vendor, e.note, e.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    expenses,
    datePreset,
    customFrom,
    customTo,
    categoryFilter,
    paymentFilter,
    search,
    minAmount,
    maxAmount,
  ]);

  const totalAmount = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const categoryBreakdown = useMemo(() => {
    const map = new Map();
    for (const e of filteredExpenses) {
      const cat = e.category || "Other";
      map.set(cat, (map.get(cat) || 0) + (e.amount || 0));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Expenses
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {filteredExpenses.length} entr{filteredExpenses.length !== 1 ? "ies" : "y"} — Total:{" "}
              <span className="font-semibold text-red-600 dark:text-red-400">
                Rs. {totalAmount.toFixed(2)}
              </span>
            </p>
          </div>
          <button
            onClick={openAddForm}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            + Add Expense
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "all", label: "All" },
              { key: "today", label: "Today" },
              { key: "yesterday", label: "Yesterday" },
              { key: "week", label: "Last 7 Days" },
              { key: "month", label: "This Month" },
              { key: "year", label: "This Year" },
              { key: "custom", label: "Custom" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setDatePreset(opt.key)}
                className={
                  "rounded-lg border px-3 py-1.5 text-sm font-medium " +
                  (datePreset === opt.key
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                    : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          {datePreset === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-zinc-300 px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
              <span className="text-sm text-zinc-500">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-zinc-300 px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              >
                <option value="">All</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Payment Method
              </label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              >
                <option value="">All</option>
                {PAYMENT_METHODS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="description / vendor / note"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Min Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Max Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        {categoryBreakdown.length > 0 && (
          <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              By Category
            </h3>
            <div className="flex flex-wrap gap-2">
              {categoryBreakdown.map(([cat, amt]) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {cat}: <span className="font-semibold text-red-600 dark:text-red-400">Rs. {amt.toFixed(2)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {filteredExpenses.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
            No expenses match these filters
          </div>
        )}

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {filteredExpenses.map((e) => (
            <div key={e._id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between mb-2">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {e.category}
                </span>
                <span className="font-semibold text-red-600 dark:text-red-400">Rs. {e.amount.toFixed(2)}</span>
              </div>
              {e.description && (
                <p className="text-sm text-zinc-900 dark:text-zinc-50 mb-1">{e.description}</p>
              )}
              {e.vendor && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Vendor: {e.vendor}</p>
              )}
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                <span>{e.paymentMethod}</span>
                <span>{new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
              </div>
              {e.note && (
                <p className="text-xs italic text-zinc-500 dark:text-zinc-400 mb-2">{e.note}</p>
              )}
              <div className="flex gap-3 text-sm">
                <button onClick={() => openEditForm(e)} className="text-zinc-600 dark:text-zinc-400">Edit</button>
                {isAdmin && (
                  <button onClick={() => handleDelete(e._id)} className="text-red-600 dark:text-red-400">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        {filteredExpenses.length > 0 && (
          <div className="hidden md:block rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Vendor</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Payment</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Amount</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e) => (
                  <tr key={e._id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {e.description || "—"}
                      {e.note && (
                        <div className="text-xs italic text-zinc-500 dark:text-zinc-400">{e.note}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{e.vendor || "—"}</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{e.paymentMethod}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">Rs. {e.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => openEditForm(e)} className="text-zinc-600 hover:underline dark:text-zinc-400">Edit</button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(e._id)} className="text-red-600 hover:underline dark:text-red-400">Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
                  <td colSpan={5} className="px-4 py-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">Rs. {totalAmount.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Form modal */}
        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(ev) => ev.target === ev.currentTarget && closeForm()}
          >
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900 rounded-t-2xl">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {editingId ? "Edit Expense" : "Add Expense"}
                </h2>
                <button
                  onClick={closeForm}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Amount (Rs.)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Payment Method</label>
                    <select
                      value={form.paymentMethod}
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    >
                      {PAYMENT_METHODS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Vendor</label>
                  <input
                    type="text"
                    value={form.vendor}
                    onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Note</label>
                  <textarea
                    rows={2}
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {saving ? "Saving..." : editingId ? "Update" : "Add"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
