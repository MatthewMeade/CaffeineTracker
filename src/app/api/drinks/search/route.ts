import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

        // Get search query
        const searchParams = request.nextUrl.searchParams;
        const searchTerm = searchParams.get('q')?.trim() || '';

        // Return empty list for short queries
        if (!searchTerm || searchTerm.length < 2) {
            return NextResponse.json({ drinks: [] });
        }

        // Get current user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json(
                { error: { message: 'User not found', code: 'USER_NOT_FOUND' } },
                { status: 401 }
            );
        }

        // Perform search with prioritization
        const drinks = await prisma.drink.findMany({
            where: {
                name: {
                    contains: searchTerm,
                },
            },
            orderBy: [
                {
                    createdByUserId: 'desc',
                },
                {
                    name: 'asc',
                },
            ],
            select: {
                id: true,
                name: true,
                caffeineMgPerMl: true,
                baseSizeMl: true,
                createdByUserId: true,
            },
        });

        // Sort results to prioritize user's own drinks
        const sortedDrinks = drinks.sort((a, b) => {
            if (a.createdByUserId === user.id && b.createdByUserId !== user.id) return -1;
            if (a.createdByUserId !== user.id && b.createdByUserId === user.id) return 1;
            return 0;
        });

        return NextResponse.json({ drinks: sortedDrinks });
    } catch (error) {
        console.error('Error searching drinks:', error);
        return NextResponse.json(
            { error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } },
            { status: 500 }
        );
    }
} 