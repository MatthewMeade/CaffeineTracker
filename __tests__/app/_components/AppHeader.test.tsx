import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import React, { useState } from "react";
import { AppHeader } from "~/app/_components/AppHeader";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
}));

// Mock shadcn/ui dropdown components
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => 
    asChild ? children : <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children, align }: { children: React.ReactNode; align?: string }) => 
    <div data-testid="dropdown-content" data-align={align}>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => 
    <button data-testid="dropdown-item" onClick={onClick}>{children}</button>,
}));

const mockUseSession = vi.mocked(await import("next-auth/react")).useSession;
const mockSignOut = vi.mocked(await import("next-auth/react")).signOut;

describe("AppHeader", () => {
  const mockOnSignInClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the lesspresso title", () => {
    mockUseSession.mockReturnValue({
      data: { 
        user: { id: "guest-1", isGuest: true },
        expires: "2024-12-31"
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<AppHeader onSignInClick={mockOnSignInClick} />);

    expect(screen.getByText("lesspresso")).toBeInTheDocument();
    expect(screen.getByText("Track your daily caffeine")).toBeInTheDocument();
  });

  it("renders Sign In button for guest users", () => {
    mockUseSession.mockReturnValue({
      data: { 
        user: { id: "guest-2", isGuest: true },
        expires: "2024-12-31"
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<AppHeader onSignInClick={mockOnSignInClick} />);

    const signInButton = screen.getByRole("button", { name: /sign in/i });
    expect(signInButton).toBeInTheDocument();

    fireEvent.click(signInButton);
    expect(mockOnSignInClick).toHaveBeenCalledTimes(1);
  });

  it("renders user dropdown menu for authenticated users", () => {
    mockUseSession.mockReturnValue({
      data: { 
        user: { 
          id: "user-1",
          isGuest: false, 
          email: "test@example.com" 
        },
        expires: "2024-12-31"
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<AppHeader onSignInClick={mockOnSignInClick} />);

    // Should not show Sign In button
    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();

    // Should show user icon button and dropdown content
    const userButtons = screen.getAllByRole("button");
    const userButton = userButtons.find(button => button.querySelector("svg"));
    expect(userButton).toBeInTheDocument();
    expect(userButton?.querySelector("svg")).toBeInTheDocument(); // User icon
    
    // Check that dropdown content is rendered (always visible in mock)
    expect(screen.getByText("Signed in as")).toBeInTheDocument();
  });

  it("shows user email in dropdown when user is authenticated", async () => {
    mockUseSession.mockReturnValue({
      data: { 
        user: { 
          id: "user-2",
          isGuest: false, 
          email: "test@example.com" 
        },
        expires: "2024-12-31"
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<AppHeader onSignInClick={mockOnSignInClick} />);

    // Check that dropdown content is rendered with user info (always visible in mock)
    expect(screen.getByText("Signed in as")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("calls signOut when Sign Out is clicked", async () => {
    mockUseSession.mockReturnValue({
      data: { 
        user: { 
          id: "user-3",
          isGuest: false, 
          email: "test@example.com" 
        },
        expires: "2024-12-31"
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<AppHeader onSignInClick={mockOnSignInClick} />);

    // Find and click the sign out button (always visible in mock)
    const signOutButton = screen.getByRole("button", { name: /sign out/i });
    fireEvent.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("handles missing user email gracefully", async () => {
    mockUseSession.mockReturnValue({
      data: { 
        user: { 
          id: "user-4",
          isGuest: false, 
          email: null 
        },
        expires: "2024-12-31"
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<AppHeader onSignInClick={mockOnSignInClick} />);

    // Check that dropdown content is rendered with fallback text (always visible in mock)
    expect(screen.getByText("Signed in as")).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument(); // Fallback text
  });
}); 