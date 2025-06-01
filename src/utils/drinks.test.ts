import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../test/setup';

describe('Drinks Table Schema', () => {
  let testUser: { id: string };

  beforeEach(async () => {
    // Create a test user for foreign key relationships
    testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
      },
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

  it('should enforce unique constraint on name, caffeine_mg_per_ml, and base_size_ml', async () => {
    // Create first drink
    await prisma.drink.create({
      data: {
        name: 'Espresso',
        caffeineMgPerMl: 2.5,
        baseSizeMl: 30,
        createdByUserId: testUser.id,
      },
    });

    // Try to create another drink with same properties
    await expect(
      prisma.drink.create({
        data: {
          name: 'Espresso',
          caffeineMgPerMl: 2.5,
          baseSizeMl: 30,
          createdByUserId: testUser.id,
        },
      })
    ).rejects.toThrow();
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

    expect(drink.baseSizeMl).toBeNull();
  });
});
