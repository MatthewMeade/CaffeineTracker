import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/trpc/trpc";
import { withDbErrorHandling } from "~/server/utils/trpc-errors";
import { TRPCError } from "@trpc/server";

export const favoritesRouter = createTRPCRouter({
  add: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        caffeineMg: z.number().positive("Caffeine amount must be positive"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const favorite = await withDbErrorHandling(
        ctx.db.userFavorite.create({
          data: {
            userId: ctx.session.user.id,
            name: input.name,
            caffeineMg: input.caffeineMg,
          },
        }),
        "Failed to create favorite",
      );

      return {
        success: true,
        favorite: {
          id: favorite.id,
          name: favorite.name,
          caffeineMg: Number(favorite.caffeineMg),
          createdAt: favorite.createdAt.toISOString(),
        },
      };
    }),

  remove: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        caffeineMg: z.number().positive("Caffeine amount must be positive"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const deletedFavorite = await withDbErrorHandling(
        ctx.db.userFavorite.deleteMany({
          where: {
            userId: ctx.session.user.id,
            name: input.name,
            caffeineMg: input.caffeineMg,
          },
        }),
        "Failed to remove favorite",
      );

      if (deletedFavorite.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Favorite not found",
        });
      }

      return { success: true };
    }),
});
