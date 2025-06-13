import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/trpc/trpc';
import { getEffectiveDailyLimit } from '~/lib/limits';
import { type Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';

export const entriesRouter = createTRPCRouter({
    create: protectedProcedure
        .input(
            z.discriminatedUnion('type', [
                z.object({
                    type: z.literal('preset'),
                    drinkId: z.string().uuid('Invalid drink ID'),
                    consumedAt: z.string().datetime('Invalid date format'),
                }),
                z.object({
                    type: z.literal('manual'),
                    name: z.string().min(1, { message: "Name is required for manual entry" }),
                    caffeineMg: z.number().positive('Caffeine amount must be positive'),
                    consumedAt: z.string().datetime('Invalid date format'),
                }),
            ])
        )
        .mutation(async ({ ctx, input }) => {
            const consumedAtDate = new Date(input.consumedAt);

            let entry;
            if (input.type === 'preset') {
                const drink = await ctx.db.drink.findUnique({
                    where: { id: input.drinkId },
                });

                if (!drink) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Drink not found',
                    });
                }

                entry = await ctx.db.caffeineEntry.create({
                    data: {
                        userId: ctx.session.user.id,
                        drinkId: input.drinkId,
                        consumedAt: consumedAtDate,
                        name: drink.name,
                        caffeineMg: drink.caffeineMg,
                    },
                });
            } else {
                entry = await ctx.db.caffeineEntry.create({
                    data: {
                        userId: ctx.session.user.id,
                        consumedAt: consumedAtDate,
                        name: input.name,
                        caffeineMg: input.caffeineMg,
                    },
                });
            }

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
            });

            const dailyTotalMg = dailyEntries.reduce((total, entry) => {
                return total + Number(entry.caffeineMg);
            }, 0);

            const dailyLimit = await getEffectiveDailyLimit(ctx.session.user.id, consumedAtDate);
            const overLimit = dailyLimit !== null && dailyTotalMg > dailyLimit;
            const remainingMg = dailyLimit !== null ? dailyLimit - dailyTotalMg : null;

            return {
                success: true,
                entry: {
                    id: entry.id,
                    consumed_at: entry.consumedAt,
                    name: entry.name,
                    caffeine_mg: Number(entry.caffeineMg),
                    drink_id: entry.drinkId,
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
            });

            const hasMore = entries.length > limit;
            if (hasMore) {
                entries.pop();
            }

            return {
                entries: entries.map(entry => ({
                    id: entry.id,
                    name: entry.name,
                    caffeine_mg: Number(entry.caffeineMg),
                    consumed_at: entry.consumedAt,
                    drink_id: entry.drinkId,
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
                orderBy: {
                    consumedAt: 'asc',
                },
            });

            const dailyTotal = entries.reduce((sum, entry) => sum + Number(entry.caffeineMg), 0);
            const dailyLimit = await getEffectiveDailyLimit(ctx.session.user.id, targetDate);
            const overLimit = dailyLimit !== null && dailyTotal > dailyLimit;

            const formattedEntries = entries.map(entry => ({
                id: entry.id,
                consumed_at: entry.consumedAt.toISOString(),
                name: entry.name,
                caffeine_mg: Number(entry.caffeineMg),
                drink_id: entry.drinkId,
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
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Start date cannot be after the end date',
                });
            }

            // Use raw SQL to aggregate daily totals
            const results: { date: string; total_mg: number }[] = await ctx.db.$queryRaw`
                SELECT 
                    DATE("consumedAt") as date,
                    CAST(SUM(CAST("caffeineMg" as INTEGER)) as INTEGER) as total_mg
                FROM "CaffeineEntry"
                WHERE "userId" = ${ctx.session.user.id}
                    AND "consumedAt" >= ${startDate}
                    AND "consumedAt" <= ${new Date(endDate.setHours(23, 59, 59, 999))}
                GROUP BY DATE("consumedAt")
                ORDER BY date ASC
            `;

            // Convert results to a Map for efficient lookups
            const consumptionByDate = new Map(
                results.map(r => [r.date, r.total_mg])
            );

            const data = [];
            const currentDate = new Date(startDate);

            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0]!;
                const total_mg = consumptionByDate.get(dateStr) ?? 0;

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
        .input(
            z.object({
                id: z.string().uuid(),
                consumedAt: z.string().datetime().optional(),
                name: z.string().min(1).optional(),
                caffeineMg: z.number().positive().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, consumedAt, name, caffeineMg } = input;

            const existingEntry = await ctx.db.caffeineEntry.findUnique({
                where: { id, userId: ctx.session.user.id },
            });

            if (!existingEntry) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Entry not found or you do not have permission to edit it',
                });
            }

            const dataToUpdate: Prisma.CaffeineEntryUpdateInput = {};

            if (consumedAt) {
                dataToUpdate.consumedAt = new Date(consumedAt);
            }
            if (name) {
                dataToUpdate.name = name;
            }
            if (caffeineMg) {
                dataToUpdate.caffeineMg = caffeineMg;
            }

            // If name or caffeineMg are updated, it becomes a "manual" entry, so we break the link.
            if (name || caffeineMg) {
                dataToUpdate.drink = { disconnect: true };
            }

            const updatedEntry = await ctx.db.caffeineEntry.update({
                where: { id },
                data: dataToUpdate,
            });

            const consumedAtDate = updatedEntry.consumedAt;
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
            });

            const dailyTotal = dailyEntries.reduce((sum, entry) => sum + Number(entry.caffeineMg), 0);
            const dailyLimit = await getEffectiveDailyLimit(ctx.session.user.id, consumedAtDate);
            const remainingMg = dailyLimit !== null ? dailyLimit - dailyTotal : null;
            const overLimit = dailyLimit !== null && dailyTotal > dailyLimit;

            return {
                success: true,
                entry: {
                    id: updatedEntry.id,
                    consumed_at: updatedEntry.consumedAt,
                    name: updatedEntry.name,
                    caffeine_mg: Number(updatedEntry.caffeineMg),
                    drink_id: updatedEntry.drinkId,
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
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Entry not found or you do not have permission to delete it',
                });
            }

            await ctx.db.caffeineEntry.delete({
                where: { id },
            });

            return { success: true };
        }),
}); 