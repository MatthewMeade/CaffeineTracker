import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";
import { type Session } from "next-auth";

// Mock NextAuth
vi.mock("next-auth", () => ({
    default: vi.fn(() => ({
        auth: vi.fn(),
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
    })),
}));

// Mock the auth module
vi.mock("~/lib/auth", () => ({
    auth: vi.fn(),
}));

// Mock the auth config
vi.mock("~/server/auth/config", () => ({
    authOptions: {
        adapter: {},
        providers: [{ id: "email" }],
        pages: {
            signIn: "/",
            error: "/auth/error",
        },
        callbacks: {
            session: ({ session }: { session: Session }) => session,
        },
    },
}));

// Mock the env module
vi.mock("~/env", () => ({
    env: {
        AUTH_RESEND_KEY: "test-key",
        EMAIL_FROM: "test@example.com",
    },
}));

// Mock the db module
vi.mock("~/server/db", () => ({
    db: {
        user: {
            findUnique: vi.fn(),
        },
    },
}));

describe("GET /api/user/me", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return 401 if user is not authenticated", async () => {
        // Mock unauthenticated session
        vi.mocked(auth).mockResolvedValue(null);

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({
            error: {
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            },
        });
    });

    it("should return 401 if session has no email", async () => {
        // Mock session without email
        const mockSession = {
            user: { id: "user-123" },
            expires: new Date().toISOString(),
        } as Session;
        vi.mocked(auth).mockResolvedValue(mockSession);

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({
            error: {
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            },
        });
    });

    it("should return 404 if user is not found in database", async () => {
        // Mock authenticated session
        const mockSession = {
            user: { id: "user-123", email: "test@example.com" },
            expires: new Date().toISOString(),
        } as Session;
        vi.mocked(auth).mockResolvedValue(mockSession);

        // Mock user not found in database
        vi.mocked(db.user.findUnique).mockResolvedValue(null);

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data).toEqual({
            error: {
                message: "User not found",
                code: "USER_NOT_FOUND",
            },
        });
    });

    it("should return user data if authenticated and found in database", async () => {
        // Mock authenticated session
        const mockSession = {
            user: { id: "user-123", email: "test@example.com" },
            expires: new Date().toISOString(),
        } as Session;
        vi.mocked(auth).mockResolvedValue(mockSession);

        // Mock user found in database
        const mockUser = {
            id: "user-123",
            email: "test@example.com",
            name: null,
            createdAt: new Date("2024-01-01T00:00:00.000Z"),
            updatedAt: new Date("2024-01-01T00:00:00.000Z"),
            emailVerified: null,
            image: null,
        };

        vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({
            id: "user-123",
            email: "test@example.com",
            createdAt: "2024-01-01T00:00:00.000Z",
        });
    });
}); 
