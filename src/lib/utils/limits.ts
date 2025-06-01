import { db } from '~/server/db';

interface DailyLimit {
    limit_mg: number;
    effective_from: Date;
}

/**
 * Gets the effective daily caffeine limit for a user on a specific date.
 * The limit is determined by finding the most recent limit setting that was
 * effective before or on the given date.
 */
export async function getEffectiveDailyLimit(
    userId: string,
    date: Date
): Promise<DailyLimit | null> {
    const limit = await db.userDailyLimit.findFirst({
        where: {
            userId,
            effectiveFrom: {
                lte: date,
            },
        },
        orderBy: {
            effectiveFrom: 'desc',
        },
    });

    if (!limit) {
        return null;
    }

    return {
        limit_mg: Number(limit.limitMg),
        effective_from: limit.effectiveFrom,
    };
} 