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

## Prompt 7: tRPC Procedure - `user.me`

**Objective:** Create a tRPC procedure to fetch profile data for the authenticated user.
**Addresses:** `spec.md` Section 5 (API - `user` router).

**Instructions for the AI Coder:**
Your task is to create the `user.me` tRPC procedure.
1.  Implement a `user` router for tRPC.
2.  Create a protected procedure named `me` on the router.
3.  The procedure should access the user's session from the tRPC context.
4.  If authenticated, fetch the user's details (e.g., `id`, `email`, `created_at`) from the `users` table based on the session information.
5.  Return the user data.
6.  Write tests for the tRPC procedure:
    * Test unauthenticated access (tRPC should handle this based on protected procedure middleware).
    * Test authenticated access (mock context with a session) ensuring correct user data is returned.

---

## Prompt 8: tRPC Procedure - `drinks.create`

**Objective:** Create a tRPC procedure to allow authenticated users to add a new drink.
**Addresses:** `spec.md` Section 2.3 (Add New Drink Form), Section 5 (API - `drinks` router).

**Instructions for the AI Coder:**
Your task is to implement the `drinks.create` tRPC procedure.
1.  Implement a `drinks` router for tRPC.
2.  Create a protected mutation named `create`.
3.  **Input Validation (Zod):**
    * Define a Zod schema for the input: `{ "name": string, "caffeine_mg": number, "size_ml": number }`.
    * All fields are mandatory, and numbers must be positive.
4.  **Logic:**
    * Insert the new drink into the `drinks` table, linking it to the authenticated user via `created_by_user_id` from the context.
    * Handle potential database errors.
5.  **Response:**
    * On success: `{ "success": true, "drink": DrinkObject }` where `DrinkObject` contains all fields of the newly created drink.
6.  Write tests:
    * Test unauthenticated access.
    * Test invalid input (procedure should throw a `TRPCError` for Zod validation failures).
    * Test successful drink creation (verify DB insert and response).

---

## Prompt 9: tRPC Procedure - `drinks.search`

**Objective:** Create a tRPC procedure to search for drinks, prioritizing user-added drinks.
**Addresses:** `spec.md` Section 2.3 (Search), Section 5 (API - `drinks` router).

**Instructions for the AI Coder:**
Your task is to implement the `drinks.search` tRPC procedure.
1.  Implement a `drinks` router for tRPC (if not already done).
2.  Create a protected query named `search`.
3.  **Input Validation (Zod):** Expects an object with an optional `q` (string) for the search term, and optional pagination/sorting params. If `q` is empty or short, logic should handle returning an empty list.
4.  **Logic:**
    * Perform a fuzzy search on the `name` field of the `drinks` table.
    * **Prioritization:** Results should be ordered such that drinks created by the current `user_id` appear first.
5.  **Response:**
    * On success: `{ "drinks": [DrinkObject], "pagination": { ... } }`.
6.  Write tests:
    * Test unauthenticated access.
    * Test search with various queries (empty, short, no results).
    * Test search that returns results, verifying prioritization (mock DB responses to control `created_by_user_id` and ensure order).
    * Test sorting and pagination.

---

## Prompt 10: tRPC Procedure - `settings.setLimit`

**Objective:** Create a tRPC procedure for authenticated users to set a new daily caffeine limit.
**Addresses:** `spec.md` Section 2.5 (Daily Caffeine Limit Configuration), Section 5 (API - `settings` router).

**Instructions for the AI Coder:**
Your task is to implement the `settings.setLimit` tRPC procedure.
1.  Implement a `settings` router for tRPC.
2.  Create a protected mutation named `setLimit`.
3.  **Input Validation (Zod):**
    * Expects `{ "limit_mg": number }`.
    * `limit_mg` must be a non-negative number.
4.  **Logic:**
    * Insert a new record into the `user_daily_limits` table for the authenticated `user_id`.
    * `effective_from` should default to the current time.
5.  **Response:**
    * On success: `{ "success": true, "new_limit": UserDailyLimitObject }`.
6.  Write tests:
    * Test unauthenticated access.
    * Test invalid input.
    * Test successful limit creation.

---

## Prompt 11: tRPC Procedure - `settings.getLimit`

**Objective:** Create a tRPC procedure to retrieve the daily caffeine limits for the authenticated user.
**Addresses:** `spec.md` Section 2.5, Section 5 (API - `settings` router).

**Instructions for the AI Coder:**
Your task is to implement the `settings.getLimit` tRPC procedure.
1.  Implement a `settings` router for tRPC (if not already done).
2.  Create a protected query named `getLimit`.
3.  **Logic:**
    * Fetch all records from `user_daily_limits` for the authenticated `user_id`, ordered by `effective_from` descending.
    * Determine the "current" limit.
4.  **Response:**
    * On success: `{ "current_limit_mg": number | null, "history": [{ "limit_mg": number, "effective_from": datetime }] }`.
5.  Write tests:
    * Test unauthenticated access.
    * Test user with no limits set.
    * Test user with multiple limits, verifying correct `current_limit_mg` and sorted history.

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

## Prompt 13: tRPC Procedure - `entries.create`

**Objective:** Create a tRPC procedure to log a new caffeine entry.
**Addresses:** `spec.md` Section 2.1 (Caffeine Logging), Section 5 (API - `entries` router).

**Instructions for the AI Coder:**
Your task is to implement the `entries.create` tRPC procedure.
1.  Implement an `entries` router for tRPC.
2.  Create a protected mutation named `create`.
3.  **Input Validation (Zod):**
    * Expects `{ "drink_id": uuid, "consumed_at": datetime_string }`.
    * `drink_id` and `consumed_at` are mandatory.
4.  **Logic:**
    * Fetch the drink and insert the new entry into `caffeine_entries`.
    * Use the `getEffectiveDailyLimit` helper to calculate `over_limit` and `remaining_mg`.
5.  **Response:**
    * On success: `{ "success": true, "entry": CaffeineEntryObject, "over_limit": boolean, "remaining_mg": number }`.
6.  Write tests:
    * Test unauthenticated access.
    * Test invalid input.
    * Test successful entry creation, verifying `over_limit` and `remaining_mg` logic. Mock the `getEffectiveDailyLimit` helper.

---

## Prompt 14: tRPC Procedure - `entries.getDaily`

**Objective:** Create a tRPC procedure to get all caffeine entries for a specific day.
**Addresses:** `spec.md` Section 2.2 (Daily View), Section 5 (API - `entries` router).

**Instructions for the AI Coder:**
Your task is to implement the `entries.getDaily` tRPC procedure.
1.  Implement the `entries` tRPC router (if not already done).
2.  Create a protected query named `getDaily`.
3.  **Input Validation (Zod):** `{ "date": string }` (YYYY-MM-DD format). Default to today if not provided.
4.  **Logic:**
    * Fetch all `caffeine_entries` for the user on the specified `date`.
    * Calculate `daily_total_mg`, `daily_limit_mg` (using the helper), and `over_limit`.
5.  **Response:**
    * On success: `{ "entries": [EnrichedCaffeineEntryObject], "daily_total_mg": number, "over_limit": boolean, "daily_limit_mg": number | null }`.
6.  Write tests:
    * Test unauthenticated access.
    * Test invalid date parameter.
    * Test with and without entries, verifying correct calculations.

---

## Prompt 15: tRPC Procedure - `entries.update`

**Objective:** Create a tRPC procedure to update an existing caffeine entry.
**Addresses:** `spec.md` Section 2.1 (Entry Management), Section 5 (API - `entries` router).

**Instructions for the AI Coder:**
Your task is to implement the `entries.update` tRPC procedure.
1.  Implement the `entries` tRPC router (if not already done).
2.  Create a protected mutation named `update`.
3.  **Authorization:** Ensure the entry being updated belongs to the authenticated user.
4.  **Input Validation (Zod):**
    * Allow updating `consumed_at` (datetime_string).
5.  **Logic:**
    * Fetch and update the entry's `consumed_at` time.
    * Recalculate daily totals and limit status.
6.  **Response:**
    * On success: `{ "success": true, "entry": CaffeineEntryObject, "over_limit": boolean, "remaining_mg": number }`.
7.  Write tests:
    * Test unauthenticated access.
    * Test updating an entry not owned by the user (should throw `TRPCError` with `FORBIDDEN` code).
    * Test entry not found.
    * Test invalid input.
    * Test successful update and verify recalculations.

---

## Prompt 16: tRPC Procedure - `entries.delete`

**Objective:** Create a tRPC procedure to delete a caffeine entry.
**Addresses:** `spec.md` Section 2.1 (Entry Management), Section 5 (API - `entries` router).

**Instructions for the AI Coder:**
Your task is to implement the `entries.delete` tRPC procedure.
1.  Implement the `entries` tRPC router (if not already done).
2.  Create a protected mutation named `delete`.
3.  **Authorization:** Ensure the entry being deleted belongs to the authenticated user.
4.  **Input Validation (Zod):** Expects `{ "id": uuid }`.
5.  **Logic:**
    * Delete the entry from the `caffeine_entries` table.
6.  **Response:**
    * On success: `{ "success": true }`.
7.  Write tests:
    * Test unauthenticated access.
    * Test deleting an entry not owned by the user.
    * Test entry not found.
    * Test successful deletion.

---

## Prompt 17: tRPC Procedure - `entries.list`

**Objective:** Create a tRPC procedure to get paginated/infinite scroll log history.
**Addresses:** `spec.md` Section 2.4 (Full Log History), Section 5 (API - `entries` router).

**Instructions for the AI Coder:**
Your task is to implement the `entries.list` tRPC procedure.
1.  Implement the `entries` tRPC router (if not already done).
2.  Create a protected query named `list`.
3.  **Input Validation (Zod):** Expects `{ "offset": number, "limit": number }`.
4.  **Logic:**
    * Fetch paginated caffeine entries for the user.
    * Group them by day.
    * Determine `has_more` flag for infinite scroll.
5.  **Response:**
    * On success: `{ "entries_by_day": { "YYYY-MM-DD": [EnrichedCaffeineEntryObject] }, "has_more": boolean }`.
6.  Write tests:
    * Test unauthenticated access.
    * Test invalid input.
    * Test pagination logic (`has_more` true/false) and grouping.

---

## Prompt 18: tRPC Procedure - `entries.getGraphData`

**Objective:** Create a tRPC procedure to supply data for the historical consumption graph.
**Addresses:** `spec.md` Section 2.4 (Graph), Section 5 (API - `entries` router).

**Instructions for the AI Coder:**
Your task is to implement the `entries.getGraphData` tRPC procedure.
1.  Implement the `entries` tRPC router (if not already done).
2.  Create a protected query named `getGraphData`.
3.  **Input Validation (Zod):** Expects `{ "start_date": YYYY-MM-DD, "end_date": YYYY-MM-DD }`.
4.  **Logic:**
    * For each day in the range, calculate `total_mg` and find the effective `limit_mg`.
5.  **Response:**
    * On success: `{ "data": [{ "date": "YYYY-MM-DD", "total_mg": number, "limit_exceeded": boolean, "limit_mg": number | null }] }`.
6.  Write tests:
    * Test unauthenticated access.
    * Test invalid date parameters.
    * Test date ranges with and without entries, verifying correct calculations.

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
    * One approach: If a user is authenticated, use the `settings.getLimit` tRPC query. If they have no entries in `user_daily_limits`, redirect to an onboarding page or show a modal.
2.  Create the onboarding UI (e.g., an onboarding page or a modal component):
    * A simple form with an input field for `limit_mg`.
    * A submit button.
3.  On submit, call the `settings.setLimit` tRPC mutation to save the initial limit.
4.  After successful submission, redirect the user to the main application page (e.g., Daily View) or close the modal.
5.  Implement form validation (e.g., limit must be a positive number).
6.  Write component tests:
    * Test rendering of the onboarding form.
    * Test form input and validation.
    * Test successful submission (mock tRPC client) and redirection/modal close.
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
    * Timestamp defaults to current date/time (editable for hour/minute).
    * On submit, call the `entries.create` tRPC mutation.
    * Handle API response: update UI, show errors if any.
3.  **Today's Entries List Component:**
    * Use the `entries.getDaily` tRPC query to fetch data for the current date.
    * Display entries in a chronological list: `drink_name` (if available), `amount (mg)`, `time`.
    * Include placeholders for editing/deleting entries.
4.  Implement client-side state management for entries and daily totals. Use React Query's cache invalidation to re-fetch or update state after adding/editing/deleting entries.
5.  Apply basic styling.
6.  Write component tests:
    * Test rendering of input form and entries list.
    * Test caffeine input form submission (mock tRPC client) and state update.
    * Test fetching and displaying entries (mock tRPC client).
    * Test display of empty state if no entries.

---

## Prompt 22: Frontend - Daily View: Totals, Limit Indicator, and Swipe Navigation

**Objective:** Implement the display of daily total, limit indicator, and swipe navigation on the Daily View.
**Addresses:** `spec.md` Section 2.2 (Daily View - Total, Limit Indicator, Swipe).

**Instructions for the AI Coder:**
Your task is to enhance the Daily View.
1.  **Daily Summary Component:**
    * Use data from the `entries.getDaily` tRPC query (total consumed, daily limit).
    * Prominently display "current day's total caffeine consumed (mg)".
    * Display "remaining caffeine allowance (mg)" or "Over Limit" message.
2.  **Date Navigation Functionality (Swipe & Buttons):**
    * Implement swipe gestures (left/right) to navigate to previous/next days' entries.
    * On swipe/button click, update the date parameter for the `entries.getDaily` tRPC query and re-render the view for the new date.
    * Include arrow buttons as an alternative for non-touch devices.
3.  Integrate these displays and controls into the Daily View page.
4.  Write component tests:
    * Test correct display of total, remaining, and over-limit messages based on mock data.
    * Test swipe functionality (mock swipe events and verify date change/tRPC call).
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
    * As the user types (with debounce), call the `drinks.search` tRPC query.
    * Display results: `name`, `caffeine_mg`, `size_ml`.
    * Allow the user to select a drink from the results.
3.  **Integration with Logging Form:**
    * When a drink is selected, populate relevant fields in the caffeine logging form (e.g., `drink_id`).
    * Allow the user to specify the quantity consumed.
4.  If no drink is found, show an "Add New Drink" button/link.
5.  Write component tests:
    * Test rendering of search input and results area.
    * Test tRPC call on input change and display of results (mock tRPC client).
    * Test selection of a drink and its effect on the logging form.

---

## Prompt 24: Frontend - Drink Management: Add New Drink Form

**Objective:** Implement the form to add a new drink.
**Addresses:** `spec.md` Section 2.3 (Add New Drink Form).

**Instructions for the AI Coder:**
Your task is to create the "Add New Drink" form.
1.  **Add New Drink Form Component (possibly in a modal):**
    * Input fields: `name` (string), `caffeine_mg` (number), `size_ml` (number).
2.  **Functionality:**
    * On submit, call the `drinks.create` tRPC mutation with the form data.
    * Handle API response: close modal on success, display errors if any.
    * After successfully adding a drink, it should ideally be available in the search or auto-selected (e.g., by invalidating search query cache).
3.  Provide access to this form from the `DrinkSearch` component.
4.  Implement form validation.
5.  Write component tests:
    * Test rendering of the form and its fields.
    * Test form input, validation, and submission (mock tRPC client).
    * Test handling of successful and error API responses.

---

## Prompt 25: Frontend - Historical View: Line Graph

**Objective:** Implement the line graph for daily caffeine intake.
**Addresses:** `spec.md` Section 2.4 (Historical View - Graph).

**Instructions for the AI Coder:**
Your task is to create the historical graph view.
1.  Install and configure a suitable charting library (e.g., Recharts).
2.  On the History page (e.g., `/history`):
    * Implement timeframe filter buttons: 1w, 1m, 3m, 1y.
    * When a filter is selected, calculate `start_date` and `end_date`.
    * Use the `entries.getGraphData` tRPC query to fetch data.
3.  **Graph Display Component:**
    * Render a line graph with the fetched data.
    * If `limit_exceeded` is true for a data point, visually distinguish it.
4.  Handle loading and error states for the tRPC query.
5.  Write component tests:
    * Test rendering of filter buttons and the graph canvas (mock chart component).
    * Test tRPC call on filter change and data processing for the chart (mock tRPC client and chart library).
    * Test correct visual distinction for `limit_exceeded` points.

---

## Prompt 26: Frontend - Historical View: Full Log History (Infinite Scroll)

**Objective:** Implement the infinite scrolling list of all caffeine entries.
**Addresses:** `spec.md` Section 2.4 (Full Log History).

**Instructions for the AI Coder:**
Your task is to create the infinite scrolling log.
1.  On the History page:
    * Use the `entries.list` tRPC query to fetch initial data.
    * Display entries grouped by day.
2.  **Infinite Scrolling Logic:**
    * Use a library like `react-intersection-observer`.
    * When the user scrolls near the bottom, use the `fetchNextPage` function provided by React Query's `useInfiniteQuery` hook with the `entries.list` procedure.
    * Use the `has_more` flag from the procedure to stop fetching.
3.  Include placeholders for editing/deleting entries.
4.  Write component tests:
    * Test initial data load and display.
    * Test infinite scroll mechanism: mock scroll events, verify `fetchNextPage` is called, and append new data (mock tRPC client).
    * Test correct handling of `has_more` flag.

---

## Prompt 27: Frontend - Entry Management (Edit/Delete in Daily and History Views)

**Objective:** Implement UI and logic for editing and deleting caffeine entries.
**Addresses:** `spec.md` Section 2.1 (Entry Management).

**Instructions for the AI Coder:**
Your task is to add edit/delete functionality to entry items.
1.  **Edit Functionality:**
    * Add an "Edit" button to entry display components.
    * Clicking "Edit" should open a modal or inline form pre-filled with entry data.
    * On submit, call the `entries.update` tRPC mutation.
    * Update UI optimistically or on success, and invalidate relevant queries to refresh totals.
2.  **Delete Functionality:**
    * Add a "Delete" button/icon with a confirmation dialog.
    * If confirmed, call the `entries.delete` tRPC mutation.
    * Update UI: remove the entry and invalidate queries to refresh totals.
3.  Ensure React Query state management correctly reflects changes.
4.  Write component tests for both edit and delete:
    * Test rendering of edit/delete buttons and the edit form.
    * Test submitting the edit form (mock tRPC client) and UI update.
    * Test delete confirmation and API call (mock tRPC client) and UI update.

---

## Prompt 28: Frontend - Settings Page: Change Daily Limit

**Objective:** Implement the UI on the Settings page for users to change their daily caffeine limit.
**Addresses:** `spec.md` Section 2.5 (Settings Page: Limit can be modified).

**Instructions for the AI Coder:**
Your task is to create the limit change UI in settings.
1.  On the Settings page (e.g., `/settings`):
    * Use the `settings.getLimit` tRPC query to fetch and display the current limit.
    * Provide a form with an input for a new limit.
    * On submit, call the `settings.setLimit` tRPC mutation.
2.  **Functionality:**
    * After a successful mutation, invalidate the `settings.getLimit` query to refresh the displayed current limit.
    * Provide user feedback.
    * Optionally, display the history of limit changes from the query data.
3.  Write component tests:
    * Test rendering of the settings form and display of current limit.
    * Test form input, validation, and submission (mock tRPC client).
    * Test UI update after successful limit change.

---

## Prompt 29: Frontend - Caffeine Limit Warnings

**Objective:** Implement pre-logging and post-logging warnings related to exceeding the daily caffeine limit.
**Addresses:** `spec.md` Section 2.5 (Warnings).

**Instructions for the AI Coder:**
Your task is to implement various caffeine limit warnings.
1.  **Pre-logging Warning (in Caffeine Input Form):**
    * When the user types an amount:
        * Access current day's data from the `entries.getDaily` query cache.
        * If `current_total + new_input_amount > daily_limit`, display a non-blocking warning.
2.  **Post-logging Warning (after `entries.create` mutation):**
    * The `onSuccess` callback of the `useMutation` hook for `entries.create` will receive the API response.
    * If `over_limit` is true in the response, display a dialog/modal/toast.
3.  **Dashboard Indicator (in Daily Summary / Layout):**
    * Ensure the display from Prompt 22, which uses data from the `entries.getDaily` query, is clear and persistent.
4.  Write component tests:
    * Test pre-logging warning visibility.
    * Test post-logging dialog appearance based on mock tRPC response.
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