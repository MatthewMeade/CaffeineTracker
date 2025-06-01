import { NextResponse } from "next/server";
import { auth } from "~/auth";
import { db } from "~/server/db";

export async function GET() {
    const session = await auth();

    if (!session?.user?.email) {
        return NextResponse.json(
            {
                error: {
                    message: "Unauthorized",
                    code: "UNAUTHORIZED",
                },
            },
            { status: 401 },
        );
    }

    const user = await db.user.findUnique({
        where: { email: session.user.email },
        select: {
            id: true,
            email: true,
            createdAt: true,
        },
    });

    if (!user) {
        return NextResponse.json(
            {
                error: {
                    message: "User not found",
                    code: "USER_NOT_FOUND",
                },
            },
            { status: 404 },
        );
    }

    return NextResponse.json(user);
} 