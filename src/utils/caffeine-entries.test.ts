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
    await prisma.user.delete({ where: { id: testUser.id } });
  });

  it('should create a caffeine entry with correct fields', async () => {
    const entry = await prisma.caffeineEntry.create({
      data: {
        userId: testUser.id,
        caffeineMg: 100,
        consumedAt: new Date(),
      },
    });
    expect(entry).toMatchObject({
      id: expect.any(String),
      userId: testUser.id,
      caffeineMg: expect.any(Object), // Decimal type
      consumedAt: expect.any(Date),
      createdAt: expect.any(Date),
    });
  });
});
