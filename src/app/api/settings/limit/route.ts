import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

        // Parse and validate request body
        const body = await request.json();
        const validationResult = setLimitSchema.safeParse(body);

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