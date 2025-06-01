import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../test/setup';
import { type User } from '@prisma/client';

describe('UserDailyLimits Model', () => {
  let testUser: User;

  beforeEach(async () => {
    // Create a test user for foreign key relationships
    testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
      },
    });
  });

  it('should create a user daily limit with correct fields', async () => {
    const limit = await prisma.userDailyLimit.create({
      data: {
        userId: testUser.id,
        limitMg: 400.50,
      },
    });

    expect(limit).toMatchObject({
      id: expect.any(String),
      userId: testUser.id,
      limitMg: expect.any(Object), // Decimal type
      effectiveFrom: expect.any(Date),
      createdAt: expect.any(Date),
    });
  });

  it('should enforce foreign key constraint on userId', async () => {
    await expect(
      prisma.userDailyLimit.create({
        data: {
          userId: 'non-existent-user-id',
          limitMg: 400.00,
        },
      })
    ).rejects.toThrow();
  });

  it('should enforce unique constraint on (userId, effectiveFrom)', async () => {
    const testDate = new Date('2024-01-01T10:00:00Z');

    // Create first limit
    await prisma.userDailyLimit.create({
      data: {
        userId: testUser.id,
        limitMg: 400.00,
        effectiveFrom: testDate,
      },
    });

    // Try to create another limit with same userId and effectiveFrom
    await expect(
      prisma.userDailyLimit.create({
        data: {
          userId: testUser.id,
          limitMg: 500.00,
          effectiveFrom: testDate,
        },
      })
    ).rejects.toThrow();
  });

  it('should allow multiple limits for same user with different effectiveFrom', async () => {
    // Create first limit
    const limit1 = await prisma.userDailyLimit.create({
      data: {
        userId: testUser.id,
        limitMg: 400.00,
        effectiveFrom: new Date('2024-01-01T10:00:00Z'),
      },
    });

    // Create second limit with different effectiveFrom
    const limit2 = await prisma.userDailyLimit.create({
      data: {
        userId: testUser.id,
        limitMg: 500.00,
        effectiveFrom: new Date('2024-01-02T10:00:00Z'),
      },
    });

    expect(limit1.id).not.toBe(limit2.id);
    expect(limit1.limitMg.toNumber()).toBe(400.00);
    expect(limit2.limitMg.toNumber()).toBe(500.00);

    // Verify both records exist
    const limits = await prisma.userDailyLimit.findMany({
      where: { userId: testUser.id },
    });

    expect(limits).toHaveLength(2);
  });

  it('should include relation to user', async () => {
    const limit = await prisma.userDailyLimit.create({
      data: {
        userId: testUser.id,
        limitMg: 400.00,
      },
      include: {
        user: true,
      },
    });

    expect(limit.user.id).toBe(testUser.id);
    expect(limit.user.email).toBe(testUser.email);
  });

  it('should store decimal values with correct precision', async () => {
    const limit = await prisma.userDailyLimit.create({
      data: {
        userId: testUser.id,
        limitMg: 123.45,
      },
    });

    expect(limit.limitMg.toNumber()).toBe(123.45);
  });

  it('should set default timestamps correctly', async () => {
    const beforeCreate = new Date();

    const limit = await prisma.userDailyLimit.create({
      data: {
        userId: testUser.id,
        limitMg: 400.00,
      },
    });

    const afterCreate = new Date();

    expect(limit.effectiveFrom.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(limit.effectiveFrom.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

    expect(limit.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(limit.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });
});
