import { createTRPCRouter, protectedProcedure } from '~/server/trpc/trpc';

export const userRouter = createTRPCRouter({
    me: protectedProcedure
        .query(async ({ ctx }) => {
            const user = await ctx.db.user.findUnique({
                where: { id: ctx.session.user.id },
                select: {
                    id: true,
                    email: true,
                    createdAt: true,
                },
            });

            return user;
        }),
}); 