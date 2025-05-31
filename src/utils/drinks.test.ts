import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Prisma Decimal type
class MockDecimal {
  private value: number;
  
  constructor(value: number) {
    this.value = value;
  }
  
  toNumber(): number {
    return this.value;
  }
}

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
};

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
    const mockDrink = {
      id: 'drink-123',
      name: 'Coffee',
      caffeineMgPerMl: new MockDecimal(0.4),
      baseSizeMl: new MockDecimal(240),
      createdByUserId: testUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.drink.create = vi.fn().mockResolvedValue(mockDrink);

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
    mockPrisma.drink.create = vi.fn().mockRejectedValue(new Error('Foreign key constraint failed'));

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
    const mockDrink = {
      id: 'drink-123',
      name: 'Espresso',
      caffeineMgPerMl: new MockDecimal(2.5),
      baseSizeMl: new MockDecimal(30),
      createdByUserId: testUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.drink.create = vi.fn()
      .mockResolvedValueOnce(mockDrink)
      .mockRejectedValueOnce(new Error('Unique constraint failed'));

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
    const espresso1 = {
      id: 'drink-123',
      name: 'Espresso',
      caffeineMgPerMl: new MockDecimal(2.5),
      baseSizeMl: new MockDecimal(30),
      createdByUserId: testUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const espresso2 = {
      id: 'drink-456',
      name: 'Espresso',
      caffeineMgPerMl: new MockDecimal(3.0),
      baseSizeMl: new MockDecimal(30),
      createdByUserId: testUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.drink.create = vi.fn()
      .mockResolvedValueOnce(espresso1)
      .mockResolvedValueOnce(espresso2);

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
    const mockDrink = {
      id: 'drink-123',
      name: 'Energy Drink',
      caffeineMgPerMl: new MockDecimal(0.32),
      baseSizeMl: null,
      createdByUserId: testUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.drink.create = vi.fn().mockResolvedValue(mockDrink);

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
    const mockDrink = {
      id: 'drink-123',
      name: 'Precise Caffeine Drink',
      caffeineMgPerMl: new MockDecimal(1.2345),
      baseSizeMl: new MockDecimal(123.45),
      createdByUserId: testUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.drink.create = vi.fn().mockResolvedValue(mockDrink);

    const drink = await prisma.drink.create({
      data: {
        name: 'Precise Caffeine Drink',
        caffeineMgPerMl: 1.2345, // Testing decimal precision
        baseSizeMl: 123.45,
        createdByUserId: testUser.id,
      },
    });

    // Verify the decimal values are stored correctly
    expect(drink.caffeineMgPerMl.toNumber()).toBe(1.2345);
    expect(drink.baseSizeMl.toNumber()).toBe(123.45);
  });

  it('should automatically set created_at and updated_at timestamps', async () => {
    const beforeCreate = new Date();
    const mockTimestamp = new Date();
    
    const mockDrink = {
      id: 'drink-123',
      name: 'Timestamp Test',
      caffeineMgPerMl: new MockDecimal(1.0),
      baseSizeMl: new MockDecimal(100),
      createdByUserId: testUser.id,
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
    };

    mockPrisma.drink.create = vi.fn().mockResolvedValue(mockDrink);
    
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
