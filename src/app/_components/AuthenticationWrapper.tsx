"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { DailyView } from "./DailyView";
import type { DailyEntriesApiResponse, DailyLimitApiResponse, SuggestionsApiResponse } from "~/types/api";

interface AuthenticationWrapperProps {
  initialDailyData?: DailyEntriesApiResponse;
  initialLimitData?: DailyLimitApiResponse;
  initialSuggestions?: SuggestionsApiResponse;
}

export function AuthenticationWrapper({ 
  initialDailyData, 
  initialLimitData,
  initialSuggestions
}: AuthenticationWrapperProps) {
  const { data: session, status } = useSession();
  const [isSignInAttempted, setIsSignInAttempted] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated" && !isSignInAttempted) {
      setIsSignInAttempted(true);
      signIn("anonymous", { redirect: false }).catch((error) => {
        console.error("Automatic anonymous sign-in failed:", error);
      });
    }
  }, [status, isSignInAttempted]);

  if (status === "loading" || !session) {
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
      initialSuggestions={initialSuggestions}
    />
  );
} 