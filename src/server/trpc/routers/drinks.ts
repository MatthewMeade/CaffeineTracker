import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '~/server/trpc/trpc';
import { withDbErrorHandling } from '~/server/utils/trpc-errors';

export const drinksRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            name: z.string().min(1, 'Name is required'),
            caffeine_mg: z.number().positive('Caffeine amount must be positive'),
            size_ml: z.number().positive('Size must be positive'),
        }))
        .mutation(async ({ ctx, input }) => {
            const drinkExists = await ctx.db.drink.findFirst({
                where: {
                    name: input.name,
                    createdByUserId: ctx.session.user.id,
                },
            });

            if (drinkExists) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'A drink with this name already exists',
                });
            }

            const drink = await ctx.db.drink.create({
                data: {
                    name: input.name,
                    caffeineMg: input.caffeine_mg,
                    sizeMl: input.size_ml,
                    createdByUserId: ctx.session.user.id,
                },
            }).catch((error) => {
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'A drink with this name already exists',
                    });
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create drink',
                    cause: error,
                });
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

            const baseWhere: Prisma.DrinkWhereInput = q
                ? {
                    name: {
                        contains: q,
                    },
                }
                : {};

            const orderBy: Prisma.DrinkOrderByWithRelationInput[] = [
                {
                    [sort_by === 'name' ? 'name' : sort_by === 'caffeineMg' ? 'caffeineMg' : 'sizeMl']: sort_order,
                },
            ];

            const userDrinksPromise = withDbErrorHandling(
                ctx.db.drink.findMany({
                    where: {
                        ...baseWhere,
                        createdByUserId: ctx.session.user.id,
                    },
                    orderBy,
                    select: {
                        id: true,
                        name: true,
                        caffeineMg: true,
                        sizeMl: true,
                        createdByUserId: true,
                    },
                }),
                'Failed to fetch user drinks'
            );

            const otherDrinksPromise = withDbErrorHandling(
                ctx.db.drink.findMany({
                    where: {
                        ...baseWhere,
                        createdByUserId: {
                            not: ctx.session.user.id,
                        },
                    },
                    orderBy,
                    select: {
                        id: true,
                        name: true,
                        caffeineMg: true,
                        sizeMl: true,
                        createdByUserId: true,
                    },
                }),
                'Failed to fetch other users drinks'
            );

            const [userDrinks, otherDrinks] = await Promise.all([userDrinksPromise, otherDrinksPromise]);

            const allDrinks = [...userDrinks, ...otherDrinks];
            const total = allDrinks.length;
            const paginatedDrinks = allDrinks.slice((page - 1) * limit, page * limit);

            return {
                drinks: paginatedDrinks.map(drink => ({
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