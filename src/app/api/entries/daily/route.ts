import { NextResponse } from 'next/server';
import { auth } from '~/lib/auth';
import { prisma } from '~/lib/prisma';
import { getEffectiveDailyLimit } from '~/lib/limits';
import { z } from 'zod';

// Query parameter validation schema
const querySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional().nullable(),
});

export async function GET(request: Request) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json(
                { error: { message: 'User not found', code: 'USER_NOT_FOUND' } },
                { status: 404 }
            );
        }

        // Parse and validate query parameters
        const { searchParams } = new URL(request.url);
        const validationResult = querySchema.safeParse({
            date: searchParams.get('date'),
        });

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: {
                        message: 'Invalid query parameters',
                        code: 'INVALID_QUERY',
                        details: validationResult.error.errors,
                    },
                },
                { status: 400 }
            );
        }

        // Get the target date (default to today if not provided)
        const targetDate = validationResult.data.date
            ? new Date(validationResult.data.date)
            : new Date();

        // Set up start and end of day in UTC
        const startOfDay = new Date(Date.UTC(
            targetDate.getUTCFullYear(),
            targetDate.getUTCMonth(),
            targetDate.getUTCDate(),
            0, 0, 0, 0
        ));
        const endOfDay = new Date(Date.UTC(
            targetDate.getUTCFullYear(),
            targetDate.getUTCMonth(),
            targetDate.getUTCDate(),
            23, 59, 59, 999
        ));

        // Fetch entries for the day
        const entries = await prisma.caffeineEntry.findMany({
            where: {
                userId: user.id,
                consumedAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            include: {
                drink: true,
            },
            orderBy: {
                consumedAt: 'asc',
            },
        });

        // Calculate daily total
        const dailyTotal = entries.reduce((sum, entry) => sum + Number(entry.caffeineMg), 0);

        // Get the effective daily limit for this date
        const dailyLimit = await getEffectiveDailyLimit(user.id, targetDate);

        // Determine if over limit
        const overLimit = dailyLimit !== null && dailyTotal > dailyLimit;

        // Format entries for response
        const formattedEntries = entries.map(entry => ({
            id: entry.id,
            caffeine_mg: Number(entry.caffeineMg),
            consumed_at: entry.consumedAt.toISOString(),
            drink_name: entry.drink?.name ?? null,
        }));

        return NextResponse.json({
            entries: formattedEntries,
            daily_total_mg: dailyTotal,
            over_limit: overLimit,
            daily_limit_mg: dailyLimit,
        });
    } catch (error) {
        console.error('Error fetching daily entries:', error);
        return NextResponse.json(
            { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
            { status: 500 }
        );
    }
} 