import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/trpc/trpc';

export const settingsRouter = createTRPCRouter({
    getLimit: protectedProcedure
        .query(async ({ ctx }) => {
            const limits = await ctx.db.userDailyLimit.findMany({
                where: { userId: ctx.session.user.id },
                orderBy: { effectiveFrom: 'desc' },
            });

            const now = new Date();
            const currentLimit = limits.find((limit) => limit.effectiveFrom <= now);

            return {
                current_limit_mg: currentLimit?.limitMg ?? null,
                history: limits.map((limit) => ({
                    limit_mg: limit.limitMg,
                    effective_from: limit.effectiveFrom,
                })),
            };
        }),

    setLimit: protectedProcedure
        .input(z.object({
            limit_mg: z.number().nonnegative(),
        }))
        .mutation(async ({ ctx, input }) => {
            const newLimit = await ctx.db.userDailyLimit.create({
                data: {
                    userId: ctx.session.user.id,
                    limitMg: input.limit_mg,
                },
            });

            return {
                success: true,
                new_limit: {
                    id: newLimit.id,
                    user_id: newLimit.userId,
                    limit_mg: newLimit.limitMg,
                    effective_from: newLimit.effectiveFrom,
                },
            };
        }),
}); 