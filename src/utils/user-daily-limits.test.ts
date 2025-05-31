import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '~/server/db';

describe('UserDailyLimits Model', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.userDailyLimit.deleteMany();
    await db.user.deleteMany();
  });

  it('should create a user daily limit with correct fields', async () => {
    // Create a test user first
    const user = await db.user.create({
      data: {
        email: 'test@example.com',
      },
    });

    // Create a daily limit
    const limit = await db.userDailyLimit.create({
      data: {
        userId: user.id,
        limitMg: 400.50,
      },
    });

    expect(limit.id).toBeDefined();
    expect(limit.userId).toBe(user.id);
    expect(limit.limitMg.toNumber()).toBe(400.50);
    expect(limit.effectiveFrom).toBeInstanceOf(Date);
    expect(limit.createdAt).toBeInstanceOf(Date);
  });

  it('should enforce foreign key constraint on userId', async () => {
    await expect(
      db.userDailyLimit.create({
        data: {
          userId: 'non-existent-user-id',
          limitMg: 400.00,
        },
      })
    ).rejects.toThrow();
  });

  it('should enforce unique constraint on (userId, effectiveFrom)', async () => {
    // Create a test user
    const user = await db.user.create({
      data: {
        email: 'test@example.com',
      },
    });

    const testDate = new Date('2024-01-01T10:00:00Z');

    // Create first limit
    await db.userDailyLimit.create({
      data: {
        userId: user.id,
        limitMg: 400.00,
        effectiveFrom: testDate,
      },
    });

    // Try to create another limit with same userId and effectiveFrom
    await expect(
      db.userDailyLimit.create({
        data: {
          userId: user.id,
          limitMg: 500.00,
          effectiveFrom: testDate,
        },
      })
    ).rejects.toThrow();
  });

  it('should allow multiple limits for same user with different effectiveFrom', async () => {
    // Create a test user
    const user = await db.user.create({
      data: {
        email: 'test@example.com',
      },
    });

    // Create first limit
    const limit1 = await db.userDailyLimit.create({
      data: {
        userId: user.id,
        limitMg: 400.00,
        effectiveFrom: new Date('2024-01-01T10:00:00Z'),
      },
    });

    // Create second limit with different effectiveFrom
    const limit2 = await db.userDailyLimit.create({
      data: {
        userId: user.id,
        limitMg: 500.00,
        effectiveFrom: new Date('2024-01-02T10:00:00Z'),
      },
    });

    expect(limit1.id).not.toBe(limit2.id);
    expect(limit1.limitMg.toNumber()).toBe(400.00);
    expect(limit2.limitMg.toNumber()).toBe(500.00);

    // Verify both records exist
    const limits = await db.userDailyLimit.findMany({
      where: { userId: user.id },
    });

    expect(limits).toHaveLength(2);
  });

  it('should include relation to user', async () => {
    // Create a test user
    const user = await db.user.create({
      data: {
        email: 'test@example.com',
      },
    });

    // Create a daily limit
    const limit = await db.userDailyLimit.create({
      data: {
        userId: user.id,
        limitMg: 400.00,
      },
      include: {
        user: true,
      },
    });

    expect(limit.user.id).toBe(user.id);
    expect(limit.user.email).toBe('test@example.com');
  });

  it('should store decimal values with correct precision', async () => {
    // Create a test user
    const user = await db.user.create({
      data: {
        email: 'test@example.com',
      },
    });

    // Create limit with decimal value
    const limit = await db.userDailyLimit.create({
      data: {
        userId: user.id,
        limitMg: 123.45,
      },
    });

    expect(limit.limitMg.toNumber()).toBe(123.45);
  });

  it('should set default timestamps correctly', async () => {
    // Create a test user
    const user = await db.user.create({
      data: {
        email: 'test@example.com',
      },
    });

    const beforeCreate = new Date();
    
    // Create limit without specifying timestamps
    const limit = await db.userDailyLimit.create({
      data: {
        userId: user.id,
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
