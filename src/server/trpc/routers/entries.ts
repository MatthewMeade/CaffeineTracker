import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/trpc/trpc';
import { getEffectiveDailyLimit } from '~/server/utils/user-limits';
import { type Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { calculateDailyTotals } from '~/server/utils/daily-totals';
import { type DailyEntriesApiResponse, type EntryMutationResponse, type ListEntriesApiResponse, type GraphDataApiResponse } from '~/types/api';
import { withDbErrorHandling } from '~/server/utils/trpc-errors';

/**
 * Helper function to convert Prisma Decimal to number for API responses
 */
const toNumber = (value: Prisma.Decimal | number | null): number | null => {
    if (value === null) return null;
    return Number(value);
};

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
        .mutation(async ({ ctx, input }): Promise<EntryMutationResponse> => {
            const consumedAtDate = new Date(input.consumedAt);

            let entryData: { name: string; caffeineMg: Prisma.Decimal | number, drinkId?: string };

            if (input.type === 'preset') {
                const drink = await withDbErrorHandling(
                    ctx.db.drink.findUnique({ where: { id: input.drinkId } }),
                    'Failed to fetch drink'
                );

                if (!drink) {
                    throw new TRPCError({ code: 'NOT_FOUND', message: 'Drink not found' });
                }
                entryData = { name: drink.name, caffeineMg: drink.caffeineMg, drinkId: input.drinkId };
            } else {
                entryData = { name: input.name, caffeineMg: input.caffeineMg };
            }

            const entry = await withDbErrorHandling(
                ctx.db.caffeineEntry.create({
                    data: {
                        userId: ctx.session.user.id,
                        consumedAt: consumedAtDate,
                        ...entryData,
                    },
                }),
                'Failed to create entry'
            );

            const dailyTotals = await withDbErrorHandling(
                calculateDailyTotals(ctx.db, ctx.session.user.id, consumedAtDate),
                'Failed to calculate daily totals'
            );

            return {
                success: true,
                entry: {
                    id: entry.id,
                    consumed_at: entry.consumedAt.toISOString(),
                    name: entry.name,
                    caffeine_mg: toNumber(entry.caffeineMg)!,
                    drink_id: entry.drinkId,
                },
                over_limit: dailyTotals.overLimit,
                remaining_mg: toNumber(dailyTotals.remainingMg),
            };
        }),

    list: protectedProcedure
        .input(z.object({
            start_date: z.string().datetime('Invalid start date format').optional(),
            end_date: z.string().datetime('Invalid end date format').optional(),
            offset: z.number().int().min(0).default(0),
            limit: z.number().int().min(1).max(100).default(20),
        }))
        .query(async ({ ctx, input }): Promise<ListEntriesApiResponse> => {
            const { start_date, end_date, offset, limit } = input;

            const where: Prisma.CaffeineEntryWhereInput = { userId: ctx.session.user.id };
            if (start_date || end_date) {
                where.consumedAt = {};
                if (start_date) where.consumedAt.gte = new Date(start_date);
                if (end_date) where.consumedAt.lte = new Date(end_date);
            }

            const totalPromise = withDbErrorHandling(
                ctx.db.caffeineEntry.count({ where }),
                'Failed to fetch entries count'
            );

            const entriesPromise = withDbErrorHandling(
                ctx.db.caffeineEntry.findMany({
                    where,
                    skip: offset,
                    take: limit + 1,
                    orderBy: { consumedAt: 'desc' },
                }),
                'Failed to fetch entries'
            );

            const [total, entries] = await Promise.all([totalPromise, entriesPromise]);

            const hasMore = entries.length > limit;
            if (hasMore) {
                entries.pop();
            }

            return {
                entries: entries.map(entry => ({
                    id: entry.id,
                    name: entry.name,
                    caffeine_mg: toNumber(entry.caffeineMg)!,
                    consumed_at: entry.consumedAt.toISOString(),
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
        .query(async ({ ctx, input }): Promise<DailyEntriesApiResponse> => {
            const targetDate = input.date ? new Date(input.date) : new Date();

            const startOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0, 0));
            const endOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 23, 59, 59, 999));

            const entriesPromise = withDbErrorHandling(
                ctx.db.caffeineEntry.findMany({
                    where: {
                        userId: ctx.session.user.id,
                        consumedAt: { gte: startOfDay, lte: endOfDay },
                    },
                    orderBy: { consumedAt: 'asc' },
                }),
                'Failed to fetch daily entries'
            );

            const dailyTotalsPromise = withDbErrorHandling(
                calculateDailyTotals(ctx.db, ctx.session.user.id, targetDate),
                'Failed to calculate daily totals'
            );

            const [entries, dailyTotals] = await Promise.all([entriesPromise, dailyTotalsPromise]);

            return {
                entries: entries.map(entry => ({
                    id: entry.id,
                    consumed_at: entry.consumedAt.toISOString(),
                    name: entry.name,
                    caffeine_mg: toNumber(entry.caffeineMg)!,
                    drink_id: entry.drinkId,
                })),
                daily_total_mg: toNumber(dailyTotals.dailyTotalMg)!,
                over_limit: dailyTotals.overLimit,
                daily_limit_mg: toNumber(dailyTotals.dailyLimitMg),
            };
        }),

    getGraphData: protectedProcedure
        .input(z.object({
            start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }))
        .query(async ({ ctx, input }): Promise<GraphDataApiResponse> => {
            const { start_date, end_date } = input;
            const startDate = new Date(start_date);
            const endDate = new Date(end_date);

            if (startDate > endDate) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Start date cannot be after the end date',
                });
            }

            const results = await withDbErrorHandling(
                ctx.db.$queryRaw<{ date: string; total_mg: number }[]>`
                    SELECT 
                        DATE("consumedAt") as date,
                        CAST(SUM(CAST("caffeineMg" as INTEGER)) as INTEGER) as total_mg
                    FROM "CaffeineEntry"
                    WHERE "userId" = ${ctx.session.user.id}
                        AND "consumedAt" >= ${startDate}
                        AND "consumedAt" <= ${new Date(endDate.setHours(23, 59, 59, 999))}
                    GROUP BY DATE("consumedAt")
                    ORDER BY date ASC
                `,
                'Failed to fetch graph data'
            );

            const consumptionByDate = new Map(
                results.map(r => [r.date, r.total_mg])
            );

            const data = [];
            const currentDate = new Date(startDate);

            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0]!;
                const total_mg = consumptionByDate.get(dateStr) ?? 0;

                const limit = await withDbErrorHandling(
                    getEffectiveDailyLimit(ctx.session.user.id, currentDate),
                    'Failed to fetch daily limit'
                );

                const limit_mg = toNumber(limit);
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

            const existingEntry = await withDbErrorHandling(
                ctx.db.caffeineEntry.findUnique({ where: { id, userId: ctx.session.user.id } }),
                'Failed to fetch entry'
            );

            if (!existingEntry) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Entry not found or you do not have permission to edit it',
                });
            }

            const updateData: Prisma.CaffeineEntryUpdateInput = {};
            if (consumedAt) updateData.consumedAt = new Date(consumedAt);
            if (name) updateData.name = name;
            if (caffeineMg) updateData.caffeineMg = caffeineMg;
            if (name || caffeineMg) updateData.drink = { disconnect: true };

            const updatedEntry = await withDbErrorHandling(
                ctx.db.caffeineEntry.update({ where: { id }, data: updateData }),
                'Failed to update entry'
            );

            const dailyTotals = await withDbErrorHandling(
                calculateDailyTotals(ctx.db, ctx.session.user.id, updatedEntry.consumedAt),
                'Failed to calculate daily totals'
            );

            return {
                success: true,
                entry: {
                    id: updatedEntry.id,
                    consumed_at: updatedEntry.consumedAt.toISOString(),
                    name: updatedEntry.name,
                    caffeine_mg: toNumber(updatedEntry.caffeineMg)!,
                    drink_id: updatedEntry.drinkId,
                },
                over_limit: dailyTotals.overLimit,
                remaining_mg: toNumber(dailyTotals.remainingMg),
            };
        }),

    delete: protectedProcedure
        .input(z.object({
            id: z.string().uuid(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id } = input;

            const existingEntry = await withDbErrorHandling(
                ctx.db.caffeineEntry.findUnique({ where: { id, userId: ctx.session.user.id } }),
                'Failed to fetch entry'
            );

            if (!existingEntry) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Entry not found or you do not have permission to delete it',
                });
            }

            await withDbErrorHandling(
                ctx.db.caffeineEntry.delete({ where: { id } }),
                'Failed to delete entry'
            );

            return { success: true };
        }),
}); 