import { NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { prisma } from "~/lib/prisma";
import { z } from "zod";


// Validation schema for request body
const setLimitSchema = z.object({
    limit_mg: z.number().nonnegative(),
});

export async function POST(request: Request) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
                { status: 401 }
            );
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json(
                { error: { message: "User not found", code: "USER_NOT_FOUND" } },
                { status: 404 }
            );
        }

        const validationResult = setLimitSchema.safeParse(await request.json());

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: {
                        message: "Invalid request body",
                        code: "INVALID_REQUEST",
                        details: validationResult.error.errors,
                    },
                },
                { status: 400 }
            );
        }

        const { limit_mg } = validationResult.data;

        // Create new daily limit
        const newLimit = await prisma.userDailyLimit.create({
            data: {
                userId: user.id,
                limitMg: limit_mg,
            },
        });

        return NextResponse.json(
            {
                success: true,
                new_limit: {
                    id: newLimit.id,
                    user_id: newLimit.userId,
                    limit_mg: newLimit.limitMg,
                    effective_from: newLimit.effectiveFrom,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error setting daily limit:", error);
        return NextResponse.json(
            { error: { message: "Internal server error", code: "INTERNAL_ERROR" } },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
                { status: 401 }
            );
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json(
                { error: { message: "User not found", code: "USER_NOT_FOUND" } },
                { status: 404 }
            );
        }

        // Get all limits for the user, ordered by effective_from descending
        const limits = await prisma.userDailyLimit.findMany({
            where: { userId: user.id },
            orderBy: { effectiveFrom: 'desc' },
        });

        // Find the current limit (most recent limit that is effective before or at current time)
        const now = new Date();
        const currentLimit = limits.find((limit) => limit.effectiveFrom <= now);

        return NextResponse.json({
            current_limit_mg: currentLimit?.limitMg ?? null,
            history: limits.map((limit) => ({
                limit_mg: limit.limitMg,
                effective_from: limit.effectiveFrom,
            })),
        });
    } catch (error) {
        console.error("Error fetching daily limits:", error);
        return NextResponse.json(
            { error: { message: "Internal server error", code: "INTERNAL_ERROR" } },
            { status: 500 }
        );
    }
} 