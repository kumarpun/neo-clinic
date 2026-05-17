"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBs } from "@/lib/nepaliDate";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toInputDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const EMPTY_FORM = {
  date: toInputDate(new Date()),
  patientName: "",
  address: "",
  contact: "",
  ageSex: "",
  newPatients: "",
  followupPatients: "",
  diagnosis: "",
  amount: "",
  remarks: "",
  consultant: "",
  note: "",
};

export default function FollowUpPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterDate, setFilterDate] = useState(toInputDate(new Date()));

  const filteredItems = filterDate
    ? items.filter((it) => toInputDate(new Date(it.date)) === filterDate)
    : items;

  function fetchItems() {
    fetch("/api/followups")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setItems(data.followups);
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setUser(data.user))
      .catch(() => {});
    fetchItems();
  }, []);

  const isAdmin = user?.role === "admin";

  function update(k, v) {
    setForm({ ...form, [k]: v });
  }

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: toInputDate(new Date()) });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(item) {
    setEditingId(item._id);
    setForm({
      date: toInputDate(new Date(item.date)),
      patientName: item.patientName || "",
      address: item.address || "",
      contact: item.contact || "",
      ageSex: item.ageSex || "",
      newPatients: item.newPatients || "",
      followupPatients: item.followupPatients || "",
      diagnosis: item.diagnosis || "",
      amount: item.amount ?? "",
      remarks: item.remarks || "",
      consultant: item.consultant || "",
      note: item.note || "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId ? `/api/followups/${editingId}` : "/api/followups";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to save");
        return;
      }
      closeModal();
      fetchItems();
    } catch {
      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/followups/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (editingId === id) closeModal();
      fetchItems();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Follow Up Register
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {filteredItems.length} entr{filteredItems.length !== 1 ? "ies" : "y"}
              {filterDate && (
                <span className="ml-1">
                  on {formatBs(new Date(filterDate))} ({DAY_NAMES[new Date(filterDate).getDay()]})
                </span>
              )}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            + Add Entry
          </button>
        </div>

        {/* Filter */}
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Filter by date
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
          <button
            type="button"
            onClick={() => setFilterDate(toInputDate(new Date()))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setFilterDate("")}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            All
          </button>
        </div>

        {/* List */}
        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
            {items.length === 0 ? "No entries yet" : "No entries for selected date"}
          </div>
        ) : (
          <div className="hidden md:block rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Date (BS)</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Day</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Patient</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Address</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Contact</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Age/Sex</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">New</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Followup</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Diagnosis</th>
                  <th className="px-3 py-2 text-right font-medium text-zinc-500 dark:text-zinc-400">Amount</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Remarks</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Consultant</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Note</th>
                  <th className="px-3 py-2 text-right font-medium text-zinc-500 dark:text-zinc-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((it) => {
                  const d = new Date(it.date);
                  return (
                    <tr key={it._id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800 align-top">
                      <td className="px-3 py-2 text-zinc-900 dark:text-zinc-50 whitespace-nowrap">{formatBs(d)}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{DAY_NAMES[d.getDay()]}</td>
                      <td className="px-3 py-2 text-zinc-900 dark:text-zinc-50 whitespace-nowrap">{it.patientName || "—"}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{it.address || "—"}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{it.contact || "—"}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{it.ageSex || "—"}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{it.newPatients || "—"}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{it.followupPatients || "—"}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{it.diagnosis || "—"}</td>
                      <td className="px-3 py-2 text-right font-medium text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                        {it.amount ? `Rs. ${Number(it.amount).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{it.remarks || "—"}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{it.consultant || "—"}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 max-w-[200px] whitespace-pre-wrap">{it.note || "—"}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => startEdit(it)}
                          className="text-zinc-600 hover:underline dark:text-zinc-400"
                        >
                          Edit
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(it._id)}
                            className="text-red-600 hover:underline dark:text-red-400"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile cards */}
        {filteredItems.length > 0 && (
          <div className="space-y-3 md:hidden">
            {filteredItems.map((it) => {
              const d = new Date(it.date);
              return (
                <div key={it._id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      {it.patientName && (
                        <p className="font-semibold text-zinc-900 dark:text-zinc-50">{it.patientName}</p>
                      )}
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{formatBs(d)}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{DAY_NAMES[d.getDay()]}</p>
                    </div>
                    {it.amount > 0 && (
                      <span className="font-medium text-green-700 dark:text-green-400">
                        Rs. {Number(it.amount).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                    {it.address && <p className="col-span-2"><span className="text-zinc-400">Address:</span> {it.address}</p>}
                    {it.contact && <p><span className="text-zinc-400">Contact:</span> {it.contact}</p>}
                    {it.ageSex && <p><span className="text-zinc-400">Age/Sex:</span> {it.ageSex}</p>}
                    {it.newPatients && <p><span className="text-zinc-400">New:</span> {it.newPatients}</p>}
                    {it.followupPatients && <p><span className="text-zinc-400">Followup:</span> {it.followupPatients}</p>}
                    {it.diagnosis && <p className="col-span-2"><span className="text-zinc-400">Diagnosis:</span> {it.diagnosis}</p>}
                    {it.remarks && <p><span className="text-zinc-400">Remarks:</span> {it.remarks}</p>}
                    {it.consultant && <p><span className="text-zinc-400">Consultant:</span> {it.consultant}</p>}
                    {it.note && <p className="col-span-2"><span className="text-zinc-400">Note:</span> {it.note}</p>}
                  </div>
                  <div className="mt-3 flex gap-3 text-sm">
                    <button onClick={() => startEdit(it)} className="text-zinc-600 dark:text-zinc-400">Edit</button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(it._id)} className="text-red-600 dark:text-red-400">Delete</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit modal */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 sm:px-6 sm:py-4 dark:border-zinc-800 dark:bg-zinc-900 rounded-t-2xl">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {editingId ? "Edit Entry" : "New Entry"}
                </h2>
                <button
                  onClick={closeModal}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit}>
                <div className="grid gap-3 p-4 sm:p-6 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) => update("date", e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                    {form.date && (
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        BS: {formatBs(new Date(form.date))} — {DAY_NAMES[new Date(form.date).getDay()]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Patient Name
                    </label>
                    <input
                      type="text"
                      value={form.patientName}
                      onChange={(e) => update("patientName", e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => update("address", e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Contact
                    </label>
                    <input
                      type="text"
                      value={form.contact}
                      onChange={(e) => update("contact", e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Age / Sex
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 32 / M"
                      value={form.ageSex}
                      onChange={(e) => update("ageSex", e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      New Patients
                    </label>
                    <input
                      type="text"
                      value={form.newPatients}
                      onChange={(e) => update("newPatients", e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Followup Patients
                    </label>
                    <input
                      type="text"
                      value={form.followupPatients}
                      onChange={(e) => update("followupPatients", e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Diagnosis
                    </label>
                    <input
                      type="text"
                      value={form.diagnosis}
                      onChange={(e) => update("diagnosis", e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Amount (Rs.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => update("amount", e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Remarks
                    </label>
                    <input
                      type="text"
                      value={form.remarks}
                      onChange={(e) => update("remarks", e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Consultant
                    </label>
                    <input
                      type="text"
                      value={form.consultant}
                      onChange={(e) => update("consultant", e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Note
                    </label>
                    <textarea
                      rows={2}
                      value={form.note}
                      onChange={(e) => update("note", e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 flex justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-4 py-3 sm:px-6 sm:py-4 dark:border-zinc-800 dark:bg-zinc-950 rounded-b-2xl">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {saving ? "Saving..." : editingId ? "Update Entry" : "Add Entry"}
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
