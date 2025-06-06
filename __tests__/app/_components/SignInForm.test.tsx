import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { signIn } from "next-auth/react";
import { SignInForm } from "~/app/_components/SignInForm";
import type { SignInResponse } from "next-auth/react";
import React from "react";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form with email input and submit button", () => {
    render(<SignInForm />);
    
    expect(screen.getByLabelText(/email address/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /send magic link/i })).toBeDefined();
  });

  it("handles successful sign in", async () => {
    const mockSignIn = vi.mocked(signIn);
    const mockResponse: SignInResponse = {
      ok: true,
      error: undefined,
      status: 200,
      url: "/",
      code: "success"
    };
    mockSignIn.mockResolvedValueOnce(mockResponse);

    render(<SignInForm />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole("button", { name: /send magic link/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    expect(submitButton.hasAttribute("disabled")).toBe(true);
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
      code: "error"
    };
    mockSignIn.mockResolvedValueOnce(mockResponse);

    render(<SignInForm />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole("button", { name: /send magic link/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/error sending email/i)).toBeDefined();
    });
  });

  it("handles unexpected errors", async () => {
    const mockSignIn = vi.mocked(signIn);
    mockSignIn.mockRejectedValueOnce(new Error("Network error"));

    render(<SignInForm />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole("button", { name: /send magic link/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/an error occurred: network error/i)).toBeDefined();
    });
  });

  it("validates email input", async () => {
    render(<SignInForm />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole("button", { name: /send magic link/i });

    // Test invalid email
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.submit(screen.getByTestId("sign-in-form"));

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeDefined();
    });

    // Test valid email
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.submit(screen.getByTestId("sign-in-form"));
    
    await waitFor(() => {
      expect(screen.queryByText(/please enter a valid email address/i)).toBeNull();
    });
  });
}); 