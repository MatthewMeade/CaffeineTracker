import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('CaffeineEntries Table Schema', () => {
  let testUser: { id: string };
  let testDrink: { id: string };

  beforeEach(async () => {
    // Clean up any existing test data first
    await prisma.caffeineEntry.deleteMany();
    await prisma.drink.deleteMany();
    await prisma.user.deleteMany();
    
    // Create a test user for foreign key relationships
    testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
      },
    });

    // Create a test drink for optional foreign key relationships
    testDrink = await prisma.drink.create({
      data: {
        name: 'Test Coffee',
        caffeineMgPerMl: 0.4,
        baseSizeMl: 240,
        createdByUserId: testUser.id,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.caffeineEntry.deleteMany();
    await prisma.drink.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should create caffeine_entries table with correct schema', async () => {
    const entry = await prisma.caffeineEntry.create({
      data: {
        userId: testUser.id,
        drinkId: testDrink.id,
        caffeineMg: 96.0,
        consumedAt: new Date('2024-01-01T10:00:00Z'),
      },
    });

    expect(entry).toMatchObject({
      id: expect.any(String),
      userId: testUser.id,
      drinkId: testDrink.id,
      caffeineMg: expect.any(Object), // Decimal type
      consumedAt: expect.any(Date),
      createdAt: expect.any(Date),
    });
  });

  it('should enforce foreign key constraint to users table', async () => {
    await expect(
      prisma.caffeineEntry.create({
        data: {
          userId: 'non-existent-user-id',
          caffeineMg: 50.0,
          consumedAt: new Date(),
        },
      })
    ).rejects.toThrow();
  });

  it('should allow optional drink_id (can be null)', async () => {
    const entry = await prisma.caffeineEntry.create({
      data: {
        userId: testUser.id,
        drinkId: null,
        caffeineMg: 75.5,
        consumedAt: new Date('2024-01-01T14:30:00Z'),
      },
    });

    expect(entry.drinkId).toBeNull();
    expect(Number(entry.caffeineMg)).toBe(75.5);
  });

  it('should enforce foreign key constraint to drinks table when drink_id is provided', async () => {
    await expect(
      prisma.caffeineEntry.create({
        data: {
          userId: testUser.id,
          drinkId: 'non-existent-drink-id',
          caffeineMg: 50.0,
          consumedAt: new Date(),
        },
      })
    ).rejects.toThrow();
  });

  it('should require caffeine_mg and consumed_at fields', async () => {
    // Test missing caffeine_mg
    await expect(
      prisma.caffeineEntry.create({
        data: {
          userId: testUser.id,
          consumedAt: new Date(),
          // caffeineMg is missing
        } as any,
      })
    ).rejects.toThrow();

    // Test missing consumed_at
    await expect(
      prisma.caffeineEntry.create({
        data: {
          userId: testUser.id,
          caffeineMg: 50.0,
          // consumedAt is missing
        } as any,
      })
    ).rejects.toThrow();
  });

  it('should verify decimal precision for caffeine_mg', async () => {
    const entry = await prisma.caffeineEntry.create({
      data: {
        userId: testUser.id,
        caffeineMg: 123.45,
        consumedAt: new Date('2024-01-01T16:00:00Z'),
      },
    });

    // Verify the decimal value is stored correctly
    expect(Number(entry.caffeineMg)).toBe(123.45);
  });

  it('should automatically set created_at timestamp', async () => {
    const beforeCreate = new Date();
    
    const entry = await prisma.caffeineEntry.create({
      data: {
        userId: testUser.id,
        caffeineMg: 80.0,
        consumedAt: new Date('2024-01-01T12:00:00Z'),
      },
    });

    const afterCreate = new Date();

    expect(entry.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(entry.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });

  it('should allow multiple entries for the same user', async () => {
    const entry1 = await prisma.caffeineEntry.create({
      data: {
        userId: testUser.id,
        caffeineMg: 50.0,
        consumedAt: new Date('2024-01-01T08:00:00Z'),
      },
    });

    const entry2 = await prisma.caffeineEntry.create({
      data: {
        userId: testUser.id,
        caffeineMg: 75.0,
        consumedAt: new Date('2024-01-01T12:00:00Z'),
      },
    });

    expect(entry1.id).not.toBe(entry2.id);
    expect(entry1.userId).toBe(entry2.userId);
  });

  it('should support querying entries with drink information', async () => {
    const entry = await prisma.caffeineEntry.create({
      data: {
        userId: testUser.id,
        drinkId: testDrink.id,
        caffeineMg: 96.0,
        consumedAt: new Date('2024-01-01T10:00:00Z'),
      },
    });

    const entryWithDrink = await prisma.caffeineEntry.findUnique({
      where: { id: entry.id },
      include: { drink: true, user: true },
    });

    expect(entryWithDrink?.drink?.name).toBe('Test Coffee');
    expect(entryWithDrink?.user?.email).toBe(testUser.email);
  });
});
