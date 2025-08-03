import { vi, beforeEach, beforeAll, afterAll } from "vitest";
import "@testing-library/jest-dom";
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

// Mock ResizeObserver for recharts
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Override DATABASE_URL for tests to ensure we don't affect the development database
const testDbName = `test-${process.env.VITEST_POOL_ID ?? 1}.sqlite`;
process.env.DATABASE_URL = `file:${testDbName}?mode=memory`;

// Create test database client
export const testDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ["error", "warn"],
});

// Database setup functions
async function cleanTableData() {
  await testDb.$transaction(async (tx) => {
    await tx.caffeineEntry.deleteMany();
    await tx.userFavorite.deleteMany();
    await tx.userDailyLimit.deleteMany();
    await tx.session.deleteMany();
    await tx.account.deleteMany();
    await tx.verificationToken.deleteMany();
    await tx.user.deleteMany();
  });
}


beforeEach(async () => {
  await cleanTableData();
});

afterAll(async () => {
  await testDb.$disconnect();
});

// Mock NextResponse
declare global {
  // eslint-disable-next-line no-var
  var NextResponse: {
    json: (data: unknown) => { data: unknown };
    error: (message: string) => { error: string };
  };
}

global.NextResponse = {
  json: vi.fn((data: unknown) => ({ data })),
  error: vi.fn((message: string) => ({ error: message })),
};

// Mock auth config
vi.mock("~/server/auth/config", () => ({
  authOptions: {
    providers: [{ id: "email" }, { id: "anonymous" }],
    session: {
      strategy: "jwt",
    },
    pages: {
      signIn: "/auth/signin",
      verifyRequest: "/auth/verify-request",
    },
    callbacks: {
      jwt: vi.fn(
        ({
          token,
          user,
        }: {
          token: { id?: string };
          user?: { id: string };
        }) => {
          if (user) token.id = user.id;
          return token;
        },
      ),
      session: vi.fn(
        ({
          session,
          user,
        }: {
          session: { user?: { id?: string } };
          user: { id: string };
        }) => ({
          ...session,
          user: {
            ...session.user,
            id: user.id,
          },
        }),
      ),
      signIn: vi.fn(() => true),
    },
    adapter: {},
  },
}));

// Mock NextAuth
const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    auth: vi.fn(() => Promise.resolve(mockSession)),
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("~/env.js", () => ({
  env: {
    NODE_ENV: "test",
  },
}));

// Global tRPC mock setup
const mockGetDaily = vi.fn(() => ({
  data: undefined as unknown,
  isLoading: false,
  error: null,
}));

const mockGetLimit = vi.fn(() => ({
  data: undefined as unknown,
  isLoading: false,
  error: null,
}));

const mockGetSuggestions = vi.fn(() => ({
  data: [],
  isLoading: false,
  error: null,
}));

const mockGetAllFavorites = vi.fn(() => ({
  data: [],
  isLoading: false,
  error: null,
}));

const mockGetGraphData = vi.fn(() => ({
  data: undefined as unknown,
  isLoading: false,
  error: null,
}));

const mockCreateMutation = vi.fn(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
}));

const mockUpdateMutation = vi.fn(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
}));

const mockDeleteMutation = vi.fn(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
}));

const mockAddFavoriteMutation = vi.fn(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
}));

const mockRemoveFavoriteMutation = vi.fn(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
}));

const mockUseUtils = vi.fn(() => ({
  entries: {
    getDaily: { invalidate: vi.fn() },
    getSuggestions: { invalidate: vi.fn() },
  },
  favorites: {
    getAll: { invalidate: vi.fn() },
  },
}));

// Global tRPC mock
vi.mock("~/trpc/react", () => ({
  api: {
    entries: {
      getDaily: {
        useQuery: mockGetDaily,
      },
      getSuggestions: {
        useQuery: mockGetSuggestions,
      },
      getGraphData: {
        useQuery: mockGetGraphData,
      },
      create: {
        useMutation: mockCreateMutation,
      },
      update: {
        useMutation: mockUpdateMutation,
      },
      delete: {
        useMutation: mockDeleteMutation,
      },
    },
    settings: {
      getLimit: {
        useQuery: mockGetLimit,
      },
    },
    favorites: {
      getAll: {
        useQuery: mockGetAllFavorites,
      },
      add: {
        useMutation: mockAddFavoriteMutation,
      },
      update: {
        useMutation: mockUpdateMutation,
      },
      remove: {
        useMutation: mockRemoveFavoriteMutation,
      },
    },
    useUtils: mockUseUtils,
  },
  TRPCReactProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Export mock functions for use in tests
export {
  mockGetDaily,
  mockGetLimit,
  mockGetSuggestions,
  mockGetAllFavorites,
  mockGetGraphData,
  mockCreateMutation,
  mockUpdateMutation,
  mockDeleteMutation,
  mockAddFavoriteMutation,
  mockRemoveFavoriteMutation,
  mockUseUtils,
};

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();

  // Reset tRPC mocks to default state
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

  mockGetSuggestions.mockImplementation(() => ({
    data: [],
    isLoading: false,
    error: null,
  }));

  mockGetAllFavorites.mockImplementation(() => ({
    data: [],
    isLoading: false,
    error: null,
  }));

  mockGetGraphData.mockImplementation(() => ({
    data: undefined,
    isLoading: false,
    error: null,
  }));

  mockCreateMutation.mockImplementation(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }));

  mockUpdateMutation.mockImplementation(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }));

  mockDeleteMutation.mockImplementation(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }));

  mockAddFavoriteMutation.mockImplementation(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }));

  mockRemoveFavoriteMutation.mockImplementation(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }));

  mockUseUtils.mockImplementation(() => ({
    entries: {
      getDaily: { invalidate: vi.fn() },
      getSuggestions: { invalidate: vi.fn() },
    },
    favorites: {
      getAll: { invalidate: vi.fn() },
    },
  }));
});
