import { NextResponse } from 'next/server';
import { auth } from '~/lib/auth';
import { prisma } from '~/lib/prisma';
import { z } from 'zod';
import { getEffectiveDailyLimit } from '~/lib/limits';
import type { Prisma } from '@prisma/client';

// Request body validation schema
const createEntrySchema = z.object({
    drink_id: z.string().uuid('Invalid drink ID'),
    quantity: z.number().int().positive('Quantity must be a positive integer').default(1),
    consumed_at: z.string().datetime('Invalid date format'),
});

// Query parameters validation schema
const getEntriesSchema = z.object({
    start_date: z.string().datetime('Invalid start date format').optional(),
    end_date: z.string().datetime('Invalid end date format').optional(),
    offset: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(100).default(20),
});


// Error response helper
const errorResponse = <T>(message: string, code: string, status: number, details?: T) => {
    return NextResponse.json(
        {
            error: {
                message,
                code,
                ...(details && { details }),
            },
        },
        { status }
    );
};

export async function GET(request: Request) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.email) {
            return errorResponse(
                'Authentication required to view entries',
                'UNAUTHORIZED',
                401
            );
        }

        // Get user ID from session
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return errorResponse(
                'User account not found',
                'USER_NOT_FOUND',
                404
            );
        }

        // Parse and validate query parameters
        const url = new URL(request.url);
        const queryForValidation: {
            start_date?: string;
            end_date?: string;
            offset?: number;
            limit?: number;
        } = {};

        const startDateParam = url.searchParams.get('start_date');
        if (startDateParam !== null) {
            queryForValidation.start_date = startDateParam;
        }

        const endDateParam = url.searchParams.get('end_date');
        if (endDateParam !== null) {
            queryForValidation.end_date = endDateParam;
        }

        const offsetParam = url.searchParams.get('offset');
        if (offsetParam !== null) {
            queryForValidation.offset = parseInt(offsetParam, 10);
        }

        const limitParam = url.searchParams.get('limit');
        if (limitParam !== null) {
            queryForValidation.limit = parseInt(limitParam, 10);
        }

        const validationResult = getEntriesSchema.safeParse(queryForValidation);
        if (!validationResult.success) {
            return errorResponse(
                'Invalid query parameters',
                'INVALID_QUERY',
                400,
                validationResult.error.errors
            );
        }

        const { start_date, end_date, offset, limit } = validationResult.data;

        // Build where clause for date range
        const where: Prisma.CaffeineEntryWhereInput = { userId: user.id };
        if (start_date || end_date) {
            where.consumedAt = {};
            if (start_date) where.consumedAt.gte = new Date(start_date);
            if (end_date) where.consumedAt.lte = new Date(end_date);
        }

        // Get total count for pagination
        const total = await prisma.caffeineEntry.count({ where });

        // Get entries with pagination
        const entries = await prisma.caffeineEntry.findMany({
            where,
            skip: offset,
            take: limit + 1, // Get one extra to determine if there are more
            orderBy: { consumedAt: 'desc' },
            include: {
                drink: {
                    select: {
                        id: true,
                        name: true,
                        caffeineMg: true,
                        sizeMl: true,
                    },
                },
            },
        });

        // Check if there are more entries
        const hasMore = entries.length > limit;
        if (hasMore) {
            entries.pop(); // Remove the extra entry
        }

        return NextResponse.json({
            entries: entries.map(entry => ({
                id: entry.id,
                drink: {
                    id: entry.drink.id,
                    name: entry.drink.name,
                    caffeine_mg: Number(entry.drink.caffeineMg),
                    size_ml: Number(entry.drink.sizeMl),
                },
                quantity: entry.quantity,
                consumed_at: entry.consumedAt,
            })),
            has_more: hasMore,
            total,
        });
    } catch (error) {
        console.error('Error fetching caffeine entries:', error);
        return errorResponse(
            'Failed to fetch caffeine entries',
            'INTERNAL_SERVER_ERROR',
            500
        );
    }
}

export async function POST(request: Request) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.email) {
            return errorResponse(
                'Authentication required to create entries',
                'UNAUTHORIZED',
                401
            );
        }

        // Get user ID from session
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return errorResponse(
                'User account not found',
                'USER_NOT_FOUND',
                404
            );
        }

        const validationResult = createEntrySchema.safeParse(await request.json());

        if (!validationResult.success) {
            return errorResponse(
                'Invalid entry data provided',
                'INVALID_REQUEST',
                400,
                validationResult.error.errors
            );
        }

        const { drink_id, quantity, consumed_at } = validationResult.data;
        const consumedAtDate = new Date(consumed_at);

        // Get the drink to calculate total caffeine
        const drink = await prisma.drink.findUnique({
            where: { id: drink_id },
        });

        if (!drink) {
            return errorResponse(
                'Drink not found',
                'DRINK_NOT_FOUND',
                404
            );
        }

        // Calculate total caffeine for this entry
        const totalCaffeineMg = Number(drink.caffeineMg) * quantity;

        // Create the entry
        const entry = await prisma.caffeineEntry.create({
            data: {
                userId: user.id,
                drinkId: drink_id,
                quantity,
                consumedAt: consumedAtDate,
            },
            include: {
                drink: true,
            },
        });

        // Calculate daily total and check against limit
        const startOfDay = new Date(consumedAtDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(consumedAtDate);
        endOfDay.setHours(23, 59, 59, 999);

        const dailyEntries = await prisma.caffeineEntry.findMany({
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
        });

        const dailyTotalMg = dailyEntries.reduce((total, entry) => {
            return total + (Number(entry.drink.caffeineMg) * entry.quantity);
        }, 0);

        const dailyLimit = await getEffectiveDailyLimit(user.id, consumedAtDate);
        const overLimit = dailyLimit !== null && dailyTotalMg > dailyLimit;
        const remainingMg = dailyLimit !== null ? dailyLimit - dailyTotalMg : null;

        return NextResponse.json(
            {
                success: true,
                entry: {
                    id: entry.id,
                    user_id: entry.userId,
                    drink_id: entry.drinkId,
                    drink_name: entry.drink.name,
                    quantity: entry.quantity,
                    total_caffeine_mg: totalCaffeineMg,
                    consumed_at: entry.consumedAt,
                    created_at: entry.createdAt,
                },
                over_limit: overLimit,
                remaining_mg: remainingMg,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating caffeine entry:', error);
        return errorResponse(
            'Failed to create caffeine entry',
            'INTERNAL_SERVER_ERROR',
            500
        );
    }
} 