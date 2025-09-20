"use client";

import Header from "@/components/Header";
import DashboardContent from "@/components/DashboardContent";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50">
      <Header currentPage="dashboard" />
      <DashboardContent />
    </div>
  );
}
