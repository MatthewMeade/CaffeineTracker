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

const mockGetGraphData = vi.fn(() => ({
  data: [],
  isLoading: false,
  error: null,
}));

const mockGetAllFavorites = vi.fn(() => ({
  data: [],
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

const mockQueryClient = {
  invalidateQueries: vi.fn(),
};

// Global tRPC mock
vi.mock("~/trpc/react", () => ({
  api: {
    entries: {
      getDaily: {
        queryOptions: vi.fn(() => ({ queryKey: ["entries", "getDaily"] })),
        queryFilter: vi.fn(() => ({ queryKey: ["entries", "getDaily"] })),
      },
      getSuggestions: {
        queryOptions: vi.fn(() => ({ queryKey: ["entries", "getSuggestions"] })),
        queryFilter: vi.fn(() => ({ queryKey: ["entries", "getSuggestions"] })),
      },
      getGraphData: {
        queryOptions: vi.fn(() => ({ queryKey: ["entries", "getGraphData"] })),
        queryFilter: vi.fn(() => ({ queryKey: ["entries", "getGraphData"] })),
      },
      create: {
        mutationOptions: vi.fn(() => ({ mutationKey: ["entries", "create"] })),
      },
      update: {
        mutationOptions: vi.fn(() => ({ mutationKey: ["entries", "update"] })),
      },
      delete: {
        mutationOptions: vi.fn(() => ({ mutationKey: ["entries", "delete"] })),
      },
    },
    settings: {
      getLimit: {
        queryOptions: vi.fn(() => ({ queryKey: ["settings", "getLimit"] })),
        queryFilter: vi.fn(() => ({ queryKey: ["settings", "getLimit"] })),
      },
    },
    favorites: {
      getAll: {
        queryOptions: vi.fn(() => ({ queryKey: ["favorites", "getAll"] })),
        queryFilter: vi.fn(() => ({ queryKey: ["favorites", "getAll"] })),
      },
      add: {
        mutationOptions: vi.fn(() => ({ mutationKey: ["favorites", "add"] })),
      },
      update: {
        mutationOptions: vi.fn(() => ({ mutationKey: ["favorites", "update"] })),
      },
      remove: {
        mutationOptions: vi.fn(() => ({ mutationKey: ["favorites", "remove"] })),
      },
    },
  },
  useTRPC: vi.fn(() => ({
    entries: {
      getDaily: {
        queryOptions: vi.fn(() => ({ queryKey: ["entries", "getDaily"] })),
        queryFilter: vi.fn(() => ({ queryKey: ["entries", "getDaily"] })),
      },
      getSuggestions: {
        queryOptions: vi.fn(() => ({ queryKey: ["entries", "getSuggestions"] })),
        queryFilter: vi.fn(() => ({ queryKey: ["entries", "getSuggestions"] })),
      },
      getGraphData: {
        queryOptions: vi.fn(() => ({ queryKey: ["entries", "getGraphData"] })),
        queryFilter: vi.fn(() => ({ queryKey: ["entries", "getGraphData"] })),
      },
      create: {
        mutationOptions: vi.fn(() => ({ mutationKey: ["entries", "create"] })),
      },
      update: {
        mutationOptions: vi.fn(() => ({ mutationKey: ["entries", "update"] })),
      },
      delete: {
        mutationOptions: vi.fn(() => ({ mutationKey: ["entries", "delete"] })),
      },
    },
    settings: {
      getLimit: {
        queryOptions: vi.fn(() => ({ queryKey: ["settings", "getLimit"] })),
        queryFilter: vi.fn(() => ({ queryKey: ["settings", "getLimit"] })),
      },
    },
    favorites: {
      getAll: {
        queryOptions: vi.fn(() => ({ queryKey: ["favorites", "getAll"] })),
        queryFilter: vi.fn(() => ({ queryKey: ["favorites", "getAll"] })),
      },
      add: {
        mutationOptions: vi.fn(() => ({ mutationKey: ["favorites", "add"] })),
      },
      update: {
        mutationOptions: vi.fn(() => ({ mutationKey: ["favorites", "update"] })),
      },
      remove: {
        mutationOptions: vi.fn(() => ({ mutationKey: ["favorites", "remove"] })),
      },
    },
  })),
  TRPCReactProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock useQueryClient
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: vi.fn(() => mockQueryClient),
  };
});

// Export mock functions for use in tests
export {
  mockGetDaily,
  mockGetLimit,
  mockGetSuggestions,
  mockGetGraphData,
  mockGetAllFavorites,
  mockCreateMutation,
  mockUpdateMutation,
  mockDeleteMutation,
  mockAddFavoriteMutation,
  mockRemoveFavoriteMutation,
  mockQueryClient,
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
    data: [],
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

  mockQueryClient.invalidateQueries.mockImplementation(() => ({
    invalidateQueries: vi.fn(),
  }));
});
