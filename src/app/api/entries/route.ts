import { NextResponse } from 'next/server';
import { auth } from '~/lib/auth';
import { prisma } from '~/lib/prisma';
import { z } from 'zod';
import { getEffectiveDailyLimit } from '~/lib/limits';

// Request body validation schema
const createEntrySchema = z.object({
    drink_id: z.string().uuid('Invalid drink ID'),
    quantity: z.number().int().positive('Quantity must be a positive integer').default(1),
    consumed_at: z.string().datetime('Invalid date format'),
});

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