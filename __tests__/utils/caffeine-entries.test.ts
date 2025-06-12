// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { type User, type PrismaClient } from '@prisma/client';

describe('CaffeineEntries Table', () => {
  let testUser: User;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
    testUser = await prisma.user.create({
      data: {
        email: `test-caffeine-${Date.now()}@example.com`,
        name: 'Test User',
      },
    });
  });

  afterEach(async () => {
    await prisma.caffeineEntry.deleteMany({ where: { userId: testUser.id } });
    await prisma.drink.deleteMany({ where: { createdByUserId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
  });

  it('should create a caffeine entry with correct fields', async () => {
    // Create a drink to reference
    const drink = await prisma.drink.create({
      data: {
        name: 'Test Drink',
        caffeineMg: 100,
        sizeMl: 250,
        createdByUserId: testUser.id,
      },
    });
    const entry = await prisma.caffeineEntry.create({
      data: {
        userId: testUser.id,
        drinkId: drink.id,
        consumedAt: new Date(),
        name: drink.name,
        caffeineMg: drink.caffeineMg,
      },
    });

    // Basic field assertions
    expect(entry.id).toEqual(expect.any(String));
    expect(entry.userId).toBe(testUser.id);
    expect(entry.drinkId).toBe(drink.id);
    expect(entry.consumedAt).toBeInstanceOf(Date);
    expect(entry.createdAt).toBeInstanceOf(Date);
    expect(entry.name).toBe('Test Drink');
    
    // Decimal assertion - check that it exists and converts to the expected string
    expect(String(entry.caffeineMg)).toBe('100');
  });
});
