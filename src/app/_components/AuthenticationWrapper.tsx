"use client";

import { useSession } from "next-auth/react";
import { DailyView } from "./DailyView";
import { SignInForm } from "./SignInForm";
import type { DailyEntriesApiResponse } from "~/types/api";
import type { DailyLimitApiResponse } from "~/types/api";

interface AuthenticationWrapperProps {
  initialDailyData?: DailyEntriesApiResponse;
  initialLimitData?: DailyLimitApiResponse;
}

export function AuthenticationWrapper({ 
  initialDailyData, 
  initialLimitData 
}: AuthenticationWrapperProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-cyan-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <SignInForm />;
  }

  return (
    <DailyView 
      initialDailyData={initialDailyData}
      initialLimitData={initialLimitData}
    />
  );
} 