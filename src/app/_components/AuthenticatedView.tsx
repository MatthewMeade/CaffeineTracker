"use client";

import { signOut, useSession } from "next-auth/react";

export function AuthenticatedView() {
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white">Welcome!</h2>
        <p className="mt-2 text-lg text-white">{session?.user?.email}</p>
      </div>
      
      <button
        onClick={handleSignOut}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        Sign Out
      </button>
    </div>
  );
} 