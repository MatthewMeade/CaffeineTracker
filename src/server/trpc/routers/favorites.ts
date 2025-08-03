import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/trpc/trpc";
import { withDbErrorHandling } from "~/server/utils/trpc-errors";
import { TRPCError } from "@trpc/server";

export const favoritesRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const favorites = await withDbErrorHandling(
      ctx.db.userFavorite.findMany({
        where: { userId: ctx.session.user.id },
        select: {
          id: true,
          name: true,
          icon: true,
          caffeineMg: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      "Failed to fetch favorites",
    );

    return favorites.map(favorite => ({
      id: favorite.id,
      name: favorite.name,
      icon: String(favorite.icon),
      caffeineMg: Number(favorite.caffeineMg),
      createdAt: favorite.createdAt.toISOString(),
    }));
  }),

  add: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        icon: z.string().min(1, "Icon is required"),
        caffeineMg: z.number().positive("Caffeine amount must be positive"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const favorite = await withDbErrorHandling(
        ctx.db.userFavorite.create({
          data: {
            userId: ctx.session.user.id,
            name: input.name,
            icon: input.icon,
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
          icon: String(favorite.icon),
          caffeineMg: Number(favorite.caffeineMg),
          createdAt: favorite.createdAt.toISOString(),
        },
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Name is required"),
        icon: z.string().min(1, "Icon is required"),
        caffeineMg: z.number().positive("Caffeine amount must be positive"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...dataToUpdate } = input;
      const favorite = await withDbErrorHandling(
        ctx.db.userFavorite.update({
          where: {
            id,
            userId: ctx.session.user.id,
          },
          data: dataToUpdate,
        }),
        "Failed to update favorite",
      );

      return {
        success: true,
        favorite: {
          id: favorite.id,
          name: favorite.name,
          icon: String(favorite.icon),
          caffeineMg: Number(favorite.caffeineMg),
          createdAt: favorite.createdAt.toISOString(),
        },
      };
    }),

  remove: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const deletedFavorite = await withDbErrorHandling(
        ctx.db.userFavorite.deleteMany({
          where: {
            id: input.id,
            userId: ctx.session.user.id,
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
