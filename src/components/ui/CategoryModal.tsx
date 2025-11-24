"use client";
import axios from "axios";
import React, { useEffect, useState } from "react";

type EditCat = {
  _id?: string;
  name?: string;
  type?: string;
  color?: string;
  budget?: number | null;
} | null;

const TYPE_OPTIONS = [
  { value: "Food", label: "Food", icon: "🍔" },
  { value: "Transport", label: "Transport", icon: "🚗" },
  { value: "Shopping", label: "Shopping", icon: "🛒" },
  { value: "Bills", label: "Bills", icon: "🧾" },
  { value: "Entertainment", label: "Entertainment", icon: "🎬" },
  { value: "Health", label: "Health", icon: "💊" },
  { value: "Other", label: "Other", icon: "🏷️" },
];

export default function CategoryModal({
  open,
  onClose,
  onSaved,
  edit,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  edit?: EditCat;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("Other");
  const [color, setColor] = useState("#fde68a");
  const [budget, setBudget] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(edit?.name ?? "");
      setType(edit?.type ?? "Other");
      setColor(edit?.color ?? "#fde68a");
      // normalize any numeric budget into string; accept null/undefined
      setBudget(edit?.budget != null ? String(edit.budget) : "");
    }
  }, [open, edit]);

  if (!open) return null;

  function sanitizeBudget(v: string) {
    return v.replace(/[^\d]/g, "");
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) return alert("Name required");

    // sanitized budget string
    const clean = sanitizeBudget(budget || "");
    // explicitly produce either number or null (don't omit the field)
    const budgetPayload: number | null = clean ? Number(clean) : null;

    const payload: any = {
      name: name.trim(),
      type: type || "Other",
      color,
      budget: budgetPayload,
    };

    setLoading(true);
    try {
      if (edit?._id) {
        const res = await axios.put(
          `/api/categories?id=${encodeURIComponent(edit._id)}`,
          payload
        );
        if (res.status !== 200) {
          throw new Error(res.data?.error || "Update failed");
        }
      } else {
        const res = await axios.post("/api/categories", payload);

        if (res.status !== 201) {
          throw new Error(res.data?.error || "Create failed");
        }
      }

      onSaved?.();
      window.dispatchEvent(new CustomEvent("monify:expense:added"));
      onClose();
    } catch (err: any) {
      console.error("Category save error:", err);
      alert(err?.response?.data?.error || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-xl bg-white rounded-lg shadow-lg p-6"
      >
        <h3 className="text-lg font-semibold mb-4">
          {edit ? "Edit Category" : "Add Category"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., Food"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Budget (optional)
            </label>
            <input
              inputMode="numeric"
              value={budget}
              onChange={(e) => setBudget(sanitizeBudget(e.target.value))}
              placeholder="e.g., 5000"
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-xs text-gray-400 mt-1">
              Leave blank for no budget
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-10 p-0 border rounded"
                aria-label="Category color"
              />
              <div className="text-sm text-gray-600">{color}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 border rounded"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1 bg-blue-600 text-white rounded"
            disabled={loading}
          >
            {loading ? "Saving..." : edit ? "Save changes" : "Create category"}
          </button>
        </div>
      </form>
    </div>
  );
}
