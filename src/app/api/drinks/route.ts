import { NextResponse } from 'next/server';
import { auth } from '~/lib/auth';
import { prisma } from '~/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Request body validation schema
const createDrinkSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    caffeine_mg: z.number().positive('Caffeine amount must be positive'),
    base_size_ml: z.number().positive('Base size must be positive'),
});

export async function POST(request: Request) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        // Get user ID from session
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json(
                { error: { message: 'User not found', code: 'USER_NOT_FOUND' } },
                { status: 404 }
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const validationResult = createDrinkSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: {
                        message: 'Invalid request body',
                        code: 'INVALID_REQUEST',
                        details: validationResult.error.errors,
                    },
                },
                { status: 400 }
            );
        }

        const { name, caffeine_mg, base_size_ml } = validationResult.data;

        // Calculate caffeine_mg_per_ml
        const caffeine_mg_per_ml = caffeine_mg / base_size_ml;

        // Create drink in database
        try {
            const drink = await prisma.drink.create({
                data: {
                    name,
                    caffeineMgPerMl: caffeine_mg_per_ml,
                    baseSizeMl: base_size_ml,
                    createdByUserId: user.id,
                },
            });

            return NextResponse.json(
                {
                    success: true,
                    drink: {
                        id: drink.id,
                        name: drink.name,
                        caffeine_mg_per_ml: drink.caffeineMgPerMl,
                        base_size_ml: drink.baseSizeMl,
                        created_by_user_id: drink.createdByUserId,
                        created_at: drink.createdAt,
                        updated_at: drink.updatedAt,
                    },
                },
                { status: 201 }
            );
        } catch (error) {
            // Handle unique constraint violation
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return NextResponse.json(
                    {
                        error: {
                            message: 'A drink with these exact specifications already exists',
                            code: 'DUPLICATE_DRINK',
                        },
                    },
                    { status: 409 }
                );
            }
            throw error;
        }
    } catch (error) {
        console.error('Error creating drink:', error);
        return NextResponse.json(
            {
                error: {
                    message: 'Internal server error',
                    code: 'INTERNAL_SERVER_ERROR',
                },
            },
            { status: 500 }
        );
    }
} 