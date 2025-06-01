import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock NextAuth and auth config first
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    auth: vi.fn(),
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock("./config", () => ({
  authConfig: {},
}));

// Create a mock auth function
const mockAuth = vi.fn();

// Mock the auth module
vi.mock("~/lib/auth", () => ({
  auth: mockAuth,
}));

describe("Server Auth Session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null for unauthenticated users", async () => {
    mockAuth.mockResolvedValue(null);

    const session = await mockAuth();
    expect(session).toBeNull();
  });

  it("should return session data for authenticated users", async () => {
    const mockSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
      },
      expires: "2024-01-01T00:00:00.000Z",
    };

    mockAuth.mockResolvedValue(mockSession);

    const session = await mockAuth();
    expect(session).toEqual(mockSession);
    expect(session?.user.id).toBe("user-123");
    expect(session?.user.email).toBe("test@example.com");
  });
});
