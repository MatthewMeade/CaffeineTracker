import { vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";

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

const mockCreateMutation = vi.fn(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
}));

const mockUseUtils = vi.fn(() => ({
  entries: {
    getDaily: { invalidate: vi.fn() },
    getSuggestions: { invalidate: vi.fn() },
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
      create: {
        useMutation: mockCreateMutation,
      },
    },
    settings: {
      getLimit: {
        useQuery: mockGetLimit,
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
  mockCreateMutation,
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

  mockCreateMutation.mockImplementation(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }));

  mockUseUtils.mockImplementation(() => ({
    entries: {
      getDaily: { invalidate: vi.fn() },
      getSuggestions: { invalidate: vi.fn() },
    },
  }));
});
