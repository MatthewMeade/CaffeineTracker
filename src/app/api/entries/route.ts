import { NextResponse } from 'next/server';
import { auth } from '~/lib/auth';
import { prisma } from '~/lib/prisma';
import { z } from 'zod';
import { getEffectiveDailyLimit } from '~/lib/limits';

// Request body validation schema
const createEntrySchema = z.object({
    caffeine_mg: z.number().positive('Caffeine amount must be positive').optional(),
    consumed_at: z.string().datetime('Invalid date format'),
    drink_id: z.string().uuid('Invalid drink ID').optional(),
    volume_ml: z.number().positive('Volume must be positive').optional(),
}).refine(
    (data) => {
        // Either caffeine_mg must be provided, or both drink_id and volume_ml must be provided
        return (data.caffeine_mg !== undefined) || (data.drink_id !== undefined && data.volume_ml !== undefined);
    },
    {
        message: 'Either provide caffeine_mg directly, or provide both drink_id and volume_ml',
    }
);

// Error response helper
const errorResponse = (message: string, code: string, status: number, details?: any) => {
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

        // Parse and validate request body
        const body = await request.json();
        const validationResult = createEntrySchema.safeParse(body);

        if (!validationResult.success) {
            return errorResponse(
                'Invalid entry data provided',
                'INVALID_REQUEST',
                400,
                validationResult.error.errors
            );
        }

        const { caffeine_mg, consumed_at, drink_id, volume_ml } = validationResult.data;
        const consumedAtDate = new Date(consumed_at);

        // Calculate caffeine_mg if not provided directly
        let finalCaffeineMg = caffeine_mg;
        if (finalCaffeineMg === undefined && drink_id !== undefined && volume_ml !== undefined) {
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

            finalCaffeineMg = Number(drink.caffeineMgPerMl) * volume_ml;
        }

        // Create the entry
        const entry = await prisma.caffeineEntry.create({
            data: {
                userId: user.id,
                drinkId: drink_id,
                caffeineMg: finalCaffeineMg!,
                consumedAt: consumedAtDate,
            },
            include: {
                drink: true,
            },
        });

        // Calculate total caffeine for the day
        const startOfDay = new Date(Date.UTC(
            consumedAtDate.getUTCFullYear(),
            consumedAtDate.getUTCMonth(),
            consumedAtDate.getUTCDate(),
            0, 0, 0, 0
        ));
        const endOfDay = new Date(Date.UTC(
            consumedAtDate.getUTCFullYear(),
            consumedAtDate.getUTCMonth(),
            consumedAtDate.getUTCDate(),
            23, 59, 59, 999
        ));

        const dailyEntries = await prisma.caffeineEntry.findMany({
            where: {
                userId: user.id,
                consumedAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        const dailyTotal = dailyEntries.reduce((sum, entry) => sum + Number(entry.caffeineMg), 0);

        // Get the effective daily limit for this date
        const dailyLimit = await getEffectiveDailyLimit(user.id, consumedAtDate);

        // Calculate remaining caffeine
        const remainingMg = dailyLimit !== null ? dailyLimit - dailyTotal : null;
        const overLimit = dailyLimit !== null && dailyTotal > dailyLimit;

        return NextResponse.json(
            {
                success: true,
                entry: {
                    id: entry.id,
                    user_id: entry.userId,
                    drink_id: entry.drinkId,
                    drink_name: entry.drink?.name,
                    caffeine_mg: entry.caffeineMg,
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