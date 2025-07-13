import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import HomePage from "~/app/page";

// Mock the auth function
let mockAuth: ReturnType<typeof vi.fn>;
vi.mock("~/auth", () => ({
  get auth() {
    return mockAuth;
  },
}));

// Mock the components
vi.mock("~/app/_components/GuestDataLinker", () => ({
  GuestDataLinker: () => <div data-testid="guest-data-linker">Guest Data Linker</div>,
}));

vi.mock("~/app/_components/AuthenticationWrapper", () => ({
  AuthenticationWrapper: ({ 
    initialDailyData, 
    initialLimitData 
  }: { 
    initialDailyData?: ReactNode; 
    initialLimitData?: ReactNode; 
  }) => (
    <div data-testid="authentication-wrapper">
      Authentication Wrapper
      {initialDailyData !== undefined && <div data-testid="initial-daily-data">Daily Data</div>}
      {initialLimitData !== undefined && <div data-testid="initial-limit-data">Limit Data</div>}
    </div>
  ),
}));

// Mock tRPC caller
let mockCreateCaller: ReturnType<typeof vi.fn>;
vi.mock("~/server/trpc/server", () => ({
  get createCaller() {
    return mockCreateCaller;
  },
}));

describe("HomePage", () => {
  beforeEach(() => {
    mockAuth = vi.fn();
    mockCreateCaller = vi.fn();
  });

  it("renders guest view when no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    mockCreateCaller.mockReturnValueOnce({
      entries: {
        getDaily: vi.fn().mockResolvedValue({ daily_total_mg: 0, entries: [] }),
      },
      settings: {
        getLimit: vi.fn().mockResolvedValue({ current_limit_mg: null }),
      },
    });

    const element = await HomePage();
    const { container } = render(element);

    // Use container to scope the query to this specific render
    const guestDataLinker = container.querySelector('[data-testid="guest-data-linker"]');
    const authWrapper = container.querySelector('[data-testid="authentication-wrapper"]');
    
    expect(guestDataLinker).toBeInTheDocument();
    expect(authWrapper).toBeInTheDocument();
  });

  it("renders authenticated view with initial data when session exists", async () => {
    const mockSession = {
      user: {
        id: "test-user-id",
        email: "test@example.com",
      },
      expires: "2099-01-01T00:00:00.000Z",
    };

    mockAuth.mockResolvedValueOnce(mockSession);
    mockCreateCaller.mockReturnValueOnce({
      entries: {
        getDaily: vi.fn().mockResolvedValue({ daily_total_mg: 100, entries: [] }),
      },
      settings: {
        getLimit: vi.fn().mockResolvedValue({ current_limit_mg: 400 }),
      },
    });

    const element = await HomePage();
    const { container } = render(element);

    // Use container to scope the query to this specific render
    const guestDataLinker = container.querySelector('[data-testid="guest-data-linker"]');
    const authWrapper = container.querySelector('[data-testid="authentication-wrapper"]');
    const dailyData = container.querySelector('[data-testid="initial-daily-data"]');
    const limitData = container.querySelector('[data-testid="initial-limit-data"]');
    
    expect(guestDataLinker).toBeInTheDocument();
    expect(authWrapper).toBeInTheDocument();
    expect(dailyData).toBeInTheDocument();
    expect(limitData).toBeInTheDocument();
  });

  it("handles data fetching errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // Mock implementation to prevent stderr output
    });
    
    const mockSession = {
      user: {
        id: "test-user-id",
        email: "test@example.com",
      },
      expires: "2099-01-01T00:00:00.000Z",
    };

    mockAuth.mockResolvedValueOnce(mockSession);
    mockCreateCaller.mockReturnValueOnce({
      entries: {
        getDaily: vi.fn().mockRejectedValue(new Error("Network error")),
      },
      settings: {
        getLimit: vi.fn().mockRejectedValue(new Error("Network error")),
      },
    });

    const element = await HomePage();
    const { container } = render(element);

    // Use container to scope the query to this specific render
    const guestDataLinker = container.querySelector('[data-testid="guest-data-linker"]');
    const authWrapper = container.querySelector('[data-testid="authentication-wrapper"]');
    const dailyData = container.querySelector('[data-testid="initial-daily-data"]');
    const limitData = container.querySelector('[data-testid="initial-limit-data"]');
    
    expect(guestDataLinker).toBeInTheDocument();
    expect(authWrapper).toBeInTheDocument();
    // Should not have initial data when there's an error
    expect(dailyData).not.toBeInTheDocument();
    expect(limitData).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
