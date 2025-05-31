import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useSession, signIn, signOut } from "next-auth/react";
import { LoginButton } from "./LoginButton";

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
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should show sign in button when user is not authenticated", () => {
    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<LoginButton />);
    
    const signInButton = screen.getByText("Sign In");
    expect(signInButton).toBeInTheDocument();
    
    fireEvent.click(signInButton);
    expect(signIn).toHaveBeenCalledWith("email");
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
    
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    
    const signOutButton = screen.getByText("Sign Out");
    expect(signOutButton).toBeInTheDocument();
    
    fireEvent.click(signOutButton);
    expect(signOut).toHaveBeenCalled();
  });

  it("should have correct styling for sign in button", () => {
    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<LoginButton />);
    
    const signInButton = screen.getByText("Sign In");
    expect(signInButton).toHaveClass("rounded", "bg-blue-500", "px-4", "py-2", "text-white", "hover:bg-blue-600");
  });

  it("should have correct styling for sign out button", () => {
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
    expect(signOutButton).toHaveClass("rounded", "bg-red-500", "px-4", "py-2", "text-white", "hover:bg-red-600");
  });
});
