import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useSession, signOut } from "next-auth/react";
import { AuthenticatedView } from "~/app/_components/AuthenticatedView";
import type { Session } from "next-auth";
import React from "react";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

describe("AuthenticatedView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dashboard for authenticated user", () => {
    const mockSession: Session = {
      user: {
        id: "user-123",
        email: "test@example.com",
      },
      expires: "2024-01-01T00:00:00.000Z",
    };

    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: vi.fn(),
    });

    render(<AuthenticatedView />);

    expect(screen.getByText("Caffeine Tracker")).toBeDefined();
    expect(
      screen.getByText("Welcome to your caffeine tracking dashboard!"),
    ).toBeDefined();
    expect(
      screen.getByText("Your data is being saved automatically."),
    ).toBeDefined();
  });

  it("handles sign out", async () => {
    const mockSession: Session = {
      user: {
        id: "user-123",
        email: "test@example.com",
      },
      expires: "2024-01-01T00:00:00.000Z",
    };

    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: vi.fn(),
    });

    const mockSignOut = vi.mocked(signOut);
    mockSignOut.mockResolvedValueOnce(undefined);

    render(<AuthenticatedView />);

    const signOutButton = screen.getByRole("button", { name: /sign out/i });
    fireEvent.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });

  it("handles missing user data gracefully", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<AuthenticatedView />);

    expect(screen.getByText("Caffeine Tracker")).toBeDefined();
    expect(
      screen.getByText("Welcome to your caffeine tracking dashboard!"),
    ).toBeDefined();
  });
});
