import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { DailyView } from "../../../src/app/_components/DailyView";
import { SessionProvider } from "next-auth/react";
import { vi } from "vitest";
import type { Session } from "next-auth";

// Mock the tRPC module
vi.mock("../../../src/trpc/react", () => ({
  api: {
    entries: {
      getDaily: {
        useQuery: vi.fn(),
      },
    },
    settings: {
      getLimit: {
        useQuery: vi.fn(),
      },
    },
  },
  TRPCReactProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock NextAuth session
const mockSession: Session = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    isGuest: false,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

describe("DailyView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <SessionProvider session={mockSession}>
        {component}
      </SessionProvider>
    );
  };

  it("shows loading state initially", async () => {
    const { api } = await import("../../../src/trpc/react");
    api.entries.getDaily.useQuery.mockReturnValue({ isLoading: true });
    api.settings.getLimit.useQuery.mockReturnValue({ isLoading: true });
    
    renderWithProviders(<DailyView />);
    expect(screen.getByText(/Loading your daily data/i)).toBeInTheDocument();
  });

  it("renders with empty data for new user", async () => {
    const { api } = await import("../../../src/trpc/react");
    api.entries.getDaily.useQuery.mockReturnValue({ 
      isLoading: false, 
      data: { daily_total_mg: 0, entries: [] } 
    });
    api.settings.getLimit.useQuery.mockReturnValue({ 
      isLoading: false, 
      data: { current_limit_mg: null } 
    });
    
    renderWithProviders(<DailyView />);
    expect(screen.getByText("Add a drink to start tracking your timeline")).toBeInTheDocument();
    expect(screen.getByText("0mg")).toBeInTheDocument();
  });

  it("shows guest sign-in form for guest users", async () => {
    const { api } = await import("../../../src/trpc/react");
    api.entries.getDaily.useQuery.mockReturnValue({ isLoading: false, data: undefined });
    api.settings.getLimit.useQuery.mockReturnValue({ isLoading: false, data: undefined });
    
    const guestSession: Session = {
      ...mockSession,
      user: {
        ...mockSession.user,
        isGuest: true,
      },
    };

    render(
      <SessionProvider session={guestSession}>
        <DailyView />
      </SessionProvider>
    );

    expect(screen.getByText(/Sign in to save your data permanently/i)).toBeInTheDocument();
  });
}); 