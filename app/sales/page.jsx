"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

function toInputDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function SalesPage() {
  const router = useRouter();
  const [bills, setBills] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Date filter
  const [filter, setFilter] = useState("all");
  const today = useMemo(() => new Date(), []);
  const [customFrom, setCustomFrom] = useState(toInputDate(today));
  const [customTo, setCustomTo] = useState(toInputDate(today));

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerAge, setCustomerAge] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [editDiscountPercent, setEditDiscountPercent] = useState("");
  const [editCustomerPay, setEditCustomerPay] = useState("");
  const [saving, setSaving] = useState(false);

  function fetchSales() {
    fetch("/api/bills?paid=true")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setBills(data.bills);
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setUser(data.user))
      .catch(() => {});
    fetchSales();
  }, []);

  const isAdmin = user?.role === "admin";

  function startEdit(bill) {
    setEditingId(bill._id);
    setCustomerName(bill.customerName || "");
    setCustomerAddress(bill.customerAddress || "");
    setCustomerAge(bill.customerAge || "");
    setCustomerPhone(bill.customerPhone || "");
    setEditDiscountPercent(bill.discountPercent ? String(bill.discountPercent) : "");
    setEditCustomerPay(bill.customerPay != null ? String(bill.customerPay) : "");
    setCart(
      bill.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productPrice: item.productPrice,
        quantity: item.quantity,
      }))
    );
    setSearch("");
    // Fetch products if not loaded yet
    if (products.length === 0) {
      fetch("/api/products")
        .then((r) => r.json())
        .then((data) => setProducts(data.products))
        .catch(() => {});
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setCart([]);
    setCustomerName("");
    setCustomerAddress("");
    setCustomerAge("");
    setCustomerPhone("");
    setEditDiscountPercent("");
    setEditCustomerPay("");
    setSearch("");
  }

  function addToCart(product) {
    const existing = cart.find((c) => c.productId === product._id);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.productId === product._id ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product._id,
          productName: product.name,
          productPrice: product.price,
          quantity: 1,
        },
      ]);
    }
  }

  function updateQuantity(productId, qty) {
    const quantity = Math.max(1, Number(qty) || 1);
    setCart(
      cart.map((c) => (c.productId === productId ? { ...c, quantity } : c))
    );
  }

  function updatePrice(productId, price) {
    setCart(
      cart.map((c) =>
        c.productId === productId ? { ...c, productPrice: price } : c
      )
    );
  }

  function removeFromCart(productId) {
    setCart(cart.filter((c) => c.productId !== productId));
  }

  const cartSubtotal = cart.reduce(
    (sum, c) => sum + (Number(c.productPrice) || 0) * c.quantity,
    0
  );
  const editPct = Math.min(Math.max(Number(editDiscountPercent) || 0, 0), 100);
  const editDiscountAmount = (cartSubtotal * editPct) / 100;
  const cartTotal = Math.max(0, cartSubtotal - editDiscountAmount);
  const editPayNum = editCustomerPay === "" ? null : Math.max(0, Number(editCustomerPay) || 0);
  const editBalance = editPayNum != null ? +(cartTotal - editPayNum).toFixed(2) : 0;

  async function handleSave() {
    if (cart.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/bills/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerAddress,
          customerAge,
          customerPhone,
          discountPercent: editPct,
          customerPay: editPayNum,
          items: cart.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
            productPrice: Number(c.productPrice) || 0,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update");
        return;
      }
      cancelEdit();
      fetchSales();
    } catch {
      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this sale? Stock will be restored.")) return;
    const res = await fetch(`/api/bills/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (editingId === id) cancelEdit();
      fetchSales();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete");
    }
  }

  const filteredBills = useMemo(() => {
    if (filter === "all") return bills;
    const now = new Date();
    let from, to;
    if (filter === "today") {
      from = startOfDay(now);
      to = endOfDay(now);
    } else if (filter === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      from = startOfDay(y);
      to = endOfDay(y);
    } else if (filter === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      to = endOfDay(now);
    } else if (filter === "custom") {
      if (!customFrom || !customTo) return bills;
      from = startOfDay(new Date(customFrom));
      to = endOfDay(new Date(customTo));
    } else {
      return bills;
    }
    return bills.filter((b) => {
      const ref = b.paidAt ? new Date(b.paidAt) : new Date(b.createdAt);
      return ref >= from && ref <= to;
    });
  }, [bills, filter, customFrom, customTo]);

  const totalRevenue = filteredBills.reduce((sum, b) => sum + b.totalAmount, 0);
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Sales
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {filteredBills.length} paid bill{filteredBills.length !== 1 ? "s" : ""} — Revenue:{" "}
              <span className="font-semibold text-green-600 dark:text-green-400">
                Rs. {totalRevenue.toFixed(2)}
              </span>
            </p>
          </div>
          <Link
            href="/bills"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Unpaid Bills
          </Link>
        </div>

        {/* Date filter */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: "All" },
            { key: "today", label: "Today" },
            { key: "yesterday", label: "Yesterday" },
            { key: "month", label: "This Month" },
            { key: "custom", label: "Custom" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={
                "rounded-lg border px-3 py-1.5 text-sm font-medium " +
                (filter === opt.key
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                  : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800")
              }
            >
              {opt.label}
            </button>
          ))}
          {filter === "custom" && (
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
        </div>

        {filteredBills.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
            No sales in this range
          </div>
        )}

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {filteredBills.map((b) => (
            <div key={b._id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-medium text-zinc-900 dark:text-zinc-50">#{b.billNumber}</span>
                <span className="font-medium text-green-700 dark:text-green-400">Rs. {b.totalAmount.toFixed(2)}</span>
              </div>
              {(b.discountPercent ?? 0) > 0 && (
                <div className="mb-2 text-xs text-red-600 dark:text-red-400">
                  Discount: {b.discountPercent}% (−Rs. {(b.discountAmount ?? 0).toFixed(2)})
                </div>
              )}
              <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                <span>{b.customerName || "No customer"}</span>
                <span>{b.paidAt ? new Date(b.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}</span>
              </div>
              <div className="flex gap-3 text-sm">
                <Link href={`/bills/${b._id}`} className="text-blue-600 dark:text-blue-400">View</Link>
                {isAdmin && (
                  <>
                    <button onClick={() => startEdit(b)} className="text-zinc-600 dark:text-zinc-400">Edit</button>
                    <button onClick={() => handleDelete(b._id)} className="text-red-600 dark:text-red-400">Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        {filteredBills.length > 0 && (
          <div className="hidden md:block rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Bill #</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Items</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Disc %</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Paid On</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((b) => (
                  <tr key={b._id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                    <td className="px-4 py-3 font-mono font-medium text-zinc-900 dark:text-zinc-50">#{b.billNumber}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{b.customerName || "—"}</td>
                    <td className="px-4 py-3 text-right text-zinc-500 dark:text-zinc-400">{b.items.length}</td>
                    <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                      {(b.discountPercent ?? 0) > 0 ? `${b.discountPercent}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-700 dark:text-green-400">Rs. {b.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      {b.paidAt ? new Date(b.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Link href={`/bills/${b._id}`} className="text-blue-600 hover:underline dark:text-blue-400">View</Link>
                      {isAdmin && (
                        <>
                          <button onClick={() => startEdit(b)} className="text-zinc-600 hover:underline dark:text-zinc-400">Edit</button>
                          <button onClick={() => handleDelete(b._id)} className="text-red-600 hover:underline dark:text-red-400">Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit modal */}
        {editingId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => e.target === e.currentTarget && cancelEdit()}
          >
            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
              {/* Modal header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 sm:px-6 sm:py-4 dark:border-zinc-800 dark:bg-zinc-900 rounded-t-2xl">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Edit Sale — Bill #{bills.find((b) => b._id === editingId)?.billNumber}
                </h2>
                <button
                  onClick={cancelEdit}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal body */}
              <div className="grid gap-4 p-4 sm:gap-6 sm:p-6 lg:grid-cols-5">
                {/* Product search */}
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Products
                  </label>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  />
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-100 dark:border-zinc-800">
                    {filtered.length === 0 && (
                      <p className="py-6 text-center text-sm text-zinc-400">
                        No products found
                      </p>
                    )}
                    {filtered.map((p) => (
                      <div
                        key={p._id}
                        className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5 last:border-0 dark:border-zinc-800"
                      >
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-50 text-sm">
                            {p.name}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Rs. {p.price.toFixed(2)} / {p.unit}
                          </p>
                        </div>
                        <button
                          onClick={() => addToCart(p)}
                          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cart */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Patient
                  </label>
                  <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                    <input
                      type="text"
                      placeholder="Phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                    <input
                      type="text"
                      placeholder="Address"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                    <input
                      type="text"
                      placeholder="Age"
                      value={customerAge}
                      onChange={(e) => setCustomerAge(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  </div>

                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Items
                  </label>

                  {cart.length === 0 && (
                    <p className="py-6 text-center text-sm text-zinc-400">
                      No items
                    </p>
                  )}

                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.productId}
                        className="rounded-lg border border-zinc-100 p-2.5 dark:border-zinc-800"
                      >
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {item.productName}
                          </p>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-zinc-500">Qty</span>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuantity(item.productId, e.target.value)
                              }
                              className="w-14 rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-zinc-500">Price</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.productPrice}
                              onChange={(e) =>
                                updatePrice(item.productId, e.target.value)
                              }
                              className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                            />
                          </div>
                          <span className="ml-auto text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            Rs. {((Number(item.productPrice) || 0) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {cart.length > 0 && (
                    <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700 space-y-2">
                      <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                        <span>Subtotal</span>
                        <span>Rs. {cartSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-sm text-zinc-600 dark:text-zinc-400">
                          Discount %
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0"
                            value={editDiscountPercent}
                            onChange={(e) => setEditDiscountPercent(e.target.value)}
                            className="w-20 rounded border border-zinc-300 px-2 py-1 text-right text-sm text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                          />
                          <span className="text-sm text-zinc-500">%</span>
                        </div>
                      </div>
                      {editPct > 0 && (
                        <div className="flex items-center justify-between text-sm text-red-600 dark:text-red-400">
                          <span>Discount ({editPct}%)</span>
                          <span>− Rs. {editDiscountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <span className="font-bold text-zinc-900 dark:text-zinc-50">
                          Total
                        </span>
                        <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                          Rs. {cartTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2">
                        <label className="text-sm text-zinc-600 dark:text-zinc-400">
                          Customer Pay
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-500">Rs.</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="full"
                            value={editCustomerPay}
                            onChange={(e) => setEditCustomerPay(e.target.value)}
                            className="w-24 rounded border border-zinc-300 px-2 py-1 text-right text-sm text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                          />
                        </div>
                      </div>
                      {editPayNum != null && editBalance > 0 && (
                        <div className="flex items-center justify-between text-sm text-orange-600 dark:text-orange-400">
                          <span>Balance Due</span>
                          <span>Rs. {editBalance.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal footer */}
              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-4 py-3 sm:px-6 sm:py-4 dark:border-zinc-800 dark:bg-zinc-950 rounded-b-2xl">
                <button
                  onClick={cancelEdit}
                  className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || cart.length === 0}
                  className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
