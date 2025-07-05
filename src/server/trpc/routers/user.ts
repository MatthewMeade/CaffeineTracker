import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/trpc/trpc";
import { withDbErrorHandling } from "~/server/utils/trpc-errors";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await withDbErrorHandling(
      ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      }),
      "Failed to fetch user data",
    );

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),
});
