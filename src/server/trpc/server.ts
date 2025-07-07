import { createContext } from "~/server/trpc/context";
import { appRouter } from "~/server/trpc/router";

export async function createCaller() {
    const context = await createContext();
    return appRouter.createCaller(context);
} 