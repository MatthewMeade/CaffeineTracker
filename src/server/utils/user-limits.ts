import { prisma } from '~/lib/prisma';

/**
 * Gets the effective daily caffeine limit for a user on a specific date.
 * The limit returned will be the most recent limit that was effective before or on the start of the given date.
 * 
 * @param userId - The ID of the user to get the limit for
 * @param date - The date to get the effective limit for
 * @returns The effective limit in mg, or null if no limit exists
 */
export async function getEffectiveDailyLimit(userId: string, date: Date): Promise<number | null> {
    // Get the start of the given date (midnight UTC)
    const startOfDay = new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        0, 0, 0, 0
    ));

    // Find the most recent limit that was effective before or on the start of the given date
    const limit = await prisma.userDailyLimit.findFirst({
        where: {
            userId: userId,
            effectiveFrom: {
                lte: startOfDay
            }
        },
        orderBy: {
            effectiveFrom: 'desc'
        }
    });

    return limit?.limitMg ? Number(limit.limitMg) : null;
} 