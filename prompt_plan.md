# Prompt Plan: Caffeine Tracker Web App

This document outlines the prompts for an AI Coder to build the Caffeine Tracker web application as specified in `spec.md`. Each prompt represents a focused task. The AI Coder MUST adhere to the **"CRITICAL PROJECT STANDARDS & RULES"** provided separately for all implementation details (e.g., routing, database interaction, testing conventions, component structure).

---

## Prompt 1: Project Initialization and Basic Setup

**Objective:** Initialize a new Next.js project and set up essential development tools.
**Addresses:** `spec.md` Section 3 (Technical Architecture - Next.js, PostgreSQL).

**Instructions for the AI Coder:**
Your task is to set up the foundational Next.js project.
1.  Initialize a new Next.js project with TypeScript support.
2.  Set up ESLint and Prettier with common recommended configurations for Next.js and TypeScript. Include relevant npm scripts (e.g., `lint`, `format`).
3.  Establish a database connection utility for PostgreSQL, designed according to project standards (which should specify using Prisma). This utility will be used by other parts of the application. Connection details are to be managed via environment variables.
4.  Create a basic `.env.example` file listing required environment variables (e.g., `DATABASE_URL`).
5.  Write a simple test for the database connection/query capability, adhering to project testing standards.

---

## Prompt 2: Database Schema Implementation - Users Table

**Objective:** Define and create the `users` table structure in the database.
**Addresses:** `spec.md` Section 4 (Data Model - Users Table).

**Instructions for the AI Coder:**
Your task is to implement the `users` table schema using the project's standard data modeling and migration tools (e.g., Prisma).
1.  Define and apply a migration for the `users` table with the following schema:
    * `id`: UUID, Primary Key, Default: `gen_random_uuid()` (or equivalent standard UUID generation).
    * `email`: VARCHAR(255), Unique, Not Null.
    * `created_at`: Timestamp with Time Zone, Default: Current Timestamp.
    * `updated_at`: Timestamp with Time Zone, Default: Current Timestamp.
2.  Ensure any necessary database extensions for UUID generation are enabled via the migration.
3.  Write tests to verify that the table and its columns are created correctly with the specified constraints (e.g., `email` is unique), following project testing standards.

---

## Prompt 3: Database Schema Implementation - Drinks Table

**Objective:** Define and create the `drinks` table structure in the database.
**Addresses:** `spec.md` Section 4 (Data Model - Drinks Table).

**Instructions for the AI Coder:**
Your task is to implement the `drinks` table schema using the project's standard tools.
1.  Define and apply a migration for the `drinks` table with the following schema:
    * `id`: UUID, Primary Key, Default: `gen_random_uuid()`.
    * `name`: VARCHAR(255), Not Null.
    * `caffeine_mg`: NUMERIC(10, 2), Not Null.
    * `size_ml`: NUMERIC(10, 2), Not Null.
    * `created_by_user_id`: UUID, Foreign Key referencing `users(id)`.
    * `created_at`: Timestamp with Time Zone, Default: Current Timestamp.
    * `updated_at`: Timestamp with Time Zone, Default: Current Timestamp.
2.  Write tests to verify table creation, column types, and foreign key constraint, following project testing standards.

---

## Prompt 4: Database Schema Implementation - CaffeineEntries Table

**Objective:** Define and create the `caffeine_entries` table structure in the database.
**Addresses:** `spec.md` Section 4 (Data Model - CaffeineEntries Table).

**Instructions for the AI Coder:**
Your task is to implement the `caffeine_entries` table schema using the project's standard tools.
1.  Define and apply a migration for the `caffeine_entries` table with the following schema:
    * `id`: UUID, Primary Key, Default: `gen_random_uuid()`.
    * `user_id`: UUID, Not Null, Foreign Key referencing `users(id)`.
    * `drink_id`: UUID, Not Null, Foreign Key referencing `drinks(id)`.
    * `quantity`: INTEGER, Not Null, Default: 1.
    * `consumed_at`: Timestamp with Time Zone, Not Null.
    * `created_at`: Timestamp with Time Zone, Default: Current Timestamp.
2.  Write tests to verify table creation, column types, and foreign key constraints, following project testing standards.

---

## Prompt 5: Database Schema Implementation - UserDailyLimits Table

**Objective:** Define and create the `user_daily_limits` table structure in the database.
**Addresses:** `spec.md` Section 4 (Data Model - UserDailyLimits Table).

**Instructions for the AI Coder:**
Your task is to implement the `user_daily_limits` table schema using the project's standard tools.
1.  Define and apply a migration for the `user_daily_limits` table with the following schema:
    * `id`: UUID, Primary Key, Default: `gen_random_uuid()`.
    * `user_id`: UUID, Not Null, Foreign Key referencing `users(id)`.
    * `limit_mg`: NUMERIC(10, 2), Not Null.
    * `effective_from`: Timestamp with Time Zone, Default: Current Timestamp.
    * `created_at`: Timestamp with Time Zone, Default: Current Timestamp.
    * Implement a unique constraint for `(user_id, effective_from)`.
2.  Write tests to verify table creation, column types, foreign key constraint, and the unique constraint, following project testing standards.

---

## Prompt 6: NextAuth.js Setup with Magic Email Links

**Objective:** Integrate NextAuth.js for passwordless authentication using Magic Email Links.
**Addresses:** `spec.md` Section 3 (Authentication - NextAuth.js with Magic Email Links), Section 4 (UserSessions - handled by NextAuth).

**Instructions for the AI Coder:**
Your task is to set up NextAuth.js for authentication.
1.  Install `next-auth` and any required adapter compatible with the project's database setup (e.g., Prisma adapter).
2.  Configure NextAuth.js within the Next.js project structure, adhering to App Router conventions.
3.  Set up the Email Provider for Magic Email Links. This requires configuration for an email sending service. Ensure necessary environment variables are defined and added to `.env.example`.
4.  Ensure that when a user signs in via a magic link, a corresponding record is created in the `users` table if it doesn't already exist, storing their email. The NextAuth adapter or callbacks should handle this.
5.  Implement basic session management.
6.  Create a simple frontend component (e.g., `LoginButton`) that displays "Sign In" or "Sign Out" and user information conditionally, based on authentication status.
7.  Write tests following project standards:
    * Unit test for the NextAuth configuration (mocking providers/adapters).
    * Integration test for the session API endpoint to check session status for unauthenticated and (mocked) authenticated users.
    * Component test for the `LoginButton`'s conditional rendering.

---

## Prompt 7: API Endpoint - GET /api/user/me

**Objective:** Create an API endpoint to fetch profile data for the authenticated user.
**Addresses:** `spec.md` Section 5 (API Endpoints - `GET /api/user/me`).

**Instructions for the AI Coder:**
Your task is to create the `/api/user/me` API endpoint.
1.  Implement an API route handler for `GET /api/user/me` using App Router conventions.
2.  Protect this endpoint; only authenticated users can access it.
3.  If unauthenticated, return a 401 Unauthorized error using the standard JSON error format.
4.  If authenticated, fetch the user's details (e.g., `id`, `email`, `created_at`) from the `users` table based on the session information.
5.  Return the user data as JSON: `{ "id": "...", "email": "...", "created_at": "..." }`.
6.  Write tests (e.g., Jest and Supertest, or as per project standards):
    * Test unauthenticated access (should return 401).
    * Test authenticated access (mock session, mock DB call) ensuring correct user data is returned.

---

## Prompt 8: API Endpoint - POST /api/drinks (Add New Drink)

**Objective:** Create an API endpoint to allow authenticated users to add a new drink to the shared `drinks` table.
**Addresses:** `spec.md` Section 2.3 (Add New Drink Form), Section 5 (API Endpoints - `POST /api/drinks`).

**Instructions for the AI Coder:**
Your task is to implement the `POST /api/drinks` API endpoint.
1.  Implement an API route handler for `POST /api/drinks` using App Router conventions.
2.  The endpoint must be authenticated. Return 401 if not.
3.  **Request Body Validation:**
    * Expects `{ "name": string, "caffeine_mg": number, "size_ml": number }`.
    * All fields are mandatory and must be positive numbers.
    * Return 400 Bad Request with specific error messages for invalid input.
4.  **Logic:**
    * Insert the new drink into the `drinks` table, linking it to the authenticated user via `created_by_user_id`.
    * Handle potential database errors.
5.  **Response:**
    * On success (201 Created): `{ "success": true, "drink": DrinkObject }` where `DrinkObject` contains all fields of the newly created drink.
    * On error: Standard JSON error format.
6.  Write tests:
    * Unauthenticated access.
    * Invalid request body (missing fields, incorrect types).
    * Successful drink creation (verify DB insert and response).

---

## Prompt 9: API Endpoint - GET /api/drinks/search

**Objective:** Create an API endpoint to search for drinks, prioritizing user-added drinks.
**Addresses:** `spec.md` Section 2.3 (Search), Section 5 (API Endpoints - `GET /api/drinks/search`).

**Instructions for the AI Coder:**
Your task is to implement the `GET /api/drinks/search` API endpoint.
1.  Implement an API route handler for `GET /api/drinks/search` using App Router conventions.
2.  The endpoint must be authenticated. Return 401 if not.
3.  **Query Parameter:** Expects `?q=string` for the search term. If `q` is empty or very short (e.g., < 2 chars), return an empty list or a predefined message.
4.  **Logic:**
    * Perform a fuzzy search (e.g., using `ILIKE '%term%'` or a more advanced fuzzy search method as supported by the database and project standards) on the `name` field of the `drinks` table.
    * **Prioritization:** Results should be ordered such that drinks created by the current `user_id` (`created_by_user_id`) appear before drinks created by other users, and then potentially by relevance or name.
5.  **Response:**
    * On success (200 OK): `{ "drinks": [DrinkObject] }`. `DrinkObject` should include `id`, `name`, `caffeine_mg`, `size_ml`, `created_by_user_id`.
6.  Write tests:
    * Unauthenticated access.
    * Search with an empty/short query.
    * Search that returns no results.
    * Search that returns results, verifying prioritization (mock DB responses to control `created_by_user_id` and ensure order).

---

## Prompt 10: API Endpoint - POST /api/settings/limit (Set New Daily Limit)

**Objective:** Create an API endpoint for authenticated users to set a new daily caffeine limit.
**Addresses:** `spec.md` Section 2.5 (Daily Caffeine Limit Configuration), Section 5 (API Endpoints - `POST /api/settings/limit`).

**Instructions for the AI Coder:**
Your task is to implement the `POST /api/settings/limit` API endpoint.
1.  Implement an API route handler for `POST /api/settings/limit` using App Router conventions.
2.  The endpoint must be authenticated.
3.  **Request Body Validation:**
    * Expects `{ "limit_mg": number }`.
    * `limit_mg` must be a non-negative number. Return 400 for invalid input.
4.  **Logic:**
    * Insert a new record into the `user_daily_limits` table for the authenticated `user_id`.
    * The `effective_from` timestamp should default to the current time (as per `spec.md` allowing "limit can be modified for future days", assuming UI handles future-dating and for now `CURRENT_TIMESTAMP` is the direct action).
    * Handle potential unique constraint violations.
5.  **Response:**
    * On success (201 Created): `{ "success": true, "new_limit": UserDailyLimitObject }` (where `UserDailyLimitObject` includes `id`, `user_id`, `limit_mg`, `effective_from`).
6.  Write tests:
    * Unauthenticated access.
    * Invalid request body.
    * Successful limit creation (verify DB insert and response).

---

## Prompt 11: API Endpoint - GET /api/settings/limit (Get Daily Limits)

**Objective:** Create an API endpoint to retrieve the current and historical daily caffeine limits for the authenticated user.
**Addresses:** `spec.md` Section 2.5, Section 5 (API Endpoints - `GET /api/settings/limit`).

**Instructions for the AI Coder:**
Your task is to implement the `GET /api/settings/limit` API endpoint.
1.  Implement an API route handler for `GET /api/settings/limit` using App Router conventions.
2.  The endpoint must be authenticated.
3.  **Logic:**
    * Fetch all records from `user_daily_limits` for the authenticated `user_id`, ordered by `effective_from` descending.
    * The "current" limit is the one with the most recent `effective_from` date that is less than or equal to the current date. If no such limit exists, it could be null or a default.
4.  **Response:**
    * On success (200 OK): `{ "current_limit_mg": number | null, "history": [{ "limit_mg": number, "effective_from": datetime }] }`.
    * The `history` array should be sorted, typically newest first.
5.  Write tests:
    * Unauthenticated access.
    * User with no limits set.
    * User with one limit set.
    * User with multiple historical limits, verify `current_limit_mg` is correctly identified and history is sorted.

---

## Prompt 12: Helper Function - Get Effective Daily Limit for a Date

**Objective:** Create a reusable server-side helper function to determine the effective daily caffeine limit for a given user on a specific date.
**Addresses:** `spec.md` Section 2.5 (Historical Application of Limit).

**Instructions for the AI Coder:**
Your task is to create a utility function for calculating the effective daily limit.
1.  Create a new module for server-side utility functions, following project structure standards.
2.  Implement a function, e.g., `getEffectiveDailyLimit(userId: string, date: Date): Promise<number | null>`.
3.  **Logic:**
    * This function will query the `user_daily_limits` table using the project's database client.
    * It should find the limit for the given `userId` where `effective_from` is the most recent timestamp that is less than or equal to the *start* of the provided `date`.
    * If no such limit exists, it should return `null` (or a system-wide default if defined, though `spec.md` implies user-set).
4.  Write unit tests for this helper function:
    * User with no limits.
    * User with one limit, date is after `effective_from`.
    * User with one limit, date is before `effective_from`.
    * User with multiple limits, testing various dates to ensure the correct historical limit is picked.
    * Consider edge cases like limits set on the same day.

---

## Prompt 13: API Endpoint - POST /api/entries (Create Caffeine Entry)

**Objective:** Create an API endpoint to log a new caffeine entry.
**Addresses:** `spec.md` Section 2.1 (Caffeine Logging), Section 5 (API Endpoints - `POST /api/entries`).

**Instructions for the AI Coder:**
Your task is to implement the `POST /api/entries` API endpoint.
1.  Implement an API route handler for `POST /api/entries` using App Router conventions.
2.  The endpoint must be authenticated.
3.  **Request Body Validation:**
    * Expects `{ "drink_id": uuid, "quantity": number (optional, defaults to 1), "consumed_at": datetime_string }`.
    * `drink_id` and `consumed_at` are mandatory. `quantity` must be a positive integer if provided.
    * Return 400 for invalid input.
4.  **Logic:**
    * Fetch the drink to get its `caffeine_mg`.
    * Calculate total caffeine for this entry: `drink.caffeine_mg * quantity`.
    * Insert the new entry into `caffeine_entries` table for the authenticated user.
    * After saving, calculate the total caffeine consumed by the user for the day of `consumed_at`.
    * Use the helper function from Prompt 12 (`getEffectiveDailyLimit`) to get the user's daily limit for the day of `consumed_at`.
    * Determine `over_limit` (boolean) and `remaining_mg` (can be negative if over limit).
5.  **Response:**
    * On success (201 Created): `{ "success": true, "entry": CaffeineEntryObject, "over_limit": boolean, "remaining_mg": number }`. `CaffeineEntryObject` should include all its fields.
6.  Write tests:
    * Unauthenticated access.
    * Invalid request body.
    * Successful entry creation.
    * Verify `over_limit` and `remaining_mg` logic with various scenarios. Mock the `getEffectiveDailyLimit` helper.

---

## Prompt 14: API Endpoint - GET /api/entries/daily

**Objective:** Create an API endpoint to get all caffeine entries for a specific day, along with daily total and limit status.
**Addresses:** `spec.md` Section 2.2 (Daily View), Section 5 (API Endpoints - `GET /api/entries/daily`).

**Instructions for the AI Coder:**
Your task is to implement the `GET /api/entries/daily` API endpoint.
1.  Implement an API route handler for `GET /api/entries/daily` using App Router conventions.
2.  The endpoint must be authenticated.
3.  **Query Parameters:** `?date=YYYY-MM-DD`. Validate the date format. Default to today if not provided.
4.  **Logic:**
    * Fetch all `caffeine_entries` for the authenticated `user_id` where `consumed_at` falls within the specified `date` (from start to end of day). Entries should be ordered chronologically.
    * Join with `drinks` table to get `drink_name` if `drink_id` is present.
    * Calculate `daily_total_mg` from these entries.
    * Use the `getEffectiveDailyLimit` helper (Prompt 12) to get the `daily_limit_mg` for the user on that `date`.
    * Determine `over_limit` (boolean).
5.  **Response:**
    * On success (200 OK): `{ "entries": [EnrichedCaffeineEntryObject], "daily_total_mg": number, "over_limit": boolean, "daily_limit_mg": number | null }`. `EnrichedCaffeineEntryObject` should include `id`, `caffeine_mg`, `consumed_at`, `drink_name` (if applicable).
6.  Write tests:
    * Unauthenticated access.
    * Invalid date parameter.
    * No entries for the day.
    * Entries exist, verify correct calculation of total, limit, and `over_limit` status.
    * Ensure entries include drink names and are sorted correctly.

---

## Prompt 15: API Endpoint - PUT /api/entries/:id (Update Entry)

**Objective:** Create an API endpoint to update an existing caffeine entry.
**Addresses:** `spec.md` Section 2.1 (Entry Management), Section 5 (API Endpoints - `PUT /api/entries/:id`).

**Instructions for the AI Coder:**
Your task is to implement the `PUT /api/entries/:id` API endpoint.
1.  Implement an API route handler for `PUT /api/entries/[id]` (dynamic segment for ID) using App Router conventions.
2.  The endpoint must be authenticated.
3.  **Authorization:** Ensure the entry being updated belongs to the authenticated user. Return 403 Forbidden if not.
4.  **Request Body Validation:**
    * Allow updating `caffeine_mg` (number, positive) and/or `consumed_at` (datetime_string).
    * Return 400 for invalid input.
5.  **Logic:**
    * Fetch the existing entry.
    * Update the specified fields in the `caffeine_entries` table.
    * After updating, recalculate the daily total, effective limit for the (potentially new) `consumed_at` date, and `over_limit` status and `remaining_mg` similar to the `POST /api/entries` endpoint.
6.  **Response:**
    * On success (200 OK): `{ "success": true, "entry": CaffeineEntryObject, "over_limit": boolean, "remaining_mg": number }`.
7.  Write tests:
    * Unauthenticated access.
    * Attempting to update an entry not owned by the user (403).
    * Entry not found (404).
    * Invalid request body.
    * Successful update of `caffeine_mg`.
    * Successful update of `consumed_at`.
    * Verify updated daily totals and limit status.

---

## Prompt 16: API Endpoint - DELETE /api/entries/:id (Delete Entry)

**Objective:** Create an API endpoint to delete a caffeine entry.
**Addresses:** `spec.md` Section 2.1 (Entry Management), Section 5 (API Endpoints - `DELETE /api/entries/:id`).

**Instructions for the AI Coder:**
Your task is to implement the `DELETE /api/entries/:id` API endpoint.
1.  Implement or modify the API route handler for `/api/entries/[id]` to handle `DELETE` requests.
2.  The endpoint must be authenticated.
3.  **Authorization:** Ensure the entry being deleted belongs to the authenticated user. Return 403 if not.
4.  **Logic:**
    * Delete the entry from the `caffeine_entries` table.
5.  **Response:**
    * On success (200 OK or 204 No Content): `{ "success": true }`.
6.  Write tests:
    * Unauthenticated access.
    * Attempting to delete an entry not owned by the user (403).
    * Entry not found (404).
    * Successful deletion (verify DB state).

---

## Prompt 17: API Endpoint - GET /api/entries/history (Paginated Log History)

**Objective:** Create an API endpoint to get paginated/infinite scroll log history, grouped by day.
**Addresses:** `spec.md` Section 2.4 (Full Log History), Section 5 (API Endpoints - `GET /api/entries/history`).

**Instructions for the AI Coder:**
Your task is to implement the `GET /api/entries/history` API endpoint.
1.  Implement an API route handler for `GET /api/entries/history` using App Router conventions.
2.  The endpoint must be authenticated.
3.  **Query Parameters:** `?offset=number&limit=number` (for entry-based pagination).
    * Validate parameters (e.g., non-negative integers, reasonable limit).
4.  **Logic:**
    * Fetch caffeine entries for the authenticated user, ordered by `consumed_at` descending. Apply `LIMIT` and `OFFSET`.
    * Join with `drinks` table to get `drink_name`.
    * Process the flat list of entries and group them by date (YYYY-MM-DD format for keys).
    * Determine `has_more`: check if there are more entries beyond the current `offset + limit`.
5.  **Response:**
    * On success (200 OK): `{ "entries_by_day": { "YYYY-MM-DD": [EnrichedCaffeineEntryObject] }, "has_more": boolean }`. `EnrichedCaffeineEntryObject` includes `id`, `caffeine_mg`, `consumed_at`, `drink_name`.
6.  Write tests:
    * Unauthenticated access.
    * Invalid query parameters.
    * No entries.
    * First page of entries, `has_more` is true.
    * Last page of entries, `has_more` is false.
    * Verify correct grouping by day and sorting within days.

---

## Prompt 18: API Endpoint - GET /api/entries/graph-data

**Objective:** Create an API endpoint to supply data for the historical consumption graph.
**Addresses:** `spec.md` Section 2.4 (Graph), Section 5 (API Endpoints - `GET /api/entries/graph-data`).

**Instructions for the AI Coder:**
Your task is to implement the `GET /api/entries/graph-data` API endpoint.
1.  Implement an API route handler for `GET /api/entries/graph-data` using App Router conventions.
2.  The endpoint must be authenticated.
3.  **Query Parameters:** `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`. Validate dates.
4.  **Logic:**
    * For each day in the range `start_date` to `end_date`:
        * Calculate the total caffeine consumed by the user (`total_mg`).
        * Use the `getEffectiveDailyLimit` helper (Prompt 12) to get the `limit_mg` for that day.
        * Determine `limit_exceeded` (boolean).
    * This may require an efficient query to sum caffeine entries per day, then iterate and apply limits.
5.  **Response:**
    * On success (200 OK): `{ "data": [{ "date": "YYYY-MM-DD", "total_mg": number, "limit_exceeded": boolean, "limit_mg": number | null }] }`. The array should be sorted by date.
6.  Write tests:
    * Unauthenticated access.
    * Invalid date parameters.
    * Date range with no entries.
    * Date range with entries, verifying correct daily totals, limit application, and `limit_exceeded` status.
    * Ensure `getEffectiveDailyLimit` is correctly used/mocked.

---

## Prompt 19: Frontend - Basic Layout and Navigation

**Objective:** Create the main application layout with a persistent navigation bar.
**Addresses:** `spec.md` Section 2 (User Experience - general navigation).

**Instructions for the AI Coder:**
Your task is to set up the basic UI structure following project component and styling conventions.
1.  Create a main layout component that includes:
    * A header or navigation bar.
    * A main content area where pages will be rendered.
2.  The navigation bar should have placeholders or icons for:
    * Daily View (Main Screen, e.g., "Today")
    * Historical View (e.g., "History" or "Graph")
    * Settings/User Account (e.g., user icon)
3.  Use the project's standard method for applying this layout to pages (e.g., root layout file in App Router).
4.  Implement basic client-side routing using `next/link` for these navigation items to placeholder pages (e.g., `/today`, `/history`, `/settings`).
5.  Ensure the `LoginButton` (from Prompt 6) is integrated into the layout/header appropriately.
6.  Apply minimal styling according to project conventions (e.g., CSS Modules, Tailwind CSS).
7.  Write component tests:
    * Test that the `Layout` component renders its children.
    * Test that navigation links are present and attempt to navigate (mock `next/navigation`).

---

## Prompt 20: Frontend - User Onboarding (Initial Daily Limit)

**Objective:** Implement the user onboarding process for setting the initial daily caffeine limit.
**Addresses:** `spec.md` Section 2.5 (Onboarding: Initial limit configuration).

**Instructions for the AI Coder:**
Your task is to create the initial limit setting flow.
1.  Determine how to trigger onboarding:
    * One approach: If a user is authenticated and has no entries in `user_daily_limits` (check via an API call like `GET /api/settings/limit`), redirect them to an onboarding page (e.g., `/onboarding`) or show an onboarding modal.
2.  Create the onboarding UI (e.g., an onboarding page or a modal component):
    * A simple form with an input field for `limit_mg`.
    * A submit button.
3.  On submit, call the `POST /api/settings/limit` endpoint (Prompt 10) to save the initial limit.
4.  After successful submission, redirect the user to the main application page (e.g., Daily View) or close the modal.
5.  Implement form validation (e.g., limit must be a positive number).
6.  Write component tests:
    * Test rendering of the onboarding form.
    * Test form input and validation.
    * Test successful submission (mock API call) and redirection/modal close.
    * Test conditional rendering/redirect logic for triggering onboarding.

---

## Prompt 21: Frontend - Daily View: Caffeine Input & Today's Entries

**Objective:** Implement the main screen's direct caffeine input and the chronological list of today's entries.
**Addresses:** `spec.md` Section 2.2 (Daily View - Input, Chronological list).

**Instructions for the AI Coder:**
Your task is to build the core Daily View components.
1.  Develop the main Daily View page (e.g., `/today`).
2.  **Direct Caffeine Input Component:**
    * Implement a form with a numerical input for `caffeine_mg`.
    * Timestamp defaults to current date/time (editable for hour/minute). Use a suitable date/time picker component or native inputs.
    * On submit, call `POST /api/entries` (Prompt 13).
    * Handle API response: update UI, show errors if any.
3.  **Today's Entries List Component:**
    * Fetch data from `GET /api/entries/daily` (Prompt 14) for the current date.
    * Display entries in a chronological list: `drink_name` (if available), `amount (mg)`, `time`.
    * Include placeholders for editing/deleting entries (detailed in a subsequent prompt).
4.  Implement client-side state management for entries and daily totals according to project conventions. Re-fetch or update state after adding/editing/deleting entries.
5.  Apply basic styling.
6.  Write component tests:
    * Test rendering of input form and entries list.
    * Test caffeine input form submission (mock API) and state update.
    * Test fetching and displaying entries (mock API).
    * Test display of empty state if no entries.

---

## Prompt 22: Frontend - Daily View: Totals, Limit Indicator, and Swipe Navigation

**Objective:** Implement the display of daily total, limit indicator, and swipe navigation on the Daily View.
**Addresses:** `spec.md` Section 2.2 (Daily View - Total, Limit Indicator, Swipe).

**Instructions for the AI Coder:**
Your task is to enhance the Daily View.
1.  **Daily Summary Component:**
    * Use data from `GET /api/entries/daily` (total consumed, daily limit).
    * Prominently display "current day's total caffeine consumed (mg)".
    * Display "remaining caffeine allowance (mg)" or "Over Limit" message based on `over_limit` and `daily_limit_mg` from the API.
2.  **Date Navigation Functionality (Swipe & Buttons):**
    * Implement swipe gestures (left/right) to navigate to previous/next days' entries. Use a library or custom event handling.
    * On swipe/button click, update the date for which data is fetched via `GET /api/entries/daily` and re-render the view for the new date.
    * Include arrow buttons as an alternative for non-touch devices.
3.  Integrate these displays and controls into the Daily View page.
4.  Write component tests:
    * Test correct display of total, remaining, and over-limit messages based on mock data.
    * Test swipe functionality (mock swipe events and verify date change/API call).
    * Test button navigation for day changes.

---

## Prompt 23: Frontend - Drink Management: Search and Select

**Objective:** Implement drink search and selection functionality, integrated into the caffeine logging process.
**Addresses:** `spec.md` Section 2.3 (Drink Management - Selection, Search).

**Instructions for the AI Coder:**
Your task is to build the drink search/selection UI.
1.  **Drink Search Component:**
    * Include a text input for searching drinks.
    * A display area for search results.
2.  **Functionality:**
    * As the user types (with debounce), call `GET /api/drinks/search` (Prompt 9).
    * Display results: `name`, `caffeine_mg`, `size_ml`.
    * Allow the user to select a drink from the results.
3.  **Integration with Logging Form:**
    * When a drink is selected, populate relevant fields in the caffeine logging form (e.g., `drink_id`).
    * Allow the user to specify the quantity consumed.
    * Display the calculated total caffeine amount based on `drink.caffeine_mg * quantity`.
4.  If no drink is found, show an "Add New Drink" button/link.
5.  Write component tests:
    * Test rendering of search input and results area.
    * Test API call on input change and display of results (mock API).
    * Test selection of a drink and its effect on the logging form.
    * Test "Add New Drink" button visibility when no results.

---

## Prompt 24: Frontend - Drink Management: Add New Drink Form

**Objective:** Implement the form to add a new drink.
**Addresses:** `spec.md` Section 2.3 (Add New Drink Form).

**Instructions for the AI Coder:**
Your task is to create the "Add New Drink" form.
1.  **Add New Drink Form Component (possibly in a modal):**
    * Input fields: `name` (string), `caffeine_mg` (number), `size_ml` (number).
2.  **Functionality:**
    * On submit, call `POST /api/drinks` (Prompt 8) with the form data.
    * Handle API response: close modal on success, display errors if any.
    * After successfully adding a drink, it should ideally be available in the search or auto-selected.
3.  Provide access to this form (e.g., from the `DrinkSearch` component or a general "Manage Drinks" area).
4.  Implement form validation (mandatory fields, positive numbers).
5.  Write component tests:
    * Test rendering of the form and its fields.
    * Test form input, validation, and submission (mock API).
    * Test handling of successful and error API responses.

---

## Prompt 25: Frontend - Historical View: Line Graph

**Objective:** Implement the line graph for daily caffeine intake.
**Addresses:** `spec.md` Section 2.4 (Historical View - Graph).

**Instructions for the AI Coder:**
Your task is to create the historical graph view.
1.  Install and configure a suitable charting library (e.g., Chart.js, Recharts, Nivo) as per project standards.
2.  On the History page (e.g., `/history`):
    * Implement timeframe filter buttons: 1w, 1m, 3m, 1y.
    * When a filter is selected, calculate `start_date` and `end_date`.
    * Fetch data from `GET /api/entries/graph-data` (Prompt 18) using these dates.
3.  **Graph Display Component:**
    * Render a line graph with date on the X-axis and `total_mg` on the Y-axis.
    * If `limit_exceeded` is true for a data point, visually distinguish that point/segment (e.g., color change). The `limit_mg` can be a secondary line or in tooltips.
4.  Handle loading and error states for the graph data.
5.  Write component tests:
    * Test rendering of filter buttons and the graph canvas (mock chart component).
    * Test API call on filter change and data processing for the chart (mock API and chart library).
    * Test correct visual distinction for `limit_exceeded` points based on mock data.

---

## Prompt 26: Frontend - Historical View: Full Log History (Infinite Scroll)

**Objective:** Implement the infinite scrolling list of all caffeine entries.
**Addresses:** `spec.md` Section 2.4 (Full Log History).

**Instructions for the AI Coder:**
Your task is to create the infinite scrolling log.
1.  On the History page (or a dedicated log component within it):
    * Fetch initial data from `GET /api/entries/history` (Prompt 17).
    * Display entries grouped by day, with daily separators/headings (e.g., "June 1, 2025").
    * Each entry should show `drink_name` (if applicable), `amount (mg)`, and `time`.
2.  **Infinite Scrolling Logic:**
    * Implement infinite scroll (e.g., using `IntersectionObserver` or a library).
    * When the user scrolls near the bottom, fetch the next page of data from `GET /api/entries/history` using `offset` and `limit`, and append to the list.
    * Use the `has_more` flag from the API to stop fetching.
3.  Include placeholders for editing/deleting entries from this list.
4.  Write component tests:
    * Test initial data load and display, including daily separators.
    * Test infinite scroll mechanism: mock scroll events, verify API call for next page, and append new data (mock API).
    * Test correct handling of `has_more` flag.

---

## Prompt 27: Frontend - Entry Management (Edit/Delete in Daily and History Views)

**Objective:** Implement UI and logic for editing and deleting caffeine entries from both the Daily View and Full Log History.
**Addresses:** `spec.md` Section 2.1 (Entry Management).

**Instructions for the AI Coder:**
Your task is to add edit/delete functionality to entry items.
1.  **Edit Functionality (for Entry Item Components):**
    * Add an "Edit" button/icon to entry display components.
    * Clicking "Edit" should open a modal or an inline form pre-filled with the entry's data (`caffeine_mg`, `consumed_at`).
    * Allow modification of `caffeine_mg` and `consumed_at`.
    * On submit, call `PUT /api/entries/:id` (Prompt 15).
    * Update UI optimistically or on success. Refresh relevant daily totals.
2.  **Delete Functionality (for Entry Item Components):**
    * Add a "Delete" button/icon.
    * On click, show a confirmation dialog.
    * If confirmed, call `DELETE /api/entries/:id` (Prompt 16).
    * Update UI: remove the entry and refresh totals.
3.  Ensure state management correctly reflects changes across the application.
4.  Write component tests for both edit and delete:
    * Test rendering of edit/delete buttons.
    * Test opening/rendering of the edit form/modal.
    * Test submitting the edit form (mock API) and UI update.
    * Test delete confirmation and API call (mock API) and UI update.

---

## Prompt 28: Frontend - Settings Page: Change Daily Limit

**Objective:** Implement the UI on the Settings page for users to change their daily caffeine limit.
**Addresses:** `spec.md` Section 2.5 (Settings Page: Limit can be modified).

**Instructions for the AI Coder:**
Your task is to create the limit change UI in settings.
1.  On the Settings page (e.g., `/settings`):
    * Fetch current and historical limits using `GET /api/settings/limit` (Prompt 11).
    * Display the current `limit_mg`.
    * Provide a form with an input for `new_limit_mg`.
    * On submit, call `POST /api/settings/limit` (Prompt 10) with the new limit.
2.  **Functionality:**
    * After successfully updating the limit, refresh the displayed current limit.
    * Provide user feedback (e.g., "Limit updated successfully").
    * Implement form validation.
    * Optionally, display the history of limit changes.
3.  Write component tests:
    * Test rendering of the settings form and display of current limit.
    * Test form input, validation, and submission (mock API).
    * Test UI update after successful limit change.

---

## Prompt 29: Frontend - Caffeine Limit Warnings

**Objective:** Implement pre-logging and post-logging warnings related to exceeding the daily caffeine limit, and the persistent dashboard indicator.
**Addresses:** `spec.md` Section 2.5 (Warnings).

**Instructions for the AI Coder:**
Your task is to implement various caffeine limit warnings.
1.  **Pre-logging Warning (in Caffeine Input Form):**
    * When the user types an amount:
        * Access current day's total consumed and the day's limit (from API or local state).
        * If `current_total + new_input_amount > daily_limit`, display a non-blocking warning.
2.  **Post-logging Warning (after `POST /api/entries`):**
    * The API response for `POST /api/entries` includes `over_limit`.
    * If `over_limit` is true, display a dialog/modal/toast.
3.  **Dashboard Indicator (in Daily Summary / Layout):**
    * Ensure the display from Prompt 22 (e.g., "You are X mg over your limit today!" or "You have X mg remaining.") is clear and persistent on the main/daily view.
4.  Write component tests:
    * Test pre-logging warning visibility and message.
    * Test post-logging dialog appearance based on API response.
    * Verify dashboard indicator text and visibility.

---

## Prompt 30: API Endpoint & Backend Logic - Data Export (CSV)

**Objective:** Implement the backend logic to generate a CSV export of user data and an API endpoint to trigger it.
**Addresses:** `spec.md` Section 2.6 (Data Export), Section 5 (API Endpoints - `POST /api/user/export`).

**Instructions for the AI Coder:**
Your task is to create the data export functionality.
1.  Implement an API route handler for `POST /api/user/export` using App Router conventions.
2.  The endpoint must be authenticated.
3.  **Logic:**
    * Fetch all relevant data for the authenticated user:
        * **User Drinks:** Drinks created by the user. Columns: `Name`, `Caffeine_mg_per_ml`, `Base_Size_ml`, etc.
        * **Log Entries:** All caffeine entries. Columns: `Date`, `Time`, `Caffeine_mg`, `Drink_Name`, etc.
        * **Daily Totals:** For each day with entries: `Date`, `Total_Caffeine_mg`, `Exceeded_Limit`, `Daily_Limit_mg`. Use helper from Prompt 12.
    * Use a CSV generation library or manually construct CSV strings, as per project standards.
    * Prioritize direct streaming of one comprehensive CSV file with appropriate `Content-Type` (`text/csv`) and `Content-Disposition` headers.
4.  **Response:**
    * If streaming, the response on success (200 OK) is the CSV data itself.
5.  Write tests:
    * Unauthenticated access.
    * User with no data.
    * User with data: Verify CSV content for each section (User Drinks, Log Entries, Daily Totals).
    * Mock DB calls and `getEffectiveDailyLimit`.

---

## Prompt 31: Frontend - Settings Page: Data Export Trigger

**Objective:** Add a button to the Settings page to trigger the data export.
**Addresses:** `spec.md` Section 2.6 (User Account & Settings - export).

**Instructions for the AI Coder:**
Your task is to add the "Export Data" button.
1.  On the Settings page, add an "Export All My Data" button.
2.  When clicked, make a `POST` request to `/api/user/export` (Prompt 30).
3.  **Handling Response:**
    * The browser should automatically download the streamed CSV file.
4.  Provide user feedback during the process.
5.  Write component tests:
    * Test rendering of the export button.
    * Test API call on button click (mock API).
    * Test client-side feedback.

---

## Prompt 32: API Endpoint & Backend Logic - Delete All User Data

**Objective:** Implement the backend logic to delete all data for a user and an API endpoint to trigger it.
**Addresses:** `spec.md` Section 2.6 (User Account & Settings - delete all data), Section 5 (API Endpoints - `DELETE /api/user/delete-data`).

**Instructions for the AI Coder:**
Your task is to implement the "delete all data" feature.
1.  Implement an API route handler for `DELETE /api/user/delete-data` using App Router conventions.
2.  The endpoint must be authenticated.
3.  **Logic:**
    * For the authenticated `user_id`, delete related data in the correct order (respecting foreign keys), within a transaction:
        1.  `caffeine_entries`.
        2.  `user_daily_limits`.
        3.  `drinks` (created by the user, considering shared nature as per spec: if a drink is referenced by other users' entries, either prevent deletion, anonymize `created_by_user_id`, or mark as archived—consult `spec.md` or project lead for definitive strategy. For now, assume drinks created by user are only deleted if no other user's entries reference them; otherwise, `created_by_user_id` is nullified).
        4.  Finally, the user record from the `users` table.
4.  **Response:**
    * On success (200 OK or 204 No Content): `{ "success": true }`.
    * Ensure the user's session is invalidated.
5.  Write tests:
    * Unauthenticated access.
    * Successful data deletion: Mock user with data, verify all associated data and user record are correctly handled/deleted. Order of operations is key.
    * Test transactionality.

---

## Prompt 33: Frontend - Settings Page: Delete All Data Trigger

**Objective:** Add a button to the Settings page to trigger deleting all user data, with a strong confirmation.
**Addresses:** `spec.md` Section 2.6 (User Account & Settings - delete all data).

**Instructions for the AI Coder:**
Your task is to add the "Delete Account" button.
1.  On the Settings page, add a "Delete My Account and All Data" button (visually distinct).
2.  When clicked, show a **strong confirmation dialog** (e.g., modal) requiring user input (e.g., type "DELETE") to confirm, explaining irreversibility.
3.  If confirmed, make a `DELETE` request to `/api/user/delete-data` (Prompt 32).
4.  **Handling Response:**
    * On success, log the user out (e.g., via NextAuth's `signOut()`) and redirect.
    * Display feedback or errors.
5.  Write component tests:
    * Test rendering of the delete button.
    * Test display and interaction with the confirmation dialog.
    * Test API call on confirmed delete (mock API) and subsequent logout/redirect.

---

## Prompt 34: Error Handling Implementation (API & Client-Side)

**Objective:** Ensure consistent error handling mechanisms are implemented throughout the application.
**Addresses:** `spec.md` Section 6 (Error Handling Strategy).

**Instructions for the AI Coder:**
This is a cross-cutting concern. Review and refactor existing/future code according to project standards for error handling.
1.  **API Responses:**
    * Verify all API endpoints return consistent JSON error formats for client-expected errors (4xx).
    * Ensure appropriate HTTP status codes.
    * For 500 errors, log details server-side, send generic message to client.
2.  **API Input Validation:**
    * Ensure robust validation for all API endpoints (e.g., using Zod or Joi as per project standards). Return 400 with specific messages.
3.  **Client-Side Handling:**
    * Use or create a standard utility/hook for API calls that handles responses and errors consistently.
    * Implement graceful error display (toasts, inline messages, error pages).
    * Ensure forms provide clear validation feedback.
4.  **Server-Side Logging:**
    * Implement basic server-side logging for requests and caught errors (e.g., using Pino as per project standards).
5.  **TDD:** Write tests for:
    * Specific API error responses.
    * Client-side components displaying error messages.
    * Form validation error messages.

---

## Prompt 35: E2E Testing - User Registration and Initial Limit Setting

**Objective:** Write an E2E test for the user registration (magic link sign-in) and initial daily limit setting flow.
**Addresses:** `spec.md` Section 7 (E2E Tests).

**Instructions for the AI Coder:**
Your task is to set up and write the first E2E test using the project's chosen E2E testing framework (Cypress or Playwright).
1.  Install and configure the E2E testing framework.
2.  **Test Scenario: User Registration & Onboarding:**
    * Navigate to the application.
    * Initiate sign-in.
    * Enter a test email address.
    * Handle magic link interception/mocking (e.g., using a mock SMTP server like MailHog, or by directly accessing the link if logged in dev mode by NextAuth).
    * Visit the magic link to complete sign-in.
    * Verify redirection to the onboarding flow (if user is new).
    * Enter a daily caffeine limit.
    * Submit the onboarding form.
    * Verify redirection to the main application page.
    * Verify the set limit is reflected in the UI.
3.  Ensure proper setup for E2E tests (base URL, helper commands).

---

*(Note: Subsequent E2E tests for other user journeys like logging caffeine, managing drinks, viewing history, etc., would follow a similar prompt structure, detailing the specific steps for that journey.)*