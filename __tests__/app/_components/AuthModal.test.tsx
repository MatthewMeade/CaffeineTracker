import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AuthModal } from "~/app/_components/AuthModal";
import type { SignInResponse } from "next-auth/react";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
}));

const mockSignIn = vi.mocked(await import("next-auth/react")).signIn;

describe("AuthModal", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(<AuthModal isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByText("Sign In or Sign Up")).not.toBeInTheDocument();
  });

  it("renders initial step when isOpen is true", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("Sign In or Sign Up")).toBeInTheDocument();
    expect(screen.getByText("Enter your email to receive a magic link to sign in. No password required.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send magic link/i })).toBeInTheDocument();
  });

  it("validates email format", async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    const emailInput = screen.getByPlaceholderText("Enter your email");
    const submitButton = screen.getByRole("button", { name: /send magic link/i });

    // Test invalid email
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    });

    // Test valid email
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    expect(screen.queryByText("Please enter a valid email address")).not.toBeInTheDocument();
  });

  it("calls signIn with correct parameters when form is submitted", async () => {
    mockSignIn.mockResolvedValue({ 
      error: undefined,
      ok: true,
      status: 200,
      url: "/"
    } as SignInResponse);

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    const emailInput = screen.getByPlaceholderText("Enter your email");
    const submitButton = screen.getByRole("button", { name: /send magic link/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("email", {
        email: "test@example.com",
        redirect: false,
        callbackUrl: "/",
      });
    });
  });

  it("shows confirmation step after successful signIn", async () => {
    mockSignIn.mockResolvedValue({ 
      error: undefined,
      ok: true,
      status: 200,
      url: "/"
    } as SignInResponse);

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    const emailInput = screen.getByPlaceholderText("Enter your email");
    const submitButton = screen.getByRole("button", { name: /send magic link/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Magic Link Sent!")).toBeInTheDocument();
      expect(screen.getByText("Please check your email to continue. The link will expire in 15 minutes.")).toBeInTheDocument();
      expect(screen.getByText("Sent to:")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });

  it("shows error message when signIn fails", async () => {
    mockSignIn.mockResolvedValue({ 
      error: "Failed to send email",
      ok: false,
      status: 400,
      url: "/"
    } as SignInResponse);

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    const emailInput = screen.getByPlaceholderText("Enter your email");
    const submitButton = screen.getByRole("button", { name: /send magic link/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Error sending email: Failed to send email")).toBeInTheDocument();
    });
  });

  it("allows going back from confirmation to initial step", async () => {
    mockSignIn.mockResolvedValue({ 
      error: undefined,
      ok: true,
      status: 200,
      url: "/"
    } as SignInResponse);

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    // First, get to confirmation step
    const emailInput = screen.getByPlaceholderText("Enter your email");
    const submitButton = screen.getByRole("button", { name: /send magic link/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Magic Link Sent!")).toBeInTheDocument();
    });

    // Click back button
    const backButton = screen.getByRole("button", { name: /back/i });
    fireEvent.click(backButton);

    expect(screen.getByText("Sign In or Sign Up")).toBeInTheDocument();
    expect(screen.queryByText("Magic Link Sent!")).not.toBeInTheDocument();
  });

  it("calls onClose when Done button is clicked", async () => {
    mockSignIn.mockResolvedValue({ 
      error: undefined,
      ok: true,
      status: 200,
      url: "/"
    } as SignInResponse);

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    // First, get to confirmation step
    const emailInput = screen.getByPlaceholderText("Enter your email");
    const submitButton = screen.getByRole("button", { name: /send magic link/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Magic Link Sent!")).toBeInTheDocument();
    });

    // Click Done button
    const doneButton = screen.getByRole("button", { name: /done/i });
    fireEvent.click(doneButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking outside the modal", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    // Click on the backdrop (outside the modal)
    const backdrop = screen.getByRole("button", { name: /send magic link/i }).closest("div")?.parentElement;
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("supports Enter key to submit form", async () => {
    mockSignIn.mockResolvedValue({ 
      error: undefined,
      ok: true,
      status: 200,
      url: "/"
    } as SignInResponse);

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    const emailInput = screen.getByPlaceholderText("Enter your email");

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.keyDown(emailInput, { key: "Enter" });

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("email", {
        email: "test@example.com",
        redirect: false,
        callbackUrl: "/",
      });
    });
  });

  it("disables submit button when email is invalid", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    const emailInput = screen.getByPlaceholderText("Enter your email");
    const submitButton = screen.getByRole("button", { name: /send magic link/i });

    // Initially disabled (no email)
    expect(submitButton).toBeDisabled();

    // Still disabled with invalid email
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    expect(submitButton).toBeDisabled();

    // Enabled with valid email
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    expect(submitButton).not.toBeDisabled();
  });

  it("clears error when email is changed", async () => {
    mockSignIn.mockResolvedValue({ 
      error: "Failed to send email",
      ok: false,
      status: 400,
      url: "/"
    } as SignInResponse);

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    const emailInput = screen.getByPlaceholderText("Enter your email");
    const submitButton = screen.getByRole("button", { name: /send magic link/i });

    // First, trigger an error
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Error sending email: Failed to send email")).toBeInTheDocument();
    });

    // Change email to clear error
    fireEvent.change(emailInput, { target: { value: "new@example.com" } });

    expect(screen.queryByText("Error sending email: Failed to send email")).not.toBeInTheDocument();
  });
}); 