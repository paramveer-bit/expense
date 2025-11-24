"use client";
import React, { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Card from "./Card"; // adjust path if needed
import { useUser } from "@/components/providers/UserProvider"; // adjust path if needed
import axios from "axios";

type UserPayload = {
  name?: string;
  email?: string;
  monthlyIncome?: number | null;
};

export default function ProfilePanel() {
  const { data: session } = useSession();
  const sessionUser = (session?.user ?? {}) as {
    name?: string;
    email?: string;
  };

  const { user, updateUser } = useUser();

  const [name, setName] = useState<string>(sessionUser?.name ?? "");
  const [editingName, setEditingName] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  // sync user data to local inputs
  useEffect(() => {
    if (user) {
      if (typeof user.name === "string") setName(user.name);
      setMonthlyIncome(
        typeof user.monthlyIncome === "number" ? user.monthlyIncome : ""
      );
    } else {
      setName(sessionUser?.name ?? "");
      setMonthlyIncome("");
    }
  }, [user, sessionUser?.name]);

  async function saveName() {
    if (!name || name.trim().length === 0) return alert("Name cannot be empty");
    setSaving(true);
    try {
      if (typeof updateUser === "function") {
        await updateUser({ name: name.trim() });
      } else {
        // fallback direct PUT

        const res = await axios.put("/api/user", { name: name.trim() });
      }
      setEditingName(false);
      // notify others (optional)
      try {
        window.dispatchEvent(new Event("monify:user:updated"));
      } catch {}
    } catch (err) {
      console.error(err);
      alert("Failed to save name");
    } finally {
      setSaving(false);
    }
  }

  async function saveMonthlyIncome() {
    // normalize value: empty => null, numeric otherwise
    const normalized = monthlyIncome === "" ? null : Number(monthlyIncome);

    if (normalized !== null && (Number.isNaN(normalized) || normalized < 0)) {
      return alert("Monthly income must be a positive number or empty");
    }

    setSaving(true);
    try {
      if (typeof updateUser === "function") {
        // expect updateUser to return/throw on failure
        await updateUser({ monthlyIncome: normalized });
      } else {
        // fallback: best-effort direct PUT

        const res = await axios.put("/api/user", { monthlyIncome: normalized });
        if (res.status !== 200) {
          throw new Error(
            res.data?.error || `PUT /api/user failed (${res.status})`
          );
        }
      }

      // on success, keep local input in sync (use number for non-null)
      setMonthlyIncome(normalized === null ? "" : Number(normalized));

      // Notify other parts of the app so dashboard and widgets refresh
      try {
        window.dispatchEvent(new Event("monify:user:updated"));
        // legacy event some places listen to
        window.dispatchEvent(new Event("monify:expense:added"));
      } catch {}

      // subtle success - no alert to avoid annoyance
    } catch (err) {
      console.error("saveMonthlyIncome failed", err);
      alert("Failed to save monthly income — check console / network");
    } finally {
      setSaving(false);
    }
  }

  const displayName = user?.name ?? sessionUser?.name ?? name ?? "";
  const displayEmail = user?.email ?? sessionUser?.email ?? "";

  return (
    <div className="max-w-4xl mx-auto px-4">
      <Card className="flex flex-col md:flex-row gap-6 items-start min-w-0">
        {/* LEFT column: avatar + name/edit */}
        <div className="flex flex-col items-start gap-4 md:w-1/3 min-w-0 relative">
          <div className="relative">
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
              {displayName ? displayName.charAt(0).toUpperCase() : "U"}
            </div>

            {/* small circular pen icon */}
            <button
              onClick={() => setEditingName(true)}
              title="Edit name"
              aria-label="Edit name"
              className="absolute -right-2 -bottom-2 bg-white border rounded-full p-1.5 shadow hover:scale-105 transition transform"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-700"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M17.414 2.586a2 2 0 0 0-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 0 0 0-2.828z" />
                <path d="M2 15.25V18h2.75L15.81 6.94l-2.75-2.75L2 15.25z" />
              </svg>
            </button>
          </div>

          <div className="w-full min-w-0">
            {!editingName ? (
              <>
                <div className="text-xl font-semibold truncate">
                  {displayName || "Unnamed"}
                </div>
                <div className="text-sm text-gray-500 mt-1 truncate">
                  {displayEmail || "No email"}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2 mt-1">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  className="p-2 rounded border w-full max-w-xs"
                  aria-label="Edit name"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveName}
                    disabled={saving}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setName(displayName);
                    }}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT column */}
        <div className="flex-1 w-full md:w-2/3 min-w-0">
          <div className="flex flex-col gap-5">
            {/* Monthly income */}
            {/* <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Monthly income</div>
                <div className="text-md font-medium text-gray-800">
                  {monthlyIncome === "" || monthlyIncome == null
                    ? "—"
                    : `₹${Number(monthlyIncome).toLocaleString("en-IN")}`}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={monthlyIncome === null ? "" : monthlyIncome}
                  onChange={(e) =>
                    setMonthlyIncome(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="p-2 border rounded w-36"
                />
                <button
                  onClick={saveMonthlyIncome}
                  disabled={saving}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setMonthlyIncome("")}
                  className="px-3 py-2 border rounded text-sm"
                >
                  Clear
                </button>
              </div>
            </div> */}

            {/* Account actions */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Account actions</div>
                <div className="text-xs text-gray-400">
                  Sign out and account controls
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
