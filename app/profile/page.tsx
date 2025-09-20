"use client";

import Header from "@/components/Header";
import ProfileContent from "@/components/ProfileContent";

export default function Profile() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50">
      <Header currentPage="profile" />
      <ProfileContent />
    </div>
  );
}
