import { NextResponse } from 'next/server';
import { auth } from '~/lib/auth';
import { prisma } from '~/lib/prisma';
import { z } from 'zod';
import { Prisma,  } from '@prisma/client';

// Request body validation schema
const createDrinkSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    caffeine_mg: z.number().positive('Caffeine amount must be positive'),
    size_ml: z.number().positive('Size must be positive'),
});

// Search query validation schema
const searchQuerySchema = z.object({
    q: z.string().optional(),
    sort_by: z.enum(['name', 'caffeineMg', 'sizeMl']).optional().default('name'),
    sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
    limit: z.number().positive().optional().default(20),
    page: z.number().positive().optional().default(1),
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

export async function POST(request: Request) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.email) {
            return errorResponse(
                'Authentication required to create drinks',
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


        const validationResult = createDrinkSchema.safeParse(await request.json());

        if (!validationResult.success) {
            return errorResponse(
                'Invalid drink data provided',
                'INVALID_REQUEST',
                400,
                validationResult.error.errors
            );
        }

        const { name, caffeine_mg, size_ml } = validationResult.data;

        // Create the drink
        try {
            const drink = await prisma.drink.create({
                data: {
                    name,
                    caffeineMg: caffeine_mg,
                    sizeMl: size_ml,
                    createdByUserId: user.id,
                },
            });

            return NextResponse.json(
                {
                    success: true,
                    drink: {
                        id: drink.id,
                        name: drink.name,
                        caffeine_mg: drink.caffeineMg,
                        size_ml: drink.sizeMl,
                        created_by_user_id: drink.createdByUserId,
                    },
                },
                { status: 201 }
            );
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    return errorResponse(
                        'A drink with this name already exists',
                        'DUPLICATE_DRINK',
                        409
                    );
                }
            }
            throw error; // Re-throw for general error handling
        }
    } catch (error) {
        console.error('Error creating drink:', error);
        return errorResponse(
            'Failed to create drink',
            'INTERNAL_SERVER_ERROR',
            500
        );
    }
}

export async function GET(request: Request) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.email) {
            return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
        }

        // Get user ID from session
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return errorResponse('User not found', 'USER_NOT_FOUND', 404);
        }

        // Get and validate search parameters
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') ?? '';
        const sortBy = searchParams.get('sort_by') ?? 'name';
        const sortOrder = searchParams.get('sort_order') ?? 'asc';
        const limit = parseInt(searchParams.get('limit') ?? '20');
        const page = parseInt(searchParams.get('page') ?? '1');

        const validationResult = searchQuerySchema.safeParse({
            q: query,
            sort_by: sortBy,
            sort_order: sortOrder,
            limit,
            page,
        });

        if (!validationResult.success) {
            return errorResponse(
                'Invalid search parameters',
                'INVALID_QUERY',
                400,
                validationResult.error.errors
            );
        }

        // Build the where clause
        const where: Prisma.DrinkWhereInput = query
            ? {
                name: {
                    contains: query,
                },
            }
            : {};

        // Build the orderBy clause
        const orderBy: Prisma.DrinkOrderByWithRelationInput[] = [
            {
                name: sortBy === 'name' ? (sortOrder as Prisma.SortOrder) : 'asc',
            },
            {
                caffeineMg: sortBy === 'caffeineMg' ? (sortOrder as Prisma.SortOrder) : 'asc',
            },
            {
                sizeMl: sortBy === 'sizeMl' ? (sortOrder as Prisma.SortOrder) : 'asc',
            },
        ];

        // Get total count for pagination
        const total = await prisma.drink.count({ where });

        // Get drinks with pagination
        const drinks = await prisma.drink.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                name: true,
                caffeineMg: true,
                sizeMl: true,
                createdByUserId: true,
            },
        });

        return NextResponse.json({
            drinks: drinks.map(drink => ({
                id: drink.id,
                name: drink.name,
                caffeine_mg: drink.caffeineMg,
                size_ml: drink.sizeMl,
                created_by_user_id: drink.createdByUserId,
            })),
            pagination: {
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error searching drinks:', error);
        return errorResponse('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
} 