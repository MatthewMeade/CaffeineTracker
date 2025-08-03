import "@testing-library/jest-dom";
import { render, screen, cleanup } from "@testing-library/react";
import { DailyView } from "../../../src/app/_components/DailyView";
import { SessionProvider } from "next-auth/react";
import { vi } from "vitest";
import type { Session } from "next-auth";
import { mockGetDaily, mockGetLimit, mockGetSuggestions, mockGetAllFavorites, mockCreateMutation, mockUseUtils } from "../../../vitest.setup";

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

  afterEach(() => {
    cleanup();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <SessionProvider session={mockSession}>
        {component}
      </SessionProvider>
    );
  };

  it("shows loading state initially", async () => {
    mockGetDaily.mockReturnValue({ 
      data: undefined, 
      isLoading: true, 
      error: null 
    });
    mockGetLimit.mockReturnValue({ 
      data: undefined, 
      isLoading: true, 
      error: null 
    });
    mockGetSuggestions.mockReturnValue({ 
      data: [],
      isLoading: false,
      error: null
    });
    mockGetAllFavorites.mockReturnValue({ 
      data: [],
      isLoading: false,
      error: null
    });
    
    renderWithProviders(<DailyView />);
    expect(screen.getByText(/Loading your daily data/i)).toBeInTheDocument();
  });

  it("renders with empty data for new user", async () => {
    mockGetDaily.mockReturnValue({ 
      isLoading: false, 
      data: { daily_total_mg: 0, entries: [] },
      error: null
    });
    mockGetLimit.mockReturnValue({ 
      isLoading: false, 
      data: { current_limit_mg: null },
      error: null
    });
    mockGetSuggestions.mockReturnValue({ 
      data: [],
      isLoading: false,
      error: null
    });
    mockCreateMutation.mockReturnValue({ 
      mutateAsync: vi.fn(),
      isPending: false
    });
    mockGetAllFavorites.mockReturnValue({ 
      data: [],
      isLoading: false,
      error: null
    });
    mockUseUtils.mockReturnValue({ 
      entries: { 
        getDaily: { invalidate: vi.fn() },
        getSuggestions: { invalidate: vi.fn() }
      },
      favorites: {
        getAll: { invalidate: vi.fn() }
      }
    });
    
    renderWithProviders(<DailyView />);
    expect(screen.getByText("Add a drink to start tracking your timeline")).toBeInTheDocument();
    expect(screen.getByText("0mg")).toBeInTheDocument();
  });

  it("shows same interface for guest users as authenticated users", async () => {
    mockGetDaily.mockReturnValue({ 
      isLoading: false, 
      data: { daily_total_mg: 0, entries: [] },
      error: null
    });
    mockGetLimit.mockReturnValue({ 
      isLoading: false, 
      data: { current_limit_mg: 400 },
      error: null
    });
    mockGetSuggestions.mockReturnValue({ 
      data: [],
      isLoading: false,
      error: null
    });
    mockCreateMutation.mockReturnValue({ 
      mutateAsync: vi.fn(),
      isPending: false
    });
    mockGetAllFavorites.mockReturnValue({ 
      data: [],
      isLoading: false,
      error: null
    });
    mockUseUtils.mockReturnValue({ 
      entries: { 
        getDaily: { invalidate: vi.fn() },
        getSuggestions: { invalidate: vi.fn() }
      },
      favorites: {
        getAll: { invalidate: vi.fn() }
      }
    });
    
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

    // Guest users should see the same interface as authenticated users
    expect(screen.getAllByText("Caffeine Flow")).toHaveLength(1);
    expect(screen.getAllByText("Add a drink to start tracking your timeline")).toHaveLength(1);
    expect(screen.getAllByText("0mg")).toHaveLength(1);
  });
}); 