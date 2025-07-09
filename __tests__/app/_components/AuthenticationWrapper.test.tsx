import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { useSession, signIn } from "next-auth/react";
import { AuthenticationWrapper } from "~/app/_components/AuthenticationWrapper";
import type { Session } from "next-auth";
import type { DailyEntriesApiResponse, DailyLimitApiResponse } from "~/types/api";
import React from "react";
import { mockGetDaily, mockGetLimit } from "../../../vitest.setup";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
}));

// Mock the child components
vi.mock("~/app/_components/DailyView", () => ({
  DailyView: ({ initialDailyData, initialLimitData }: {
    initialDailyData?: DailyEntriesApiResponse;
    initialLimitData?: DailyLimitApiResponse;
  }) => (
    <div data-testid="daily-view">
      DailyView Component
      {initialDailyData && <div data-testid="initial-daily-data">Has Daily Data</div>}
      {initialLimitData && <div data-testid="initial-limit-data">Has Limit Data</div>}
    </div>
  ),
}));

describe("AuthenticationWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDaily.mockImplementation(() => ({
      data: undefined,
      isLoading: false,
      error: null,
    }));
    mockGetLimit.mockImplementation(() => ({
      data: undefined,
      isLoading: false,
      error: null,
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading state when session status is loading", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    } as const);

    render(<AuthenticationWrapper />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("attempts automatic anonymous sign-in when unauthenticated", async () => {
    const mockSignIn = vi.mocked(signIn);
    mockSignIn.mockResolvedValueOnce({
      ok: true,
      error: undefined,
      status: 200,
      url: "/",
      code: "success",
    });

    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as const);

    render(<AuthenticationWrapper />);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("anonymous", { redirect: false });
    });
  });

  it("shows loading state when unauthenticated and waiting for session", async () => {
    const mockSignIn = vi.mocked(signIn);
    mockSignIn.mockRejectedValueOnce(new Error("Sign-in failed"));

    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as const);

    render(<AuthenticationWrapper />);

    // Should show loading state while attempting to establish session
    await waitFor(() => {
      expect(screen.getAllByText("Setting up your session...")).toHaveLength(1);
    });
  });

  it("shows DailyView when user has a session", () => {
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
    } as const);

    render(<AuthenticationWrapper />);

    expect(screen.getByTestId("daily-view")).toBeInTheDocument();
  });

  it("passes initial data to DailyView when provided", () => {
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
    } as const);

    const mockDailyData: DailyEntriesApiResponse = {
      entries: [],
      daily_total_mg: 0,
      over_limit: false,
      daily_limit_mg: 400,
    };
    const mockLimitData: DailyLimitApiResponse = {
      current_limit_mg: 400,
      history: [],
    };

    mockGetDaily.mockImplementation(() => ({
      data: mockDailyData,
      isLoading: false,
      error: null,
    }));
    mockGetLimit.mockImplementation(() => ({
      data: mockLimitData,
      isLoading: false,
      error: null,
    }));

    render(
      <AuthenticationWrapper 
        initialDailyData={mockDailyData}
        initialLimitData={mockLimitData}
      />
    );

    expect(screen.getAllByTestId("daily-view")).toHaveLength(1);
    expect(screen.getAllByTestId("initial-daily-data")).toHaveLength(1);
    expect(screen.getAllByTestId("initial-limit-data")).toHaveLength(1);
  });

  it("only attempts automatic sign-in once", async () => {
    const mockSignIn = vi.mocked(signIn);
    mockSignIn.mockResolvedValueOnce({
      ok: true,
      error: undefined,
      status: 200,
      url: "/",
      code: "success",
    });

    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as const);

    render(<AuthenticationWrapper />);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });

    // Verify it's not called again
    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });

  it("logs error when automatic sign-in fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // Mock implementation
    });
    const mockSignIn = vi.mocked(signIn);
    const error = new Error("Network error");
    mockSignIn.mockRejectedValueOnce(error);

    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as const);

    render(<AuthenticationWrapper />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Automatic anonymous sign-in failed:", error);
    });

    consoleSpy.mockRestore();
  });
}); 