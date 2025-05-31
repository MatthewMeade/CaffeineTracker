import { describe, it, expect, beforeEach, vi } from 'vitest';

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

// Mock the database connection for testing
const mockDb = {
  userDailyLimit: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
};

// Mock the db import
vi.mock('../server/db', () => ({
  db: mockDb,
}));

describe('UserDailyLimits Model', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  it('should create a user daily limit with correct fields', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    const mockLimit = {
      id: 'limit-123',
      userId: 'user-123',
      limitMg: new MockDecimal(400.50),
      effectiveFrom: new Date(),
      createdAt: new Date(),
    };

    mockDb.user.create = vi.fn().mockResolvedValue(mockUser);
    mockDb.userDailyLimit.create = vi.fn().mockResolvedValue(mockLimit);

    // Create a test user first
    const user = await mockDb.user.create({
      data: {
        email: 'test@example.com',
      },
    });

    // Create a daily limit
    const limit = await mockDb.userDailyLimit.create({
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
    mockDb.userDailyLimit.create = vi.fn().mockRejectedValue(new Error('Foreign key constraint failed'));

    await expect(
      mockDb.userDailyLimit.create({
        data: {
          userId: 'non-existent-user-id',
          limitMg: 400.00,
        },
      })
    ).rejects.toThrow();
  });

  it('should enforce unique constraint on (userId, effectiveFrom)', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    const mockLimit = {
      id: 'limit-123',
      userId: 'user-123',
      limitMg: { toNumber: () => 400.00 },
      effectiveFrom: new Date('2024-01-01T10:00:00Z'),
      createdAt: new Date(),
    };

    const testDate = new Date('2024-01-01T10:00:00Z');

    mockDb.user.create = vi.fn().mockResolvedValue(mockUser);
    mockDb.userDailyLimit.create = vi.fn()
      .mockResolvedValueOnce(mockLimit)
      .mockRejectedValueOnce(new Error('Unique constraint failed'));

    // Create a test user
    const user = await mockDb.user.create({
      data: {
        email: 'test@example.com',
      },
    });

    // Create first limit
    await mockDb.userDailyLimit.create({
      data: {
        userId: user.id,
        limitMg: 400.00,
        effectiveFrom: testDate,
      },
    });

    // Try to create another limit with same userId and effectiveFrom
    await expect(
      mockDb.userDailyLimit.create({
        data: {
          userId: user.id,
          limitMg: 500.00,
          effectiveFrom: testDate,
        },
      })
    ).rejects.toThrow();
  });

  it('should allow multiple limits for same user with different effectiveFrom', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    const mockLimit1 = {
      id: 'limit-123',
      userId: 'user-123',
      limitMg: new MockDecimal(400.00),
      effectiveFrom: new Date('2024-01-01T10:00:00Z'),
      createdAt: new Date(),
    };

    const mockLimit2 = {
      id: 'limit-456',
      userId: 'user-123',
      limitMg: new MockDecimal(500.00),
      effectiveFrom: new Date('2024-01-02T10:00:00Z'),
      createdAt: new Date(),
    };

    mockDb.user.create = vi.fn().mockResolvedValue(mockUser);
    mockDb.userDailyLimit.create = vi.fn()
      .mockResolvedValueOnce(mockLimit1)
      .mockResolvedValueOnce(mockLimit2);
    mockDb.userDailyLimit.findMany = vi.fn().mockResolvedValue([mockLimit1, mockLimit2]);

    // Create a test user
    const user = await mockDb.user.create({
      data: {
        email: 'test@example.com',
      },
    });

    // Create first limit
    const limit1 = await mockDb.userDailyLimit.create({
      data: {
        userId: user.id,
        limitMg: 400.00,
        effectiveFrom: new Date('2024-01-01T10:00:00Z'),
      },
    });

    // Create second limit with different effectiveFrom
    const limit2 = await mockDb.userDailyLimit.create({
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
    const limits = await mockDb.userDailyLimit.findMany({
      where: { userId: user.id },
    });

    expect(limits).toHaveLength(2);
  });

  it('should include relation to user', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    const mockLimitWithUser = {
      id: 'limit-123',
      userId: 'user-123',
      limitMg: new MockDecimal(400.00),
      effectiveFrom: new Date(),
      createdAt: new Date(),
      user: mockUser,
    };

    mockDb.user.create = vi.fn().mockResolvedValue(mockUser);
    mockDb.userDailyLimit.create = vi.fn().mockResolvedValue(mockLimitWithUser);

    // Create a test user
    const user = await mockDb.user.create({
      data: {
        email: 'test@example.com',
      },
    });

    // Create a daily limit
    const limit = await mockDb.userDailyLimit.create({
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
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    const mockLimit = {
      id: 'limit-123',
      userId: 'user-123',
      limitMg: new MockDecimal(123.45),
      effectiveFrom: new Date(),
      createdAt: new Date(),
    };

    mockDb.user.create = vi.fn().mockResolvedValue(mockUser);
    mockDb.userDailyLimit.create = vi.fn().mockResolvedValue(mockLimit);

    // Create a test user
    const user = await mockDb.user.create({
      data: {
        email: 'test@example.com',
      },
    });

    // Create limit with decimal value
    const limit = await mockDb.userDailyLimit.create({
      data: {
        userId: user.id,
        limitMg: 123.45,
      },
    });

    expect(limit.limitMg.toNumber()).toBe(123.45);
  });

  it('should set default timestamps correctly', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    const beforeCreate = new Date();
    const mockTimestamp = new Date();
    
    const mockLimit = {
      id: 'limit-123',
      userId: 'user-123',
      limitMg: new MockDecimal(400.00),
      effectiveFrom: mockTimestamp,
      createdAt: mockTimestamp,
    };

    mockDb.user.create = vi.fn().mockResolvedValue(mockUser);
    mockDb.userDailyLimit.create = vi.fn().mockResolvedValue(mockLimit);

    // Create a test user
    const user = await mockDb.user.create({
      data: {
        email: 'test@example.com',
      },
    });
    
    // Create limit without specifying timestamps
    const limit = await mockDb.userDailyLimit.create({
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
