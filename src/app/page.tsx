"use client";

import { useSession } from "next-auth/react";
import { SignInForm } from "./_components/SignInForm";
import { AuthenticatedView } from "./_components/AuthenticatedView";

export default function HomePage() {
  const { data: session, status } = useSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        {status === "loading" ? (
          <div className="text-white">Loading...</div>
        ) : session ? (
          <AuthenticatedView />
        ) : (
          <>
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-[5rem]">
                Sign In
              </h1>
              <p className="text-lg text-white">
                Enter your email to receive a magic link
              </p>
            </div>

            <div className="w-full max-w-md">
              <SignInForm />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
