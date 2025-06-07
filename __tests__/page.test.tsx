import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import HomePage from "~/app/page";


// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock the SignInForm component
vi.mock("~/app/_components/SignInForm", () => ({
  SignInForm: () => <div data-testid="sign-in-form">Sign In Form</div>,
}));

// Mock the AuthenticatedView component
vi.mock("~/app/_components/AuthenticatedView", () => ({
  AuthenticatedView: () => <div data-testid="authenticated-view">Authenticated View</div>,
}));

describe("HomePage", () => {
  const mockUpdate = vi.fn();

  it("shows loading state", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "loading",
      update: mockUpdate,
    } as const);

    render(<HomePage />);
    expect(screen.getByText("Loading...")).toBeDefined();
  });

  it("shows sign in form when not authenticated", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: mockUpdate,
    } as const);

    render(<HomePage />);
    expect(screen.getByText("Sign In")).toBeDefined();
    expect(screen.getByText("Enter your email to receive a magic link")).toBeDefined();
    expect(screen.getByTestId("sign-in-form")).toBeDefined();
  });

  it("shows authenticated view when signed in", () => {
    const mockSession: Session = {
      user: {
        id: "test-user-id",
        email: "test@example.com",
      },
      expires: new Date().toISOString(),
    };

    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: mockUpdate,
    } as const);

    render(<HomePage />);
    expect(screen.getByTestId("authenticated-view")).toBeDefined();
  });
}); 