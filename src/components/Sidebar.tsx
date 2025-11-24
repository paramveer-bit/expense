"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Sidebar() {
  const router = useRouter();

  function goAnalytics() {
    router.push("/dashboard?view=analytics");
  }

  return (
    <aside className="w-64 bg-white h-screen border-r sticky top-0 flex flex-col">
      <div className="p-6 border-b flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
          M
        </div>
        <div>
          <div className="font-bold text-lg">Monify</div>
          <div className="text-xs text-gray-500">Expense Tracker</div>
        </div>
      </div>

      <nav className="p-4 space-y-1 flex-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50"
        >
          <span>Dashboard</span>
        </Link>

        <button
          onClick={goAnalytics}
          className="flex items-center gap-3 px-3 py-2 rounded w-full text-left hover:bg-gray-50"
        >
          <span>Analytics</span>
        </button>

        <Link
          href="/dashboard?view=categories"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50"
        >
          <span>Categories</span>
        </Link>

        <Link
          href="/dashboard?view=profile"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50"
        >
          <span>Profile</span>
        </Link>
      </nav>

      <div className="mt-auto p-4 text-xs text-gray-400 border-t">
        © Monify — 2025
      </div>
    </aside>
  );
}
