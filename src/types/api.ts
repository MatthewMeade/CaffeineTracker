/**
 * Shared API response types for the entries router
 */

/**
 * Base entry response type used across all entry-related API responses
 */
export type EntryApiResponse = {
  id: string;
  consumed_at: string; // ISO string
  name: string;
  caffeine_mg: number; // Decimal values are serialized as numbers in the API
  drink_id: string | null;
};

/**
 * Response type for the getDaily procedure
 */
export type DailyEntriesApiResponse = {
  entries: EntryApiResponse[];
  daily_total_mg: number; // Decimal values are serialized as numbers in the API
  over_limit: boolean;
  daily_limit_mg: number | null; // Decimal values are serialized as numbers in the API
};

/**
 * Response type for the list procedure
 */
export type ListEntriesApiResponse = {
  entries: EntryApiResponse[];
  has_more: boolean;
  total: number;
};

/**
 * Response type for the create/update procedures
 */
export type EntryMutationResponse = {
  success: boolean;
  entry: EntryApiResponse;
  over_limit: boolean;
  remaining_mg: number | null; // Can be null if no daily limit is set
};

/**
 * Response type for the getGraphData procedure
 */
export type GraphDataApiResponse = {
  data: Array<{
    date: string; // YYYY-MM-DD format
    total_mg: number; // Decimal values are serialized as numbers in the API
    limit_exceeded: boolean;
    limit_mg: number | null; // Decimal values are serialized as numbers in the API
  }>;
};
