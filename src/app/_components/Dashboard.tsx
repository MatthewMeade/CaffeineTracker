"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import { SignInForm } from "./SignInForm";

export function Dashboard() {
  const { data: session } = useSession();
  const isGuest = session?.user?.isGuest;

  return (
    <div className="mx-auto mt-16 w-full max-w-lg rounded-lg bg-white/10 p-8 text-center">
      <h1 className="mb-4 text-3xl font-bold text-white">Caffeine Tracker</h1>
      <p className="mb-6 text-gray-300">
        Welcome to your caffeine tracking dashboard!
      </p>
      {isGuest ? (
        <>
          <p className="mb-4 text-gray-400">
            Sign in to save your data permanently.
          </p>
          <div className="mx-auto w-full max-w-xs">
            <SignInForm />
          </div>
        </>
      ) : (
        <>
          <p className="mb-4 text-gray-400">
            Your data is being saved automatically.
          </p>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
          >
            Sign Out
          </button>
        </>
      )}
    </div>
  );
}
