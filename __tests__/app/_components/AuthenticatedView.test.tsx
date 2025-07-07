import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthenticatedView } from "~/app/_components/AuthenticatedView";
import React from "react";

// Mock the DailyView component
vi.mock("~/app/_components/DailyView", () => ({
  DailyView: () => (
    <div data-testid="daily-view">
      <h1>Caffeine Tracker</h1>
      <p>Welcome to your caffeine tracking dashboard!</p>
      <p>Your data is being saved automatically.</p>
    </div>
  ),
}));

// Mock tRPC context
vi.mock("~/trpc/react", () => ({
  api: {
    entries: {
      getDaily: {
        useQuery: vi.fn().mockReturnValue({ isLoading: false, data: { daily_total_mg: 0, entries: [] } }),
      },
    },
    settings: {
      getLimit: {
        useQuery: vi.fn().mockReturnValue({ isLoading: false, data: { current_limit_mg: null } }),
      },
    },
  },
  TRPCReactProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("AuthenticatedView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dashboard for authenticated user", () => {
    render(<AuthenticatedView />);

    expect(screen.getByText("Caffeine Tracker")).toBeDefined();
    expect(
      screen.getByText("Welcome to your caffeine tracking dashboard!"),
    ).toBeDefined();
    expect(
      screen.getByText("Your data is being saved automatically."),
    ).toBeDefined();
  });

  it("renders DailyView component", () => {
    render(<AuthenticatedView />);
    expect(screen.getByTestId("daily-view")).toBeDefined();
  });
});
