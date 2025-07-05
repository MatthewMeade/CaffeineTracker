"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { Dashboard } from "./Dashboard";

export function AuthenticatedView() {
  const { data: session } = useSession();
  const isGuest = session?.user?.isGuest;

  if (isGuest) {
    return <Dashboard />;
  }

  return <Dashboard />;
} 