"use client";
import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import axios from "axios";

type CategoryDoc = { _id: string; name: string; color?: string };

type Props = {
  kind: "expense" | "income";
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export default function AddTransactionModal({
  kind,
  open,
  onClose,
  onSaved,
}: Props) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [category, setCategory] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const [recordMonthly, setRecordMonthly] = useState(false);
  const [serverCategories, setServerCategories] = useState<CategoryDoc[]>([]);
  const [creating, setCreating] = useState(false);
  const [creatingAuto, setCreatingAuto] = useState(false);

  // ------------------------------
  // 🚀 NEW OCR STATE
  // ------------------------------
  const [ocrLoading, setOcrLoading] = useState(false);

  // ------------------------------
  // Load categories when modal opens
  // ------------------------------
  useEffect(() => {
    if (!open) return;
    let mounted = true;

    async function loadCats() {
      try {
        const res = await axios.get("/api/categories");
        console.log("Fetched categories:", res);
        if (res.status !== 200) return setServerCategories([]);

        const json = res.data;
        const list: CategoryDoc[] = Array.isArray(json)
          ? json.map((c: any) => ({
              _id: String(c._id),
              name: c.name,
              color: c.color,
            }))
          : json.categories || [];

        if (mounted) setServerCategories(list);
      } catch {
        if (mounted) setServerCategories([]);
      }
    }

    loadCats();
    return () => {
      mounted = false;
    };
  }, [open]);

  // ------------------------------
  // Category linking logic unchanged
  // ------------------------------
  useEffect(() => {
    if (!category || category === "Other") return setCategoryId(null);
    const match = serverCategories.find(
      (c) => c.name.trim().toLowerCase() === category.trim().toLowerCase()
    );
    setCategoryId(match ? match._id : null);
  }, [category, serverCategories]);

  const linkedCategoryName = (() => {
    if (categoryId) {
      const found = serverCategories.find((c) => c._id === categoryId);
      return found?.name || null;
    }
    if (category && category !== "Other") {
      return (
        serverCategories.find(
          (c) => c.name.trim().toLowerCase() === category.trim().toLowerCase()
        )?.name || null
      );
    }
    return null;
  })();

  // ------------------------------
  // 🚀 NEW: Handle OCR Upload
  // ------------------------------
  //   This to be done
  async function handleBillUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await axios.post("/api/receipt-ocr", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = res.data;
      if (data.error) {
        alert("OCR failed: " + data.error);
        setOcrLoading(false);
        return;
      }

      // Autofill fields based on OCR
      if (data.amount && amount === "") {
        setAmount(Number(data.amount));
      }

      if (data.merchant && title === "") {
        setTitle(data.merchant);
      }

      if (data.date) {
        setNotes((prev) => `${prev} (Bill Date: ${data.date})`);
      }
    } catch (err) {
      console.error("OCR error:", err);
      alert("OCR failed! Check console.");
    }

    setOcrLoading(false);
  }

  // ------------------------------
  // (Your existing ensureCategory, createCategory, submit logic stays untouched)
  // ------------------------------
  async function refreshCategoriesAndLinkByName(name: string) {
    try {
      const res = await axios.get("/api/categories");

      if (res.status !== 200) return;

      const json = res.data;
      const list: CategoryDoc[] = Array.isArray(json)
        ? json.map((c: any) => ({ _id: String(c._id), name: c.name }))
        : json.categories || [];

      setServerCategories(list);

      const match = list.find(
        (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (match) {
        setCategoryId(match._id);
        setCategory(match.name);
      }
    } catch {}
  }

  async function createCategoryAndLink(name: string) {
    const safeName = name.trim();
    if (!safeName) return alert("Enter a category name first");

    setCreating(true);

    try {
      const res = await axios.post("/api/categories", {
        name: safeName,
        color: "#fde68a",
      });

      if (res.status !== 201) {
        if (res.status === 409) {
          await refreshCategoriesAndLinkByName(safeName);
          setCreating(false);
          return;
        }
        alert("Failed to create category");
        setCreating(false);
        return;
      }

      const created = res.data;
      const doc = { _id: created._id, name: created.name };

      setServerCategories((prev) => [doc, ...prev]);
      setCategory(doc.name);
      setCategoryId(doc._id);
      setCustomCategory("");
    } finally {
      setCreating(false);
    }
  }

  async function ensureCategoryIdForSelected() {
    if (!category || category === "Other") return null;
    if (categoryId) return categoryId;

    setCreatingAuto(true);

    try {
      const res = await axios.post("/api/categories", {
        name: category,
        color: "#fde68a",
      });

      if (res.status === 201) {
        const created = res.data;
        setCategoryId(created._id);
        return created._id;
      }
      if (res.status === 409) {
        await refreshCategoriesAndLinkByName(category);
        return null;
      }
      return null;
    } finally {
      setCreatingAuto(false);
    }
  }

  // ------------------------------
  // Submit Logic
  // ------------------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || amount === "") return alert("Title and amount required");

    setLoading(true);

    try {
      let finalCategory = "";
      let finalCategoryId: string | null = null;

      if (kind === "expense") {
        if (category === "Other") {
          finalCategory = customCategory.trim() || "Other";
          finalCategoryId = categoryId;
        } else if (category) {
          finalCategory = category;
          finalCategoryId = categoryId || (await ensureCategoryIdForSelected());
        } else {
          finalCategory = "Other";
          finalCategoryId = null;
        }
      }

      const now = new Date();
      const payload: any = {
        title: title.trim(),
        amount: Number(amount),
        category: kind === "expense" ? finalCategory : "",
        categoryId: kind === "expense" ? finalCategoryId : null,
        notes: kind === "income" ? "" : notes,
        kind,
        date: now.toISOString(),
      };

      if (kind === "income" && recordMonthly) {
        payload.recurrence = "monthly";
        payload.startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        ).toISOString();
      }

      const res = await axios.post("/api/expenses", payload);

      if (res.status !== 200) {
        alert("Failed to save");
        setLoading(false);
        return;
      }

      onSaved?.();
      window.dispatchEvent(new CustomEvent("monify:expense:added"));
      onClose();

      // reset
      setTitle("");
      setAmount("");
      setCategory("");
      setCategoryId(null);
      setCustomCategory("");
      setNotes("");
      setRecordMonthly(false);
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------
  // JSX RETURN — ADDED OCR LOADING INDICATOR
  // ------------------------------
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={kind === "expense" ? "Add Expense" : "Add Income"}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Title + Amount */}
        <div className="grid grid-cols-2 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              kind === "expense"
                ? "Title (e.g., Dinner)"
                : "Income type (e.g., Salary)"
            }
            className="w-full p-2 border rounded"
          />
          <input
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="Amount"
            type="number"
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Expense-only */}
        {kind === "expense" && (
          <>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select Category</option>
                  <option value="Food">Food</option>
                  <option value="Travel">Travel</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Health">Health</option>
                  <option value="Bills">Bills</option>
                  <option value="Other">Other</option>
                </select>

                <div className="mt-1 text-xs">
                  {linkedCategoryName ? (
                    <span className="inline-flex items-center gap-2 text-green-600">
                      <span className="h-2 w-2 rounded-full bg-green-600 block" />{" "}
                      Linked: {linkedCategoryName}
                    </span>
                  ) : category && category !== "Other" ? (
                    <span className="text-xs text-orange-600">
                      Will auto-create on save
                    </span>
                  ) : null}

                  {creatingAuto && (
                    <div className="text-xs text-gray-500">Linking…</div>
                  )}
                </div>
              </div>

              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full p-2 border rounded"
              />
            </div>

            {category === "Other" && (
              <div className="flex gap-3">
                <input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category"
                  className="w-full p-2 border rounded"
                />
                <button
                  type="button"
                  onClick={() => createCategoryAndLink(customCategory)}
                  disabled={!customCategory.trim() || creating}
                  className="px-3 py-2 bg-blue-600 text-white rounded"
                >
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            )}

            {/* Updated Upload Bill Section (OCR enabled) */}
            <div>
              <label className="block text-sm mb-1">
                Upload bill (optional)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleBillUpload}
              />

              {ocrLoading && (
                <p className="text-xs text-gray-500 mt-1">
                  Extracting text from bill…
                </p>
              )}
            </div>
          </>
        )}

        {/* Income-only */}
        {kind === "income" && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input
                id="recurring-monthly"
                type="checkbox"
                checked={recordMonthly}
                onChange={(e) => setRecordMonthly(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="recurring-monthly" className="text-sm">
                Record monthly (recurring)
              </label>
            </div>
            <div className="text-xs text-gray-500">
              Will repeat each month automatically.
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || creatingAuto}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {loading
              ? "Saving..."
              : kind === "expense"
              ? "Add Expense"
              : recordMonthly
              ? "Add Monthly Income"
              : "Add Income"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
