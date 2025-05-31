import { describe, it, expect, vi, beforeEach } from "vitest";
import { authConfig } from "./config";

// Mock the dependencies
vi.mock("~/server/db", () => ({
  db: {},
}));

vi.mock("~/env", () => ({
  env: {
    EMAIL_SERVER_HOST: "localhost",
    EMAIL_SERVER_PORT: 587,
    EMAIL_SERVER_USER: "test@example.com",
    EMAIL_SERVER_PASSWORD: "password",
    EMAIL_FROM: "noreply@example.com",
  },
}));

describe("NextAuth Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct providers configured", () => {
    expect(authConfig.providers).toHaveLength(1);
    expect(authConfig.providers[0]?.id).toBe("email");
  });

  it("should have custom pages configured", () => {
    expect(authConfig.pages?.signIn).toBe("/auth/signin");
    expect(authConfig.pages?.verifyRequest).toBe("/auth/verify-request");
  });

  it("should have session callback that includes user id", () => {
    const mockSession = {
      user: { email: "test@example.com" },
      expires: "2024-01-01",
    };
    const mockUser = { id: "user-123" };

    const result = authConfig.callbacks?.session?.({
      session: mockSession,
      user: mockUser,
      token: {},
    });

    expect(result).toEqual({
      ...mockSession,
      user: {
        ...mockSession.user,
        id: "user-123",
      },
    });
  });

  it("should have PrismaAdapter configured", () => {
    expect(authConfig.adapter).toBeDefined();
  });
});
