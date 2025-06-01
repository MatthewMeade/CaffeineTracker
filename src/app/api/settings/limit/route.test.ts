import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Mock next-auth
vi.mock("@/lib/auth", () => ({
    auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
        },
        userDailyLimit: {
            create: vi.fn(),
        },
    },
}));

describe("POST /api/settings/limit", () => {
    const mockUser = {
        id: "user-123",
        email: "test@example.com",
    };

    const mockNewLimit = {
        id: "limit-123",
        userId: mockUser.id,
        limitMg: 400,
        effectiveFrom: new Date(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue(null);

        const response = await POST(new Request("http://localhost:3000/api/settings/limit", {
            method: "POST",
            body: JSON.stringify({ limit_mg: 400 }),
        }));

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 for invalid request body", async () => {
        vi.mocked(auth).mockResolvedValue({ user: { email: mockUser.email } });
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

        const response = await POST(new Request("http://localhost:3000/api/settings/limit", {
            method: "POST",
            body: JSON.stringify({ limit_mg: -100 }), // Invalid negative value
        }));

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("should create a new daily limit for valid request", async () => {
        vi.mocked(auth).mockResolvedValue({ user: { email: mockUser.email } });
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(prisma.userDailyLimit.create).mockResolvedValue(mockNewLimit);

        const response = await POST(new Request("http://localhost:3000/api/settings/limit", {
            method: "POST",
            body: JSON.stringify({ limit_mg: 400 }),
        }));

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.new_limit).toEqual({
            id: mockNewLimit.id,
            user_id: mockNewLimit.userId,
            limit_mg: mockNewLimit.limitMg,
            effective_from: mockNewLimit.effectiveFrom.toISOString(),
        });
    });
}); 