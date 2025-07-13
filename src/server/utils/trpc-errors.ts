import { TRPCError } from "@trpc/server";

export const withDbErrorHandling = <T>(
  promise: Promise<T>,
  message: string,
): Promise<T> => {
  return promise.catch((error) => {
    if (error instanceof TRPCError) throw error;

    // Handle Prisma unique constraint errors
    if (
      error instanceof Error &&
      typeof error.message === "string" &&
      error.message.includes("Unique constraint failed")
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A favorite with this name and caffeine content already exists",
        cause: error,
      });
    }

    // Handle Prisma foreign key constraint errors
    if (
      error instanceof Error &&
      typeof error.message === "string" &&
      error.message.includes("Foreign key constraint")
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid reference to related data",
        cause: error,
      });
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message,
      cause: error,
    });
  });
};
