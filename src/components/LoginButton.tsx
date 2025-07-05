"use client";

import React from "react";
import { signIn, signOut, useSession } from "next-auth/react";

export function LoginButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">{session.user?.email}</span>
        <button
          onClick={() => signOut()}
          className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("email")}
      className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
    >
      Sign In
    </button>
  );
}
