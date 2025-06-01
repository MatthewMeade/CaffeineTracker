import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useSession, signOut } from "next-auth/react";
import { AuthenticatedView } from "./AuthenticatedView";
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

  it("renders welcome message with user email", () => {
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

    expect(screen.getByText(/welcome/i)).toBeDefined();
    expect(screen.getByText("test@example.com")).toBeDefined();
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

    expect(screen.getByText(/welcome/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeDefined();
  });
}); 