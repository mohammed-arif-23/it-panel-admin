"use client";

import React from "react";
import ModernStudentRegistration from "@/components/admin/ModernStudentRegistration";
import ModernPageHeader from "@/components/admin/ModernPageHeader";
import { UserPlus } from "lucide-react";

export default function RegistrationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <ModernPageHeader
        title="Student Registration"
        description="Register new students to the system"
        icon={<UserPlus className="h-6 w-6 text-white" />}
        backHref="/"
        backLabel="Dashboard"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <ModernStudentRegistration />
      </div>
    </div>
  );
}
