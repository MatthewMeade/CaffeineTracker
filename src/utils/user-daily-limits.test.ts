import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';

// Mock database connection for testing
const testDb = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/caffeine_tracker_test'
});

describe('UserDailyLimits Table Schema', () => {
  beforeAll(async () => {
    // Ensure test database is clean and has required tables
    await testDb.query('DROP TABLE IF EXISTS user_daily_limits CASCADE');
    await testDb.query('DROP TABLE IF EXISTS users CASCADE');
    
    // Create users table first (required for foreign key)
    await testDb.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create user_daily_limits table
    await testDb.query(`
      CREATE TABLE user_daily_limits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        limit_mg NUMERIC(10, 2) NOT NULL,
        effective_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, effective_from)
      )
    `);
  });

  afterAll(async () => {
    await testDb.query('DROP TABLE IF EXISTS user_daily_limits CASCADE');
    await testDb.query('DROP TABLE IF EXISTS users CASCADE');
    await testDb.end();
  });

  beforeEach(async () => {
    // Clean up data between tests
    await testDb.query('DELETE FROM user_daily_limits');
    await testDb.query('DELETE FROM users');
  });

  it('should create table with correct structure', async () => {
    const result = await testDb.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'user_daily_limits'
      ORDER BY ordinal_position
    `);

    expect(result.rows).toHaveLength(5);
    
    const columns = result.rows.reduce((acc, row) => {
      acc[row.column_name] = {
        data_type: row.data_type,
        is_nullable: row.is_nullable,
        column_default: row.column_default
      };
      return acc;
    }, {});

    expect(columns.id.data_type).toBe('uuid');
    expect(columns.id.is_nullable).toBe('NO');
    expect(columns.id.column_default).toContain('gen_random_uuid()');

    expect(columns.user_id.data_type).toBe('uuid');
    expect(columns.user_id.is_nullable).toBe('NO');

    expect(columns.limit_mg.data_type).toBe('numeric');
    expect(columns.limit_mg.is_nullable).toBe('NO');

    expect(columns.effective_from.data_type).toBe('timestamp with time zone');
    expect(columns.effective_from.is_nullable).toBe('YES');
    expect(columns.effective_from.column_default).toContain('CURRENT_TIMESTAMP');

    expect(columns.created_at.data_type).toBe('timestamp with time zone');
    expect(columns.created_at.is_nullable).toBe('YES');
    expect(columns.created_at.column_default).toContain('CURRENT_TIMESTAMP');
  });

  it('should have primary key constraint on id', async () => {
    const result = await testDb.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'user_daily_limits' AND constraint_type = 'PRIMARY KEY'
    `);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].constraint_type).toBe('PRIMARY KEY');
  });

  it('should have foreign key constraint on user_id', async () => {
    const result = await testDb.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'user_daily_limits' AND constraint_type = 'FOREIGN KEY'
    `);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].constraint_type).toBe('FOREIGN KEY');

    // Verify foreign key references users table
    const fkResult = await testDb.query(`
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.constraint_column_usage ccu
        ON kcu.constraint_name = ccu.constraint_name
      WHERE kcu.table_name = 'user_daily_limits'
        AND kcu.column_name = 'user_id'
    `);

    expect(fkResult.rows).toHaveLength(1);
    expect(fkResult.rows[0].foreign_table_name).toBe('users');
    expect(fkResult.rows[0].foreign_column_name).toBe('id');
  });

  it('should have unique constraint on (user_id, effective_from)', async () => {
    const result = await testDb.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'user_daily_limits' AND constraint_type = 'UNIQUE'
    `);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].constraint_type).toBe('UNIQUE');

    // Verify the unique constraint columns
    const uniqueResult = await testDb.query(`
      SELECT column_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'user_daily_limits'
        AND constraint_name = $1
      ORDER BY ordinal_position
    `, [result.rows[0].constraint_name]);

    const columnNames = uniqueResult.rows.map(row => row.column_name);
    expect(columnNames).toEqual(['user_id', 'effective_from']);
  });

  it('should enforce foreign key constraint', async () => {
    // Try to insert a limit with non-existent user_id
    await expect(
      testDb.query(`
        INSERT INTO user_daily_limits (user_id, limit_mg)
        VALUES ('00000000-0000-0000-0000-000000000000', 400.00)
      `)
    ).rejects.toThrow();
  });

  it('should enforce unique constraint on (user_id, effective_from)', async () => {
    // First create a user
    const userResult = await testDb.query(`
      INSERT INTO users (email) VALUES ('test@example.com') RETURNING id
    `);
    const userId = userResult.rows[0].id;

    const testTimestamp = '2024-01-01 10:00:00+00';

    // Insert first limit
    await testDb.query(`
      INSERT INTO user_daily_limits (user_id, limit_mg, effective_from)
      VALUES ($1, 400.00, $2)
    `, [userId, testTimestamp]);

    // Try to insert another limit with same user_id and effective_from
    await expect(
      testDb.query(`
        INSERT INTO user_daily_limits (user_id, limit_mg, effective_from)
        VALUES ($1, 500.00, $2)
      `, [userId, testTimestamp])
    ).rejects.toThrow();
  });

  it('should allow multiple limits for same user with different effective_from', async () => {
    // First create a user
    const userResult = await testDb.query(`
      INSERT INTO users (email) VALUES ('test@example.com') RETURNING id
    `);
    const userId = userResult.rows[0].id;

    // Insert first limit
    await testDb.query(`
      INSERT INTO user_daily_limits (user_id, limit_mg, effective_from)
      VALUES ($1, 400.00, '2024-01-01 10:00:00+00')
    `, [userId]);

    // Insert second limit with different effective_from
    await testDb.query(`
      INSERT INTO user_daily_limits (user_id, limit_mg, effective_from)
      VALUES ($1, 500.00, '2024-01-02 10:00:00+00')
    `, [userId]);

    // Verify both records exist
    const result = await testDb.query(`
      SELECT COUNT(*) as count FROM user_daily_limits WHERE user_id = $1
    `, [userId]);

    expect(parseInt(result.rows[0].count)).toBe(2);
  });

  it('should set default values for timestamps', async () => {
    // First create a user
    const userResult = await testDb.query(`
      INSERT INTO users (email) VALUES ('test@example.com') RETURNING id
    `);
    const userId = userResult.rows[0].id;

    // Insert limit without specifying timestamps
    const insertResult = await testDb.query(`
      INSERT INTO user_daily_limits (user_id, limit_mg)
      VALUES ($1, 400.00)
      RETURNING effective_from, created_at
    `, [userId]);

    const row = insertResult.rows[0];
    expect(row.effective_from).toBeInstanceOf(Date);
    expect(row.created_at).toBeInstanceOf(Date);
    
    // Timestamps should be recent (within last minute)
    const now = new Date();
    const timeDiff = now.getTime() - row.created_at.getTime();
    expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
  });

  it('should store numeric values with correct precision', async () => {
    // First create a user
    const userResult = await testDb.query(`
      INSERT INTO users (email) VALUES ('test@example.com') RETURNING id
    `);
    const userId = userResult.rows[0].id;

    // Insert limit with decimal value
    await testDb.query(`
      INSERT INTO user_daily_limits (user_id, limit_mg)
      VALUES ($1, 123.45)
    `, [userId]);

    const result = await testDb.query(`
      SELECT limit_mg FROM user_daily_limits WHERE user_id = $1
    `, [userId]);

    expect(parseFloat(result.rows[0].limit_mg)).toBe(123.45);
  });
});
