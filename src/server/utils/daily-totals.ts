import { type PrismaClient } from '@prisma/client';
import { getEffectiveDailyLimit } from '~/lib/limits';

export interface DailyTotals {
    dailyTotalMg: number;
    overLimit: boolean;
    remainingMg: number | null;
    dailyLimitMg: number | null;
}

/**
 * Calculates daily caffeine totals and limit information for a given user and date
 * @param db - Prisma client instance
 * @param userId - User ID to calculate totals for
 * @param date - Date to calculate totals for
 * @returns Promise containing daily totals and limit information
 */
export async function calculateDailyTotals(
    db: PrismaClient,
    userId: string,
    date: Date
): Promise<DailyTotals> {
    const startOfDay = new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        0, 0, 0, 0
    ));
    const endOfDay = new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        23, 59, 59, 999
    ));

    const dailyEntries = await db.caffeineEntry.findMany({
        where: {
            userId,
            consumedAt: {
                gte: startOfDay,
                lte: endOfDay,
            },
        },
    });

    const dailyTotalMg = dailyEntries.reduce((total, entry) => {
        return total + Number(entry.caffeineMg);
    }, 0);

    const dailyLimitMg = await getEffectiveDailyLimit(userId, date);
    const overLimit = dailyLimitMg !== null && dailyTotalMg > dailyLimitMg;
    const remainingMg = dailyLimitMg !== null ? dailyLimitMg - dailyTotalMg : null;

    return {
        dailyTotalMg,
        overLimit,
        remainingMg,
        dailyLimitMg,
    };
} 