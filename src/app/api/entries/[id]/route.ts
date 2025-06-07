import type { Prisma } from '@prisma/client';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '~/lib/auth';
import { getEffectiveDailyLimit } from '~/lib/limits';
import { prisma } from '~/lib/prisma';

// Request body validation schema
const updateEntrySchema = z.object({
    caffeine_mg: z.number().positive('Caffeine amount must be positive').optional(),
    consumed_at: z.string().datetime('Invalid date format').optional(),
}).refine(
    (data) => {
        // At least one field must be provided for update
        return data.caffeine_mg !== undefined || data.consumed_at !== undefined;
    },
    {
        message: 'At least one field (caffeine_mg or consumed_at) must be provided for update',
    }
);

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



export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.email) {
            return errorResponse(
                'Authentication required to update entries',
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

        const { id } = await params;

        // Find the entry and verify ownership
        const existingEntry = await prisma.caffeineEntry.findUnique({
            where: { id },
            include: { drink: true },
        });

        if (!existingEntry) {
            return errorResponse(
                'Entry not found',
                'ENTRY_NOT_FOUND',
                404
            );
        }

        if (existingEntry.userId !== user.id) {
            return errorResponse(
                'Not authorized to update this entry',
                'FORBIDDEN',
                403
            );
        }


        const validationResult = updateEntrySchema.safeParse(await request.json());

        if (!validationResult.success) {
            return errorResponse(
                'Invalid entry data provided',
                'INVALID_REQUEST',
                400,
                validationResult.error.errors
            );
        }

        const { consumed_at } = validationResult.data;

        // Prepare update data
        const updateData: Prisma.CaffeineEntryUpdateInput = {};

        
        if (consumed_at !== undefined) {
            updateData.consumedAt = new Date(consumed_at);
        }

        // Update the entry
        const updatedEntry = await prisma.caffeineEntry.update({
            where: { id },
            data: updateData,
            include: { drink: true },
        });

        // Calculate total caffeine for the day
        const consumedAtDate = consumed_at ? new Date(consumed_at) : existingEntry.consumedAt;
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
            include: {
                drink: true,
            },
        });

        const dailyTotal = dailyEntries.reduce((sum: number, entry) => sum + Number(entry.drink?.caffeineMg ?? 0) * entry.quantity, 0);

        // Get the effective daily limit for this date
        const dailyLimit = await getEffectiveDailyLimit(user.id, consumedAtDate);

        // Calculate remaining caffeine
        const remainingMg = dailyLimit !== null ? dailyLimit - dailyTotal : null;
        const overLimit = dailyLimit !== null && dailyTotal > dailyLimit;

        return NextResponse.json(
            {
                success: true,
                entry: {
                    id: updatedEntry.id,
                    user_id: updatedEntry.userId,
                    drink_id: updatedEntry.drinkId,
                    drink_name: updatedEntry.drink?.name,
                    consumed_at: updatedEntry.consumedAt,
                    created_at: updatedEntry.createdAt,
                },
                over_limit: overLimit,
                remaining_mg: remainingMg,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error updating caffeine entry:', error);
        return errorResponse(
            'Failed to update caffeine entry',
            'INTERNAL_SERVER_ERROR',
            500
        );
    }
}

export async function DELETE(
    _: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.email) {
            return errorResponse(
                'Authentication required to delete entries',
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

        const { id } = await params;

        // Find the entry and verify ownership
        const existingEntry = await prisma.caffeineEntry.findUnique({
            where: { id },
        });

        if (!existingEntry) {
            return errorResponse(
                'Entry not found',
                'ENTRY_NOT_FOUND',
                404
            );
        }

        if (existingEntry.userId !== user.id) {
            return errorResponse(
                'Not authorized to delete this entry',
                'FORBIDDEN',
                403
            );
        }

        // Delete the entry
        await prisma.caffeineEntry.delete({
            where: { id },
        });

        return NextResponse.json(
            { success: true },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error deleting caffeine entry:', error);
        return errorResponse(
            'Failed to delete caffeine entry',
            'INTERNAL_SERVER_ERROR',
            500
        );
    }
} 