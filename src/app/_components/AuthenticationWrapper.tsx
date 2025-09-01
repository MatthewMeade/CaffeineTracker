"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { DailyView } from "./DailyView";
import type { DailyEntriesApiResponse, DailyLimitApiResponse } from "~/types/api";

type SuggestionsApiResponse = Array<{
  name: string;
  icon?: string;
  caffeineMg: number;
}>;

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
  const { status } = useSession();
  const [isSignInAttempted, setIsSignInAttempted] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated" && !isSignInAttempted) {
      setIsSignInAttempted(true);
      signIn("anonymous", { redirect: false }).catch((error) => {
        console.error("Automatic anonymous sign-in failed:", error);
      });
    }
  }, [status, isSignInAttempted]);


  return (
    <DailyView
      initialDailyData={initialDailyData}
      initialLimitData={initialLimitData}
      initialSuggestions={initialSuggestions}
    />
  );
} 