# Caffeine Tracker Web App: Developer Specification

---

## 1. Introduction

This document details the requirements and architectural choices for a caffeine tracking web application, built using Next.js. The application will allow users to log their daily caffeine intake, visualize consumption trends, manage a personalized and shared drink database, and configure personal limits.

---

## 2. Core Features & User Experience

* **Caffeine Logging:**
    * **Input Method:** Direct numerical input (mg) on the main screen, or by selecting a pre-defined drink.
    * **Timestamping:** Entries default to the current date and time (hour/minute granularity). The timestamp is editable by the user.
    * **Entry Management:** Users can **edit or delete** any historical caffeine entry. Edits include changing the time, name, and caffeine amount.

* **Daily View (Main Screen):**
    * Direct caffeine input field.
    * **Chronological list** of today's caffeine entries, displaying **drink name**, **amount (mg)**, and **time**.
    * **Prominent display** of the **current day's total caffeine consumed (mg)**.
    * **Daily Limit Indicator:** Shows **remaining caffeine allowance (mg)** or a clear "**Over Limit**" message.
    * **Navigation:** **Swipe functionality** to view previous/next days' entries.

* **Drink Management:**
    * **Selection:** Users can select from a pre-defined list of drinks to quickly populate a new entry.
    * **Search:** **Fuzzy search functionality** for existing drinks.
    * **Add New Drink Form:**
        * Accessed via an "Add" button if a drink isn't found in search.
        * **Mandatory Fields:** `name` (string), `caffeine_mg` (number), `size_ml` (number).
        * **Shared Database:** User-added drinks become available for selection by all other users.
        * **Prioritization:** In search results, a user's own added drinks take precedence over shared drinks from other users.
        * **No Images:** No image upload functionality for drinks in this version.
    * **Logging with Drinks:** When a user selects an existing drink, it creates a single caffeine entry. To log multiple drinks, the user creates multiple entries.

* **Historical View:**
    * **Graph:** **Line graph** displaying **daily caffeine intake (mg)** since tracking began.
        * **Timeframe Filters:** Quick-select buttons for 1w (week), 1m (month), 3m (3 months), 1y (year).
        * **Limit Visualization:** Graph line for a given day changes color (e.g., green to red) if the day's total caffeine exceeded the active daily limit for that date.
    * **Full Log History:** Accessible via navigation bar.
        * **Infinite scrolling list** of all individual caffeine entries.
        * **Daily separators/headings** for chronological organization.

* **Daily Caffeine Limit:**
    * **Configuration:** Users set their personal daily caffeine limit (mg).
    * **Historical Application:** The limit is applied historically based on the setting **effective prior to that specific day**. Updates to the limit do not retroactively change previous days' limits. Each limit change will be timestamped.
    * **Onboarding:** Initial limit configuration is part of the user **onboarding process**.
    * **Settings Page:** Limit can be modified for future days via the "Settings" page.
    * **Warnings:**
        * **Pre-logging:** A warning will appear when entering an amount that, combined with existing entries, would push the user over their limit.
        * **Post-logging:** A dialog will pop up after saving an entry that results in exceeding the limit.
        * **Dashboard:** A persistent visual indicator on the dashboard.

* **User Account & Settings:**
    * **Navigation:** Accessible via a navigation bar icon.
    * **Settings Options:**
        * Change daily caffeine limit.
        * Account management: Option to **delete all user data**.
        * Account management: Option to **export all user data as a CSV**.

* **Data Export (CSV):**
    * **Content:** A comprehensive dump of all user data.
    * **Sheets/Sections:**
        * **User Drinks:** Contains all user-defined drinks.
        * **Log Entries:** All individual caffeine log entries.
        * **Daily Totals:** Summarized daily caffeine intake.

---

## 3. Technical Architecture

* **Frontend:** Next.js (React)
* **Backend/API:** tRPC with Next.js App Router
* **Database:** PostgreSQL
* **Authentication:** NextAuth.js (using Magic Email Links for passwordless login)

---

## 4. Data Model (PostgreSQL)

*(Note: This schema reflects the "snapshot" approach for entries to ensure historical accuracy.)*

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Drinks Table (Shared library of presets)
CREATE TABLE drinks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    caffeine_mg NUMERIC(10, 2) NOT NULL, -- Total caffeine in the drink
    size_ml NUMERIC(10, 2) NOT NULL,     -- Size of the drink
    created_by_user_id UUID REFERENCES users(id), -- User who first added this drink
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CaffeineEntries Table (Self-contained historical log)
CREATE TABLE caffeine_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,             -- The name/description of the entry at the time of logging
    caffeine_mg NUMERIC(10, 2) NOT NULL,    -- The caffeine amount for this specific entry
    consumed_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Date and time of consumption
    drink_id UUID REFERENCES drinks(id),           -- Optional link to a preset drink
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- UserDailyLimits Table
CREATE TABLE user_daily_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    limit_mg NUMERIC(10, 2) NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- When this limit became active
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, effective_from) -- A user can only have one limit setting per timestamp
);
```

---

## 5. API (tRPC Procedures)

The API is implemented using tRPC. All procedures are protected and require an authenticated user session.

* **`user` router**
    * `me: query`
        * Fetches profile data for the currently authenticated user.
        * **Returns:** `{ id, email, createdAt }`
* **`settings` router**
    * `getLimit: query`
        * Retrieves the current and historical daily caffeine limits for the user.
        * **Returns:** `{ current_limit_mg, history: [{ limit_mg, effective_from }] }`
    * `setLimit: mutation`
        * Sets a new daily caffeine limit for the user.
        * **Input:** `{ limit_mg: number }`
        * **Returns:** `{ success: boolean, new_limit: UserDailyLimitObject }`
* **`drinks` router**
    * `create: mutation`
        * Adds a new drink to the shared database.
        * **Input:** `{ name: string, caffeine_mg: number, size_ml: number }`
        * **Returns:** `{ success: boolean, drink: DrinkObject }`
    * `search: query`
        * Searches for drinks, prioritizing user's drinks.
        * **Input:** `{ q?: string, sort_by?: 'name' | 'caffeineMg' | 'sizeMl', sort_order?: 'asc' | 'desc', limit?: number, page?: number }`
        * **Returns:** `{ drinks: [DrinkObject], pagination: { total, page, limit, total_pages } }`
* **`entries` router**
    * `create: mutation`
        * Creates a new caffeine entry from either a preset drink or a manual entry.
        * **Input:**
            * **Preset:** `{ type: 'preset', drinkId: uuid, consumedAt: datetime }`
            * **Manual:** `{ type: 'manual', name: string, caffeineMg: number, consumedAt: datetime }`
        * **Returns:** `{ success: boolean, entry: EnrichedCaffeineEntryObject, over_limit: boolean, remaining_mg: number }`
    * `update: mutation`
        * Updates an existing caffeine entry. If `name` or `caffeineMg` are changed, the link to the original preset drink (`drink_id`) is removed.
        * **Input:** `{ id: uuid, consumed_at?: datetime, name?: string, caffeine_mg?: number }`
        * **Returns:** `{ success: boolean, entry: EnrichedCaffeineEntryObject, over_limit: boolean, remaining_mg: number }`
    * `delete: mutation`
        * Deletes a caffeine entry.
        * **Input:** `{ id: uuid }`
        * **Returns:** `{ success: boolean }`
    * `list: query`
        * Gets a paginated list of caffeine entries.
        * **Input:** `{ start_date?: datetime, end_date?: datetime, offset?: number, limit?: number }`
        * **Returns:** `{ entries: [EnrichedCaffeineEntryObject], has_more: boolean, total: number }`
    * `getDaily: query`
        * Gets all entries for a specific day.
        * **Input:** `{ date?: YYYY-MM-DD }`
        * **Returns:** `{ entries: [EnrichedCaffeineEntryObject], daily_total_mg: number, over_limit: boolean, daily_limit_mg: number | null }`
    * `getGraphData: query`
        * Gets data for the consumption graph, aggregated efficiently in the database.
        * **Input:** `{ start_date: YYYY-MM-DD, end_date: YYYY-MM-DD }`
        * **Returns:** `{ data: [{ date, total_mg, limit_exceeded, limit_mg }] }`

---

## 6. Error Handling Strategy

* **API Responses:** Consistent JSON error format: `{ "error": { "message": "...", "code": "..." } }` using `TRPCError`.
* **Validation Errors:** Use Zod for input validation on all procedures.
* **Database Errors:** Log internal server errors.
* **Client-Side:** Graceful handling of API errors and form validation.
* **Logging:** Server-side logging for errors and critical events.

---

## 7. Testing Plan

* **Unit Tests:** For individual components and helper functions.
* **Integration Tests:** For tRPC procedures and API endpoints.
* **End-to-End (E2E) Tests:** For full user journeys.
* **Performance Testing:** Load testing on API endpoints, especially history and graph data.
* **Security Testing:** Authentication, authorization, and input sanitization checks.