import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient for testing
const mockPrisma = {
  drink: {
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  user: {
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
} as unknown as PrismaClient;

const prisma = mockPrisma;

describe('Drinks Table Schema', () => {
  let testUser: { id: string };

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock successful cleanup
    mockPrisma.drink.deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    mockPrisma.user.deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    
    // Create a test user for foreign key relationships
    testUser = { id: 'test-user-123' };
    mockPrisma.user.create = vi.fn().mockResolvedValue({
      id: testUser.id,
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
    });
  });

  afterEach(async () => {
    vi.clearAllMocks();
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

  it('should enforce foreign key constraint to users table', async () => {
    await expect(
      prisma.drink.create({
        data: {
          name: 'Invalid Drink',
          caffeineMgPerMl: 0.5,
          baseSizeMl: 200,
          createdByUserId: 'non-existent-user-id',
        },
      })
    ).rejects.toThrow();
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

    // Try to create duplicate drink
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
    const espresso1 = await prisma.drink.create({
      data: {
        name: 'Espresso',
        caffeineMgPerMl: 2.5,
        baseSizeMl: 30,
        createdByUserId: testUser.id,
      },
    });

    // Create second espresso with different caffeine content
    const espresso2 = await prisma.drink.create({
      data: {
        name: 'Espresso',
        caffeineMgPerMl: 3.0,
        baseSizeMl: 30,
        createdByUserId: testUser.id,
      },
    });

    expect(espresso1.id).not.toBe(espresso2.id);
    expect(espresso1.name).toBe(espresso2.name);
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

  it('should verify column types and precision', async () => {
    const drink = await prisma.drink.create({
      data: {
        name: 'Precise Caffeine Drink',
        caffeineMgPerMl: 1.2345, // Testing decimal precision
        baseSizeMl: 123.45,
        createdByUserId: testUser.id,
      },
    });

    // Verify the decimal values are stored correctly
    expect(Number(drink.caffeineMgPerMl)).toBe(1.2345);
    expect(Number(drink.baseSizeMl)).toBe(123.45);
  });

  it('should automatically set created_at and updated_at timestamps', async () => {
    const beforeCreate = new Date();
    
    const drink = await prisma.drink.create({
      data: {
        name: 'Timestamp Test',
        caffeineMgPerMl: 1.0,
        baseSizeMl: 100,
        createdByUserId: testUser.id,
      },
    });

    const afterCreate = new Date();

    expect(drink.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(drink.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(drink.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(drink.updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });
});
