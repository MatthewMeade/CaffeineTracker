import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '~/server/trpc/trpc';

export const userRouter = createTRPCRouter({
    me: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const user = await ctx.db.user.findUnique({
                    where: { id: ctx.session.user.id },
                    select: {
                        id: true,
                        email: true,
                        createdAt: true,
                    },
                });

                if (!user) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'User not found',
                    });
                }

                return user;
            } catch (error) {
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch user data',
                    cause: error,
                });
            }
        }),
}); 