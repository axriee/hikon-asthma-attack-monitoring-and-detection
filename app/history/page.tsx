"use client";

import Header from "@/components/Header";
import HistoryContent from "@/components/HistoryContent";

export default function History() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50">
      <Header currentPage="history" />
      <HistoryContent />
    </div>
  );
}
