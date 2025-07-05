"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import { SignInForm } from "./SignInForm";

export function Dashboard() {
  const { data: session } = useSession();
  const isGuest = session?.user?.isGuest;

  return (
    <div className="w-full max-w-lg mx-auto mt-16 p-8 bg-white/10 rounded-lg text-center">
      <h1 className="text-3xl font-bold text-white mb-4">Caffeine Tracker</h1>
      <p className="text-gray-300 mb-6">
        Welcome to your caffeine tracking dashboard!
      </p>
      {isGuest ? (
        <>
          <p className="text-gray-400 mb-4">Sign in to save your data permanently.</p>
          <div className="w-full max-w-xs mx-auto">
            <SignInForm />
          </div>
        </>
      ) : (
        <>
          <p className="text-gray-400 mb-4">Your data is being saved automatically.</p>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Sign Out
          </button>
        </>
      )}
    </div>
  );
} 