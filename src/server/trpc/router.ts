import { createTRPCRouter } from "~/server/trpc/trpc";
import { userRouter } from "./routers/user";
import { settingsRouter } from "./routers/settings";
import { favoritesRouter } from "./routers/favorites";
import { entriesRouter } from "./routers/entries";

/**
 * This is the primary router for your server.
 *
 * All routers added in ~/server/trpc/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  settings: settingsRouter,
  favorites: favoritesRouter,
  entries: entriesRouter,
  // health: publicProcedure.query(() => 'yay!'),
});

// export type definition of API
export type AppRouter = typeof appRouter;
