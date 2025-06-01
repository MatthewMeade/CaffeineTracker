import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "~/auth";
import { db } from "~/server/db";
import { type CaffeineEntry, type Drink } from "@prisma/client";

// Schema for query parameters
const querySchema = z.object({
    offset: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

type EntryWithDrink = CaffeineEntry & {
    drink: Pick<Drink, "name"> | null;
};

type EntriesByDay = {
    [date: string]: EntryWithDrink[];
};

export async function GET(request: Request) {
    try {
        // Get authenticated user
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
                { status: 401 }
            );
        }

        // Parse and validate query parameters
        const { searchParams } = new URL(request.url);
        const queryResult = querySchema.safeParse({
            offset: searchParams.get("offset"),
            limit: searchParams.get("limit"),
        });

        if (!queryResult.success) {
            return NextResponse.json(
                {
                    error: {
                        message: "Invalid query parameters",
                        code: "INVALID_QUERY",
                        details: queryResult.error.format(),
                    },
                },
                { status: 400 }
            );
        }

        const { offset, limit } = queryResult.data;

        // Fetch entries with pagination
        const entries = await db.caffeineEntry.findMany({
            where: {
                userId: session.user.id,
            },
            include: {
                drink: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                consumedAt: "desc",
            },
            skip: offset,
            take: limit + 1, // Fetch one extra to determine if there are more entries
        });

        // Check if there are more entries
        const hasMore = entries.length > limit;
        const entriesToReturn = hasMore ? entries.slice(0, limit) : entries;

        // Group entries by date
        const entriesByDay = entriesToReturn.reduce<EntriesByDay>(
            (acc, entry) => {
                let consumedAtDate: Date;
                if (entry.consumedAt instanceof Date && !isNaN(entry.consumedAt.getTime())) {
                    consumedAtDate = entry.consumedAt;
                } else {
                    consumedAtDate = new Date(entry.consumedAt);
                }
                if (isNaN(consumedAtDate.getTime())) {
                    // Skip invalid dates
                    return acc;
                }
                const dateParts = consumedAtDate.toISOString().split("T");
                if (!dateParts[0] || typeof dateParts[0] !== "string" || dateParts[0].length !== 10) {
                    return acc;
                }
                const date = dateParts[0];
                if (!acc[date]) {
                    acc[date] = [];
                }
                acc[date].push(entry);
                return acc;
            },
            {}
        );

        // Sort entries within each day by consumedAt (descending)
        Object.keys(entriesByDay).forEach(date => {
            const entries = entriesByDay[date];
            if (entries) {
                entries.sort((a, b) => {
                    const timeA = new Date(a.consumedAt).getTime();
                    const timeB = new Date(b.consumedAt).getTime();
                    return timeB - timeA; // descending order
                });
            }
        });

        return NextResponse.json({
            entries_by_day: entriesByDay,
            has_more: hasMore,
        });
    } catch (error) {
        console.error("Error fetching caffeine history:", error);
        return NextResponse.json(
            { error: { message: "Internal server error", code: "INTERNAL_ERROR" } },
            { status: 500 }
        );
    }
} 