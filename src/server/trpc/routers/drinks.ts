import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/trpc/trpc';

export const drinksRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            name: z.string().min(1, 'Name is required'),
            caffeine_mg: z.number().positive('Caffeine amount must be positive'),
            size_ml: z.number().positive('Size must be positive'),
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const drink = await ctx.db.drink.create({
                    data: {
                        name: input.name,
                        caffeineMg: input.caffeine_mg,
                        sizeMl: input.size_ml,
                        createdByUserId: ctx.session.user.id,
                    },
                });

                return {
                    success: true,
                    drink: {
                        id: drink.id,
                        name: drink.name,
                        caffeine_mg: drink.caffeineMg,
                        size_ml: drink.sizeMl,
                        created_by_user_id: drink.createdByUserId,
                    },
                };
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    if (error.code === 'P2002') {
                        throw new Error('A drink with this name already exists');
                    }
                }
                throw error;
            }
        }),

    search: protectedProcedure
        .input(z.object({
            q: z.string().optional(),
            sort_by: z.enum(['name', 'caffeineMg', 'sizeMl']).optional().default('name'),
            sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
            limit: z.number().positive().optional().default(20),
            page: z.number().positive().optional().default(1),
        }))
        .query(async ({ ctx, input }) => {
            const { q, sort_by, sort_order, limit, page } = input;

            const where: Prisma.DrinkWhereInput = q
                ? {
                    name: {
                        contains: q,
                    },
                }
                : {};

            const orderBy: Prisma.DrinkOrderByWithRelationInput[] = [
                {
                    name: sort_by === 'name' ? (sort_order as Prisma.SortOrder) : 'asc',
                },
                {
                    caffeineMg: sort_by === 'caffeineMg' ? (sort_order as Prisma.SortOrder) : 'asc',
                },
                {
                    sizeMl: sort_by === 'sizeMl' ? (sort_order as Prisma.SortOrder) : 'asc',
                },
            ];

            const total = await ctx.db.drink.count({ where });

            const drinks = await ctx.db.drink.findMany({
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

            return {
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
            };
        }),
}); 