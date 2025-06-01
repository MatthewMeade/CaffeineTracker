// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { auth } from "~/auth";
import type { Session } from "next-auth";

// Only mock auth to simulate unauthenticated user
vi.mock("~/auth", () => ({
    auth: vi.fn() as any
}));

describe("GET /api/user/me", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return 401 if user is not authenticated", async () => {
        (auth as any).mockResolvedValue(null);
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
        const mockSession: Session = {
            user: { id: "test-user-id" },
            expires: new Date().toISOString(),
        };
        (auth as any).mockResolvedValue(mockSession);
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
        const mockSession: Session = {
            user: { id: "test-user-id", email: "notfound@example.com" },
            expires: new Date().toISOString(),
        };
        (auth as any).mockResolvedValue(mockSession);
        // Ensure no user with this email exists in the DB
        // (DB is clean between tests)
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
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        const testUser = await prisma.user.create({
            data: {
                email: `testuser-${Date.now()}@example.com`,
                name: 'Test User',
            },
        });
        const mockSession: Session = {
            user: { id: testUser.id, email: testUser.email },
            expires: new Date().toISOString(),
        };
        (auth as any).mockResolvedValue(mockSession);
        const response = await GET();
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data).toEqual({
            id: testUser.id,
            email: testUser.email,
            createdAt: testUser.createdAt.toISOString(),
        });
        await prisma.user.delete({ where: { id: testUser.id } });
        await prisma.$disconnect();
    });
}); 
