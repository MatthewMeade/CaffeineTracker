-- Create user_daily_limits table
CREATE TABLE user_daily_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    limit_mg NUMERIC(10, 2) NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, effective_from)
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_user_daily_limits_user_id ON user_daily_limits(user_id);

-- Create index on effective_from for date-based queries
CREATE INDEX idx_user_daily_limits_effective_from ON user_daily_limits(effective_from);
