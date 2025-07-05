"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function GuestDataLinker() {
  const { data: session } = useSession();
  const [isLinking, setIsLinking] = useState(false);
  const [linkMessage, setLinkMessage] = useState("");

  useEffect(() => {
    const linkGuestData = async () => {
      // Only run if user is authenticated (not guest) and we have a pending guest user ID
      if (session?.user?.id && !session.user.isGuest) {
        const pendingGuestUserId = localStorage.getItem("pendingGuestUserId");

        if (pendingGuestUserId) {
          setIsLinking(true);
          setLinkMessage("Linking your guest data...");

          try {
            const response = await fetch(
              `/api/auth/link-guest?previousSessionId=${pendingGuestUserId}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
              },
            );

            if (response.ok) {
              setLinkMessage("Successfully linked your guest data!");
              localStorage.removeItem("pendingGuestUserId");
            } else {
              const error = (await response.json()) as {
                error?: { message?: string };
              };
              setLinkMessage(
                `Failed to link data: ${error.error?.message ?? "Unknown error"}`,
              );
            }
          } catch (error) {
            console.error("Error linking guest data:", error);
            setLinkMessage("Failed to link your guest data. Please try again.");
          } finally {
            setIsLinking(false);
          }
        }
      }
    };

    void linkGuestData();
  }, [session]);

  if (!linkMessage) return null;

  return (
    <div className="fixed top-4 right-4 z-50 rounded-md bg-blue-600 px-4 py-2 text-white shadow-lg">
      <p className="text-sm">
        {isLinking ? "⏳ " : "✅ "}
        {linkMessage}
      </p>
    </div>
  );
}
