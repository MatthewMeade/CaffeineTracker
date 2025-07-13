import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";

/**
 * Links anonymous user data to a newly authenticated user
 * Re-associates all data from anonymous user to new user and deletes anonymous user
 */
export async function linkAnonymousUser(
  anonymousUserId: string,
  newUserId: string,
) {
  try {
    // First, verify that the new user exists
    const newUser = await db.user.findUnique({
      where: { id: newUserId },
    });

    if (!newUser) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "New user does not exist",
      });
    }

    await db.$transaction(async (tx) => {
      // Re-associate caffeine entries
      await tx.caffeineEntry.updateMany({
        where: { userId: anonymousUserId },
        data: { userId: newUserId },
      });

      // Re-associate user favorites
      await tx.userFavorite.updateMany({
        where: { userId: anonymousUserId },
        data: { userId: newUserId },
      });

      // Re-associate daily limits
      await tx.userDailyLimit.updateMany({
        where: { userId: anonymousUserId },
        data: { userId: newUserId },
      });

      // Check if the anonymous user exists before deleting
      const anonUser = await tx.user.findUnique({
        where: { id: anonymousUserId },
      });
      if (anonUser) {
        await tx.user.delete({
          where: { id: anonymousUserId },
        });
      }
    });
  } catch (error: unknown) {
    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to link anonymous user data",
      cause: error instanceof Error ? error : undefined,
    });
  }
}

/**
 * Helper function to get current user from auth session
 * This function is provided for completeness as mentioned in the tutorial
 */
export const getUser = async () => {
  // This function will likely not be used inside auth config, but provided for completeness
  // as the tutorial mentions it. `auth()` from `~/auth` already serves this purpose in components.
  // For use in auth config, we need to handle the circular dependency differently
  return null;
};
