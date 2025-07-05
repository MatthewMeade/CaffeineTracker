"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { AuthenticatedView } from "./_components/AuthenticatedView";
import { GuestDataLinker } from "./_components/GuestDataLinker";

export default function HomePage() {
  const { data: session, status } = useSession();
  const [isAnonymousSignInAttempted, setIsAnonymousSignInAttempted] = useState(false);

  // Auto-sign in anonymous users when they're unauthenticated
  useEffect(() => {
    if (status === "unauthenticated" && !isAnonymousSignInAttempted) {
      setIsAnonymousSignInAttempted(true);
      signIn("anonymous", { redirect: false }).catch((error) => {
        console.error("Anonymous sign-in failed:", error);
      });
    }
  }, [status, isAnonymousSignInAttempted]);

  const isLoading =
    status === "loading" ||
    (status === "unauthenticated" && !isAnonymousSignInAttempted) ||
    (status === "unauthenticated" && isAnonymousSignInAttempted && !session);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
      <GuestDataLinker />
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        {isLoading ? (
          <div className="text-white">Loading...</div>
        ) : (
          <AuthenticatedView />
        )}
      </div>
    </main>
  );
}
