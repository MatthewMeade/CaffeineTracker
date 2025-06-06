import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useSession, signIn, signOut } from "next-auth/react";
import { LoginButton } from "~/components/LoginButton";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

describe("LoginButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state when session is loading", () => {
    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });

    render(<LoginButton />);
    expect(screen.getByText("Loading...")).toBeDefined();
  });

  it("should show sign in button when user is not authenticated", () => {
    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<LoginButton />);
    expect(screen.getByText("Sign In")).toBeDefined();
  });

  it("should show user email and sign out button when authenticated", () => {
    const mockSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
      },
      expires: "2024-01-01T00:00:00.000Z",
    };

    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: vi.fn(),
    });

    render(<LoginButton />);
    expect(screen.getByText("test@example.com")).toBeDefined();
    expect(screen.getByText("Sign Out")).toBeDefined();
  });

  it("should call signIn when sign in button is clicked", () => {
    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<LoginButton />);
    const signInButton = screen.getByText("Sign In");
    fireEvent.click(signInButton);
    
    expect(signIn).toHaveBeenCalledWith("email");
  });

  it("should call signOut when sign out button is clicked", () => {
    const mockSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
      },
      expires: "2024-01-01T00:00:00.000Z",
    };

    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: vi.fn(),
    });

    render(<LoginButton />);
    const signOutButton = screen.getByText("Sign Out");
    fireEvent.click(signOutButton);
    
    expect(signOut).toHaveBeenCalled();
  });
});
