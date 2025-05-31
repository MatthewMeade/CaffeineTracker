import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../db';

describe('Users Table Schema', () => {
  beforeAll(async () => {
    // Ensure the database is connected
    await db.$connect();
  });

  afterAll(async () => {
    // Clean up database connection
    await db.$disconnect();
  });

  it('should create users table with correct schema', async () => {
    // Test that we can create a user with the expected schema
    const testEmail = `test-${Date.now()}@example.com`;
    
    const user = await db.user.create({
      data: {
        email: testEmail,
      },
    });

    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(typeof user.id).toBe('string');
    expect(user.email).toBe(testEmail);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);

    // Clean up
    await db.user.delete({
      where: { id: user.id },
    });
  });

  it('should enforce unique email constraint', async () => {
    const testEmail = `unique-test-${Date.now()}@example.com`;
    
    // Create first user
    const user1 = await db.user.create({
      data: {
        email: testEmail,
      },
    });

    // Try to create second user with same email - should fail
    await expect(
      db.user.create({
        data: {
          email: testEmail,
        },
      })
    ).rejects.toThrow();

    // Clean up
    await db.user.delete({
      where: { id: user1.id },
    });
  });

  it('should auto-generate CUID for id field', async () => {
    const testEmail = `cuid-test-${Date.now()}@example.com`;
    
    const user = await db.user.create({
      data: {
        email: testEmail,
      },
    });

    // CUID should be a string with specific format (starts with 'c')
    expect(user.id).toMatch(/^c[a-z0-9]{24}$/);

    // Clean up
    await db.user.delete({
      where: { id: user.id },
    });
  });

  it('should automatically set created_at and updated_at timestamps', async () => {
    const testEmail = `timestamp-test-${Date.now()}@example.com`;
    const beforeCreate = new Date();
    
    const user = await db.user.create({
      data: {
        email: testEmail,
      },
    });

    const afterCreate = new Date();

    expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(user.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(user.updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

    // Clean up
    await db.user.delete({
      where: { id: user.id },
    });
  });

  it('should update updated_at timestamp on record update', async () => {
    const testEmail = `update-test-${Date.now()}@example.com`;
    
    const user = await db.user.create({
      data: {
        email: testEmail,
      },
    });

    const originalUpdatedAt = user.updatedAt;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100));

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        name: 'Updated Name',
      },
    });

    expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());

    // Clean up
    await db.user.delete({
      where: { id: user.id },
    });
  });
});
