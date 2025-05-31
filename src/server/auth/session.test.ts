import { describe, it, expect, vi, beforeEach } from "vitest";
import { auth } from "./index";

// Mock NextAuth
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    auth: vi.fn(),
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

// Mock the auth config
vi.mock("./config", () => ({
  authConfig: {},
}));

describe("Server Auth Session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null for unauthenticated users", async () => {
    const mockAuth = vi.mocked(auth);
    mockAuth.mockResolvedValue(null);

    const session = await auth();
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

    const mockAuth = vi.mocked(auth);
    mockAuth.mockResolvedValue(mockSession);

    const session = await auth();
    expect(session).toEqual(mockSession);
    expect(session?.user.id).toBe("user-123");
    expect(session?.user.email).toBe("test@example.com");
  });
});
