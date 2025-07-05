"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import React from "react";

export function SignInForm() {
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isEmailInvalid, setIsEmailInvalid] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      setIsEmailInvalid(true);
      return;
    }
    
    setIsEmailInvalid(false);
    setIsLoading(true);
    setMessage("");

    try {
      // If current user is a guest, we need to link their data after email sign-in
      const isGuest = session?.user?.isGuest;
      const guestUserId = isGuest ? session.user.id : null;

      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/",
      });

      if (result?.error) {
        setMessage(`Error sending email: ${result.error}`);
      } else {
        setMessage("Check your email for a sign-in link!");
        
        // If this was a guest user, we'll need to handle the linking after they verify their email
        // For now, we'll store the guest user ID in localStorage to retrieve it later
        if (isGuest && guestUserId) {
          localStorage.setItem("pendingGuestUserId", guestUserId);
        }
      }
    } catch (error) {
      console.error("Sign in error details:", error);
      if (error instanceof Error) {
        if (error.message.includes("Failed to execute 'json'")) {
          setMessage("Authentication service error. Please try again later.");
        } else {
          setMessage(`An error occurred: ${error.message}`);
        }
      } else {
        setMessage("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-4" data-testid="sign-in-form">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white">
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (validateEmail(e.target.value)) {
              setIsEmailInvalid(false);
            }
          }}
          required
          className="mt-1 block w-full rounded-md border-gray-300 bg-gray-800 px-3 py-2 text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
          placeholder="you@example.com"
        />
        {isEmailInvalid && (
          <p className="mt-2 text-sm text-red-500">Please enter a valid email address</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isLoading ? "Sending..." : "Send Magic Link"}
      </button>

      {message && (
        <p className={`text-sm ${message.includes("Error") ? "text-red-400" : "text-green-400"}`}>
          {message}
        </p>
      )}
    </form>
  );
} 