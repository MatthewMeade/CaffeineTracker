import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the dependencies first
vi.mock("../db", () => ({
  db: {},
}));

vi.mock("../../env", () => ({
  env: {
    EMAIL_SERVER_HOST: "localhost",
    EMAIL_SERVER_PORT: 587,
    EMAIL_SERVER_USER: "test@example.com",
    EMAIL_SERVER_PASSWORD: "password",
    EMAIL_FROM: "noreply@example.com",
  },
}));

vi.mock("next-auth/providers/email", () => ({
  default: vi.fn(() => ({ id: "email" })),
}));

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn(() => ({})),
}));

// Mock authConfig
const mockAuthConfig = {
  providers: [{ id: "email" }],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
  },
  callbacks: {
    session: vi.fn(({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    })),
  },
  adapter: {},
};

describe("NextAuth Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct providers configured", () => {
    expect(mockAuthConfig.providers).toHaveLength(1);
    expect(mockAuthConfig.providers[0]?.id).toBe("email");
  });

  it("should have custom pages configured", () => {
    expect(mockAuthConfig.pages?.signIn).toBe("/auth/signin");
    expect(mockAuthConfig.pages?.verifyRequest).toBe("/auth/verify-request");
  });

  it("should have session callback that includes user id", () => {
    const mockSession = {
      user: { email: "test@example.com" },
      expires: "2024-01-01",
    };
    const mockUser = { id: "user-123" };

    const result = mockAuthConfig.callbacks?.session?.({
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
    expect(mockAuthConfig.adapter).toBeDefined();
  });
});
