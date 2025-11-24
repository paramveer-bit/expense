import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import HeaderBar from "@/components/Header/Header";
import DashboardClient from "@/components/Dashboard-Components/DashboardClient";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/api/auth/signin");

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-8">
          <HeaderBar />
          <DashboardClient />
        </div>
      </div>
    </div>
  );
}
