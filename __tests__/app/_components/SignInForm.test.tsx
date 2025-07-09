import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { signIn, useSession } from "next-auth/react";
import { SignInForm } from "~/app/_components/SignInForm";
import type { SignInResponse } from "next-auth/react";
import React from "react";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  useSession: vi.fn(),
}));

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock useSession to return null session (not guest)
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as const);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the form with email input and submit button", () => {
    render(<SignInForm />);

    expect(screen.getByLabelText(/email address/i)).toBeDefined();
    expect(
      screen.getAllByRole("button", { name: /send magic link/i }),
    ).toHaveLength(1);
  });

  it("renders the guest sign-in button", () => {
    render(<SignInForm />);

    expect(
      screen.getAllByRole("button", { name: /continue as guest/i }),
    ).toHaveLength(1);
  });

  it("handles successful sign in", async () => {
    const mockSignIn = vi.mocked(signIn);
    const mockResponse: SignInResponse = {
      ok: true,
      error: undefined,
      status: 200,
      url: "/",
      code: "success",
    };
    mockSignIn.mockResolvedValueOnce(mockResponse);

    render(<SignInForm />);

    const emailInput = screen.getByLabelText(/email address/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    const sendButton = screen.getAllByRole("button", {
      name: /send magic link/i,
    })[0]!;
    expect(sendButton).toBeDefined();
    fireEvent.click(sendButton);

    expect(screen.getByText(/sending/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeDefined();
    });
  });

  it("handles sign in error", async () => {
    const mockSignIn = vi.mocked(signIn);
    const mockResponse: SignInResponse = {
      ok: false,
      error: "Failed to send email",
      status: 400,
      url: "/",
      code: "error",
    };
    mockSignIn.mockResolvedValueOnce(mockResponse);

    render(<SignInForm />);

    const emailInput = screen.getByLabelText(/email address/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    const sendButton = screen.getAllByRole("button", {
      name: /send magic link/i,
    })[0]!;
    expect(sendButton).toBeDefined();
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/error sending email/i)).toBeDefined();
    });
  });

  it("handles successful guest sign in", async () => {
    const mockSignIn = vi.mocked(signIn);
    const mockResponse: SignInResponse = {
      ok: true,
      error: undefined,
      status: 200,
      url: "/",
      code: "success",
    };
    mockSignIn.mockResolvedValueOnce(mockResponse);

    render(<SignInForm />);

    const guestButton = screen.getAllByRole("button", {
      name: /continue as guest/i,
    })[0]!;
    expect(guestButton).toBeDefined();
    fireEvent.click(guestButton);

    expect(screen.getByText(/signing in/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/signed in as guest successfully/i)).toBeDefined();
    });

    expect(mockSignIn).toHaveBeenCalledWith("anonymous", {
      redirect: false,
      callbackUrl: "/",
    });
  });

  it("handles guest sign in error", async () => {
    const mockSignIn = vi.mocked(signIn);
    const mockResponse: SignInResponse = {
      ok: false,
      error: "Failed to sign in as guest",
      status: 400,
      url: "/",
      code: "error",
    };
    mockSignIn.mockResolvedValueOnce(mockResponse);

    render(<SignInForm />);

    const guestButton = screen.getAllByRole("button", {
      name: /continue as guest/i,
    })[0]!;
    expect(guestButton).toBeDefined();
    fireEvent.click(guestButton);

    await waitFor(() => {
      expect(screen.getByText(/error signing in as guest/i)).toBeDefined();
    });
  });
});
