// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { type User, type PrismaClient } from '@prisma/client';

describe('Drinks Table', () => {
  let testUser: User;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
    testUser = await prisma.user.create({
      data: {
        email: `test-drinkuser-${Date.now()}@example.com`,
        name: 'Test User',
      },
    });
  });

  afterEach(async () => {
    await prisma.drink.deleteMany({ where: { createdByUserId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
  });

  it('should create a drink with correct fields', async () => {
    const drink = await prisma.drink.create({
      data: {
        name: `Test Drink ${Date.now()}`,
        caffeineMgPerMl: 0.4,
        baseSizeMl: 240,
        createdByUserId: testUser.id,
      },
    });
    expect(drink).toMatchObject({
      id: expect.any(String),
      name: expect.stringContaining('Test Drink'),
      caffeineMgPerMl: expect.any(Object), // Decimal type
      baseSizeMl: expect.any(Object), // Decimal type
      createdByUserId: testUser.id,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });

  it('should create drinks table with correct schema', async () => {
    const drink = await prisma.drink.create({
      data: {
        name: 'Coffee',
        caffeineMgPerMl: 0.4,
        baseSizeMl: 240,
        createdByUserId: testUser.id,
      },
    });

    expect(drink).toMatchObject({
      id: expect.any(String),
      name: 'Coffee',
      caffeineMgPerMl: expect.any(Object), // Decimal type
      baseSizeMl: expect.any(Object), // Decimal type
      createdByUserId: testUser.id,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });

  it('should allow duplicate drinks with same properties', async () => {
    // Create first drink
    await prisma.drink.create({
      data: {
        name: 'Espresso',
        caffeineMgPerMl: 2.5,
        baseSizeMl: 30,
        createdByUserId: testUser.id,
      },
    });

    // Create another drink with same properties - should succeed
    const duplicateDrink = await prisma.drink.create({
      data: {
        name: 'Espresso',
        caffeineMgPerMl: 2.5,
        baseSizeMl: 30,
        createdByUserId: testUser.id,
      },
    });

    expect(duplicateDrink).toMatchObject({
      id: expect.any(String),
      name: 'Espresso',
      caffeineMgPerMl: expect.any(Object),
      baseSizeMl: expect.any(Object),
      createdByUserId: testUser.id,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date)
    });
  });

  it('should allow drinks with same name but different caffeine or size', async () => {
    // Create first espresso
    const result1 = await prisma.drink.create({
      data: {
        name: 'Espresso',
        caffeineMgPerMl: 2.5,
        baseSizeMl: 30,
        createdByUserId: testUser.id,
      },
    });

    // Create second espresso with different caffeine content
    const result2 = await prisma.drink.create({
      data: {
        name: 'Espresso',
        caffeineMgPerMl: 3.0,
        baseSizeMl: 30,
        createdByUserId: testUser.id,
      },
    });

    expect(result1.id).not.toBe(result2.id);
    expect(result1.name).toBe(result2.name);
  });

  it('should handle null base_size_ml values', async () => {
    const drink = await prisma.drink.create({
      data: {
        name: 'Energy Drink',
        caffeineMgPerMl: 0.32,
        baseSizeMl: null,
        createdByUserId: testUser.id,
      },
    });

    expect(drink).toMatchObject({
      id: expect.any(String),
      name: 'Energy Drink',
      caffeineMgPerMl: expect.any(Object), // Decimal type
      baseSizeMl: null,
      createdByUserId: testUser.id,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });

    // Verify we can retrieve the drink with null baseSizeMl
    const retrievedDrink = await prisma.drink.findUnique({
      where: { id: drink.id },
    });
    expect(retrievedDrink?.baseSizeMl).toBeNull();
  });
});
