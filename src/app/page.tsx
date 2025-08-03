import { auth } from "~/auth";
import { AuthenticationWrapper } from "./_components/AuthenticationWrapper";
import { GuestDataLinker } from "./_components/GuestDataLinker";
import { createCaller } from "~/server/trpc/server";
import type { DailyEntriesApiResponse, DailyLimitApiResponse } from "~/types/api";

type SuggestionsApiResponse = Array<{
  name: string;
  icon?: string;
  caffeineMg: number;
}>;

export default async function HomePage() {
  const session = await auth();

  // If no session, show guest view
  if (!session) {
    return (
      <>
        <GuestDataLinker />
        <AuthenticationWrapper />
      </>
    );
  }

  // Pre-fetch data on the server using tRPC caller
  let dailyData: DailyEntriesApiResponse | undefined;
  let limitData: DailyLimitApiResponse | undefined;
  let suggestions: SuggestionsApiResponse;
  
  try {
    const caller = await createCaller();
    [dailyData, limitData, suggestions] = await Promise.all([
      caller.entries.getDaily({}),
      caller.settings.getLimit(),
      caller.entries.getSuggestions(),
    ]);
  } catch (error) {
    console.error("Failed to fetch initial data:", error);
    // Continue without initial data - the client will fetch it
    dailyData = undefined;
    limitData = undefined;
    suggestions = [];
  }

  return (
    <>
      <GuestDataLinker />
      <AuthenticationWrapper 
        initialDailyData={dailyData}
        initialLimitData={limitData}
        initialSuggestions={suggestions}
      />
    </>
  );
}
