"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { DailyView } from "./DailyView";
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
  const [isSignInAttempted, setIsSignInAttempted] = useState(false);

  useEffect(() => {
    // Only attempt automatic sign-in if:
    // 1. Status is "unauthenticated" (no session)
    // 2. We haven't already attempted to sign in
    if (status === "unauthenticated" && !isSignInAttempted) {
      setIsSignInAttempted(true);
      
      signIn("anonymous", { redirect: false })
        .catch((error) => {
          console.error("Automatic anonymous sign-in failed:", error);
        });
    }
  }, [status, isSignInAttempted]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-cyan-400 text-lg">Loading...</div>
      </div>
    );
  }

  // Show loading while attempting automatic sign-in or if unauthenticated
  if (!session) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-cyan-400 text-lg">Setting up your session...</div>
      </div>
    );
  }

  return (
    <DailyView 
      initialDailyData={initialDailyData}
      initialLimitData={initialLimitData}
    />
  );
} 