import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '~/auth';
import { getEffectiveDailyLimit } from '~/lib/utils/limits';
import { db } from '~/server/db';

// Schema for query parameters
const querySchema = z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        // Get and validate query parameters
        const { searchParams } = new URL(request.url);
        const queryResult = querySchema.safeParse({
            start_date: searchParams.get('start_date'),
            end_date: searchParams.get('end_date'),
        });

        if (!queryResult.success) {
            return NextResponse.json(
                { error: { message: 'Invalid date parameters', code: 'INVALID_PARAMS' } },
                { status: 400 }
            );
        }

        const { start_date, end_date } = queryResult.data;
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);

        // Validate date range
        if (startDate > endDate) {
            return NextResponse.json(
                { error: { message: 'Start date must be before end date', code: 'INVALID_DATE_RANGE' } },
                { status: 400 }
            );
        }

        // Get user ID
        const user = await db.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json(
                { error: { message: 'User not found', code: 'USER_NOT_FOUND' } },
                { status: 404 }
            );
        }

        // Get all entries for the date range
        const entries = await db.caffeineEntry.findMany({
            where: {
                userId: user.id,
                consumedAt: {
                    gte: startDate,
                    lte: new Date(endDate.setHours(23, 59, 59, 999)),
                },
            },
            include: {
                drink: true,
            },
            orderBy: {
                consumedAt: 'asc',
            },
        });

        // Group entries by date and calculate totals
        const entriesByDate = entries.reduce((acc: Record<string, number>, entry) => {
            const date = entry.consumedAt.toISOString().split('T')[0]!
            const totalCaffeine = Number(entry.drink.caffeineMg) * entry.quantity;
            acc[date] = (acc[date] ?? 0) + totalCaffeine;
            return acc;
        }, {});

        // Generate data points for each day in range
        const data = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0]!
            const total_mg = entriesByDate[dateStr] ?? 0;

            // Get the effective limit for this date
            const limit = await getEffectiveDailyLimit(user.id, currentDate);
            const limit_mg = limit?.limit_mg ?? null;
            const limit_exceeded = limit_mg !== null && total_mg > limit_mg;

            data.push({
                date: dateStr,
                total_mg,
                limit_exceeded,
                limit_mg,
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Error in graph-data endpoint:', error);
        return NextResponse.json(
            { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
            { status: 500 }
        );
    }
} 