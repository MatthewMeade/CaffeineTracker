import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/trpc/trpc';
import { getEffectiveDailyLimit } from '~/lib/limits';
import { type Prisma } from '@prisma/client';

export const entriesRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            drink_id: z.string().uuid('Invalid drink ID'),
            consumed_at: z.string().datetime('Invalid date format'),
        }))
        .mutation(async ({ ctx, input }) => {
            const { drink_id, consumed_at } = input;
            const consumedAtDate = new Date(consumed_at);

            const drink = await ctx.db.drink.findUnique({
                where: { id: drink_id },
            });

            if (!drink) {
                throw new Error('Drink not found');
            }

            const totalCaffeineMg = Number(drink.caffeineMg);

            const entry = await ctx.db.caffeineEntry.create({
                data: {
                    userId: ctx.session.user.id,
                    drinkId: drink_id,
                    consumedAt: consumedAtDate,
                },
                include: {
                    drink: true,
                },
            });

            const startOfDay = new Date(consumedAtDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(consumedAtDate);
            endOfDay.setHours(23, 59, 59, 999);

            const dailyEntries = await ctx.db.caffeineEntry.findMany({
                where: {
                    userId: ctx.session.user.id,
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
                return total + (Number(entry.drink.caffeineMg));
            }, 0);

            const dailyLimit = await getEffectiveDailyLimit(ctx.session.user.id, consumedAtDate);
            const overLimit = dailyLimit !== null && dailyTotalMg > dailyLimit;
            const remainingMg = dailyLimit !== null ? dailyLimit - dailyTotalMg : null;

            return {
                success: true,
                entry: {
                    id: entry.id,
                    consumed_at: entry.consumedAt,
                    drink: {
                        id: entry.drink.id,
                        name: entry.drink.name,
                        caffeine_mg: Number(entry.drink.caffeineMg),
                        size_ml: Number(entry.drink.sizeMl),
                    }
                },
                over_limit: overLimit,
                remaining_mg: remainingMg,
            };
        }),

    list: protectedProcedure
        .input(z.object({
            start_date: z.string().datetime('Invalid start date format').optional(),
            end_date: z.string().datetime('Invalid end date format').optional(),
            offset: z.number().int().min(0).default(0),
            limit: z.number().int().min(1).max(100).default(20),
        }))
        .query(async ({ ctx, input }) => {
            const { start_date, end_date, offset, limit } = input;

            const where: Prisma.CaffeineEntryWhereInput = { userId: ctx.session.user.id };
            if (start_date || end_date) {
                where.consumedAt = {};
                if (start_date) where.consumedAt.gte = new Date(start_date);
                if (end_date) where.consumedAt.lte = new Date(end_date);
            }

            const total = await ctx.db.caffeineEntry.count({ where });

            const entries = await ctx.db.caffeineEntry.findMany({
                where,
                skip: offset,
                take: limit + 1,
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

            const hasMore = entries.length > limit;
            if (hasMore) {
                entries.pop();
            }

            return {
                entries: entries.map(entry => ({
                    id: entry.id,
                    drink: {
                        id: entry.drink.id,
                        name: entry.drink.name,
                        caffeine_mg: Number(entry.drink.caffeineMg),
                        size_ml: Number(entry.drink.sizeMl),
                    },
                    consumed_at: entry.consumedAt,
                })),
                has_more: hasMore,
                total,
            };
        }),

    getDaily: protectedProcedure
        .input(z.object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional().nullable(),
        }))
        .query(async ({ ctx, input }) => {
            const targetDate = input.date
                ? new Date(input.date)
                : new Date();

            const startOfDay = new Date(Date.UTC(
                targetDate.getUTCFullYear(),
                targetDate.getUTCMonth(),
                targetDate.getUTCDate(),
                0, 0, 0, 0
            ));
            const endOfDay = new Date(Date.UTC(
                targetDate.getUTCFullYear(),
                targetDate.getUTCMonth(),
                targetDate.getUTCDate(),
                23, 59, 59, 999
            ));

            const entries = await ctx.db.caffeineEntry.findMany({
                where: {
                    userId: ctx.session.user.id,
                    consumedAt: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
                include: {
                    drink: true,
                },
                orderBy: {
                    consumedAt: 'asc',
                },
            });

            const dailyTotal = entries.reduce((sum, entry) => sum + Number(entry.drink?.caffeineMg ?? 0), 0);

            const dailyLimit = await getEffectiveDailyLimit(ctx.session.user.id, targetDate);

            const overLimit = dailyLimit !== null && dailyTotal > dailyLimit;

            const formattedEntries = entries.map(entry => ({
                id: entry.id,
                consumed_at: entry.consumedAt.toISOString(),
                drink_name: entry.drink?.name ?? null,
            }));

            return {
                entries: formattedEntries,
                daily_total_mg: dailyTotal,
                over_limit: overLimit,
                daily_limit_mg: dailyLimit,
            };
        }),

    getGraphData: protectedProcedure
        .input(z.object({
            start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }))
        .query(async ({ ctx, input }) => {
            const { start_date, end_date } = input;
            const startDate = new Date(start_date);
            const endDate = new Date(end_date);

            if (startDate > endDate) {
                throw new Error('Start date must be before end date');
            }

            const entries = await ctx.db.caffeineEntry.findMany({
                where: {
                    userId: ctx.session.user.id,
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

            const entriesByDate = entries.reduce((acc: Record<string, number>, entry) => {
                const date = entry.consumedAt.toISOString().split('T')[0]!
                const totalCaffeine = Number(entry.drink.caffeineMg);
                acc[date] = (acc[date] ?? 0) + totalCaffeine;
                return acc;
            }, {});

            const data = [];
            const currentDate = new Date(startDate);

            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0]!
                const total_mg = entriesByDate[dateStr] ?? 0;

                const limit = await getEffectiveDailyLimit(ctx.session.user.id, currentDate);
                const limit_mg = limit ?? null;
                const limit_exceeded = limit_mg !== null && total_mg > limit_mg;

                data.push({
                    date: dateStr,
                    total_mg,
                    limit_exceeded,
                    limit_mg,
                });

                currentDate.setDate(currentDate.getDate() + 1);
            }

            return { data };
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string().uuid(),
            consumed_at: z.string().datetime('Invalid date format'),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, consumed_at } = input;

            const existingEntry = await ctx.db.caffeineEntry.findUnique({
                where: { id, userId: ctx.session.user.id },
                include: { drink: true },
            });

            if (!existingEntry) {
                throw new Error('Entry not found or you do not have permission to edit it');
            }

            const updatedEntry = await ctx.db.caffeineEntry.update({
                where: { id },
                data: { consumedAt: new Date(consumed_at) },
                include: { drink: true },
            });

            const consumedAtDate = new Date(consumed_at);
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

            const dailyEntries = await ctx.db.caffeineEntry.findMany({
                where: {
                    userId: ctx.session.user.id,
                    consumedAt: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
                include: {
                    drink: true,
                },
            });

            const dailyTotal = dailyEntries.reduce((sum, entry) => sum + Number(entry.drink?.caffeineMg ?? 0), 0);
            const dailyLimit = await getEffectiveDailyLimit(ctx.session.user.id, consumedAtDate);
            const remainingMg = dailyLimit !== null ? dailyLimit - dailyTotal : null;
            const overLimit = dailyLimit !== null && dailyTotal > dailyLimit;

            return {
                success: true,
                entry: {
                    id: updatedEntry.id,
                    consumed_at: updatedEntry.consumedAt,
                    drink: {
                        id: updatedEntry.drink.id,
                        name: updatedEntry.drink.name,
                        caffeine_mg: Number(updatedEntry.drink.caffeineMg),
                        size_ml: Number(updatedEntry.drink.sizeMl),
                    }
                },
                over_limit: overLimit,
                remaining_mg: remainingMg,
            };
        }),

    delete: protectedProcedure
        .input(z.object({
            id: z.string().uuid(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id } = input;

            const existingEntry = await ctx.db.caffeineEntry.findUnique({
                where: { id, userId: ctx.session.user.id },
            });

            if (!existingEntry) {
                throw new Error('Entry not found or you do not have permission to delete it');
            }

            await ctx.db.caffeineEntry.delete({
                where: { id },
            });

            return { success: true };
        }),
}); 