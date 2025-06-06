import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "~/app/api/settings/limit/route"
import { auth } from "~/lib/auth";
import { prisma } from "~/lib/prisma";


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
            findMany: vi.fn(),
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

describe("GET /api/settings/limit", () => {
    const mockUser = {
        id: "user-123",
        email: "test@example.com",
    };

    const mockLimits = [
        {
            id: "limit-3",
            userId: mockUser.id,
            limitMg: 300,
            effectiveFrom: new Date("2024-03-01"),
        },
        {
            id: "limit-2",
            userId: mockUser.id,
            limitMg: 200,
            effectiveFrom: new Date("2024-02-01"),
        },
        {
            id: "limit-1",
            userId: mockUser.id,
            limitMg: 100,
            effectiveFrom: new Date("2024-01-01"),
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock Date.now() to return a fixed date
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2024-03-15"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue(null);

        const response = await GET();

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 404 if user not found", async () => {
        vi.mocked(auth).mockResolvedValue({ user: { email: mockUser.email } });
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const response = await GET();

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error.code).toBe("USER_NOT_FOUND");
    });

    it("should return null current limit and empty history for user with no limits", async () => {
        vi.mocked(auth).mockResolvedValue({ user: { email: mockUser.email } });
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(prisma.userDailyLimit.findMany).mockResolvedValue([]);

        const response = await GET();

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.current_limit_mg).toBeNull();
        expect(data.history).toEqual([]);
    });

    it("should return current limit and history for user with multiple limits", async () => {
        vi.mocked(auth).mockResolvedValue({ user: { email: mockUser.email } });
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(prisma.userDailyLimit.findMany).mockResolvedValue(mockLimits);

        const response = await GET();

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.current_limit_mg).toBe(300); // Most recent limit before current date
        expect(data.history).toEqual(mockLimits.map(limit => ({
            limit_mg: limit.limitMg,
            effective_from: limit.effectiveFrom.toISOString(),
        })));
    });
}); 