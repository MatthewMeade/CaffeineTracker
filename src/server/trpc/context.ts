import { auth } from '~/lib/auth';
import { db } from '~/server/db';

export const createContext = async () => {
    const session = await auth();

    return {
        db,
        session,
    };
};

export type Context = Awaited<ReturnType<typeof createContext>>; 