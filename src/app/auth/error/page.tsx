"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
            Authentication Error
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            {error || "An error occurred during authentication"}
          </p>
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-indigo-400 hover:text-indigo-300"
          >
            Return to sign in
          </Link>
        </div>
      </div>
    </div>
  );
} 