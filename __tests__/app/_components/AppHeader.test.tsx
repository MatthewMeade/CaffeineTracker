import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
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

const mockUseSession = vi.mocked(await import("next-auth/react")).useSession;
const mockSignOut = vi.mocked(await import("next-auth/react")).signOut;

describe("AppHeader", () => {
  const mockOnSignInClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Caffeine Flow title", () => {
    mockUseSession.mockReturnValue({
      data: { 
        user: { id: "guest-1", isGuest: true },
        expires: "2024-12-31"
      },
      status: "authenticated",
    });

    render(<AppHeader onSignInClick={mockOnSignInClick} />);

    expect(screen.getByText("Caffeine Flow")).toBeInTheDocument();
    expect(screen.getByText("Track your daily energy")).toBeInTheDocument();
  });

  it("renders Sign In button for guest users", () => {
    mockUseSession.mockReturnValue({
      data: { 
        user: { id: "guest-2", isGuest: true },
        expires: "2024-12-31"
      },
      status: "authenticated",
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
    });

    render(<AppHeader onSignInClick={mockOnSignInClick} />);

    // Should not show Sign In button
    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();

    // Should show user icon button
    const userButton = screen.getByRole("button");
    expect(userButton).toBeInTheDocument();
    expect(userButton.querySelector("svg")).toBeInTheDocument(); // User icon
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
    });

    render(<AppHeader onSignInClick={mockOnSignInClick} />);

    const userButton = screen.getByRole("button");
    fireEvent.click(userButton);

    // Wait for dropdown to open and content to be rendered
    await screen.findByText("Signed in as");
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
    });

    render(<AppHeader onSignInClick={mockOnSignInClick} />);

    const userButton = screen.getByRole("button");
    fireEvent.click(userButton);

    // Wait for dropdown to open
    const signOutButton = await screen.findByRole("button", { name: /sign out/i });
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
    });

    render(<AppHeader onSignInClick={mockOnSignInClick} />);

    const userButton = screen.getByRole("button");
    fireEvent.click(userButton);

    // Wait for dropdown to open
    await screen.findByText("Signed in as");
    expect(screen.getByText("User")).toBeInTheDocument(); // Fallback text
  });
}); 