import { auth } from "~/auth";
import { AuthenticationWrapper } from "./_components/AuthenticationWrapper";
import { GuestDataLinker } from "./_components/GuestDataLinker";
import { createCaller } from "~/server/trpc/server";

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
  let dailyData;
  let limitData;
  
  try {
    const caller = await createCaller();
    [dailyData, limitData] = await Promise.all([
      caller.entries.getDaily({}),
      caller.settings.getLimit(),
    ]);
  } catch (error) {
    console.error("Failed to fetch initial data:", error);
    // Continue without initial data - the client will fetch it
    dailyData = undefined;
    limitData = undefined;
  }

  return (
    <>
      <GuestDataLinker />
      <AuthenticationWrapper 
        initialDailyData={dailyData}
        initialLimitData={limitData}
      />
    </>
  );
}
