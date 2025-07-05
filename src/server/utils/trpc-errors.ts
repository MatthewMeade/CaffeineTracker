import { TRPCError } from "@trpc/server";

export const withDbErrorHandling = <T>(
  promise: Promise<T>,
  message: string,
): Promise<T> => {
  return promise.catch((error) => {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message,
      cause: error,
    });
  });
};
