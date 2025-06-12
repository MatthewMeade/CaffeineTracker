# Caffeine Tracker Web App: Developer Specification



---



## 1. Introduction



This document details the requirements and architectural choices for a caffeine tracking web application, built using Next.js. The application will allow users to log their daily caffeine intake, visualize consumption trends, manage a personalized and shared drink database, and configure personal limits.



---



## 2. Core Features & User Experience



* **Caffeine Logging:**

    * **Input Method:** Direct numerical input (mg) on the main screen.

    * **Timestamping:** Entries default to the current date and time (hour/minute granularity). The timestamp is editable by the user.

    * **Entry Management:** Users can **edit or delete** any historical caffeine entry.



* **Daily View (Main Screen):**

    * Direct caffeine input field.

    * **Chronological list** of today's caffeine entries, displaying **drink name** (if available), **amount (mg)**, and **time**.

    * **Prominent display** of the **current day's total caffeine consumed (mg)**.

    * **Daily Limit Indicator:** Shows **remaining caffeine allowance (mg)** or a clear "**Over Limit**" message.

    * **Navigation:** **Swipe functionality** to view previous/next days' entries.



* **Drink Management:**

    * **Selection:** Users can select from a pre-defined list of drinks.

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

        * **Custom Date Range Picker:** Potential future enhancement.

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

        * **Dashboard:** A persistent visual indicator on the dashboard (e.g., "You are X mg over your limit today!" or or "You have X mg remaining.").



* **User Account & Settings:**

    * **Navigation:** Accessible via a navigation bar icon.

    * **Settings Options:**

        * Change daily caffeine limit.

        * Account management: Option to **delete all user data**.

        * Account management: Option to **export all user data as a CSV**.



* **Data Export (CSV):**

    * **Content:** A comprehensive dump of all user data.

    * **Sheets/Sections:**

        * **User Drinks:** Contains all user-defined drinks (Name, Caffeine\_mg\_per\_ml, Size\_ml, etc. - all relevant DB fields).

        * **Log Entries:** All individual caffeine log entries (Date, Time, Caffeine\_mg, Drink\_Name, Drink\_ID (if applicable), User\_ID, etc. - all relevant DB fields).

        * **Daily Totals:** Summarized daily caffeine intake (Date, Total\_Caffeine\_mg, Exceeded\_Limit (boolean), Daily\_Limit\_mg - all relevant DB fields).



---



## 3. Technical Architecture



* **Frontend:** Next.js (React)

* **Backend/API:** tRPC with Next.js App Router

* **Database:** PostgreSQL

* **Authentication:** NextAuth.js (using Magic Email Links for passwordless login)



---



## 4. Data Model (PostgreSQL)



*(Note: This is a preliminary schema and may require adjustments during implementation.)*



```sql

-- Users Table

CREATE TABLE users (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email VARCHAR(255) UNIQUE NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

);



-- UserSessions (for NextAuth) - NextAuth handles details, but conceptually linked to users

-- No explicit table definition needed here, NextAuth handles this.



-- Drinks Table (Shared across users)

CREATE TABLE drinks (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(255) NOT NULL,

    caffeine_mg NUMERIC(10, 2) NOT NULL, -- Total caffeine in the drink

    size_ml NUMERIC(10, 2) NOT NULL, -- Size of the drink

    created_by_user_id UUID REFERENCES users(id), -- User who first added this drink

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

);



-- CaffeineEntries Table

CREATE TABLE caffeine_entries (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id),

    drink_id UUID NOT NULL REFERENCES drinks(id),

    consumed_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Date and time of consumption

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

);



-- UserDailyLimits Table

-- Stores the historical changes to a user's daily caffeine limit

CREATE TABLE user_daily_limits (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id),

    limit_mg NUMERIC(10, 2) NOT NULL,

    effective_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- When this limit became active

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (user_id, effective_from) -- A user can only have one limit setting per timestamp

);

```





## 5. API (tRPC Procedures)



The API is implemented using tRPC. The following describes the available routers and their procedures. All procedures are protected and require an authenticated user session unless specified as public.

*   **`user` router**
    *   `me: query`
        *   Fetches profile data for the currently authenticated user.
        *   **Returns:** `{ id, email, createdAt }`
*   **`settings` router**
    *   `getLimit: query`
        *   Retrieves the current and historical daily caffeine limits for the user.
        *   **Returns:** `{ current_limit_mg, history: [{ limit_mg, effective_from }] }`
    *   `setLimit: mutation`
        *   Sets a new daily caffeine limit for the user.
        *   **Input:** `{ limit_mg: number }`
        *   **Returns:** `{ success: boolean, new_limit: UserDailyLimitObject }`
*   **`drinks` router**
    *   `create: mutation`
        *   Adds a new drink to the shared database.
        *   **Input:** `{ name: string, caffeine_mg: number, size_ml: number }`
        *   **Returns:** `{ success: boolean, drink: DrinkObject }`
    *   `search: query`
        *   Searches for drinks with filtering, sorting, and pagination.
        *   **Input:** `{ q?: string, sort_by?: 'name' | 'caffeineMg' | 'sizeMl', sort_order?: 'asc' | 'desc', limit?: number, page?: number }`
        *   **Returns:** `{ drinks: [DrinkObject], pagination: { total, page, limit, total_pages } }`
*   **`entries` router**
    *   `create: mutation`
        *   Creates a new caffeine entry.
        *   **Input:** `{ drink_id: uuid, consumed_at: datetime }`
        *   **Returns:** `{ success: boolean, entry: EnrichedCaffeineEntryObject, over_limit: boolean, remaining_mg: number }`
    *   `update: mutation`
        *   Updates the consumption time of an existing caffeine entry.
        *   **Input:** `{ id: uuid, consumed_at?: datetime }`
        *   **Returns:** `{ success: boolean, entry: EnrichedCaffeineEntryObject, over_limit: boolean, remaining_mg: number }`
    *   `delete: mutation`
        *   Deletes a caffeine entry.
        *   **Input:** `{ id: uuid }`
        *   **Returns:** `{ success: boolean }`
    *   `list: query`
        *   Gets a paginated list of caffeine entries for a date range.
        *   **Input:** `{ start_date?: datetime, end_date?: datetime, offset?: number, limit?: number }`
        *   **Returns:** `{ entries: [EnrichedCaffeineEntryObject], has_more: boolean, total: number }`
    *   `getDaily: query`
        *   Gets all entries for a specific day.
        *   **Input:** `{ date?: YYYY-MM-DD }`
        *   **Returns:** `{ entries: [EnrichedCaffeineEntryObject], daily_total_mg: number, over_limit: boolean, daily_limit_mg: number | null }`
    *   `getGraphData: query`
        *   Gets data for the consumption graph.
        *   **Input:** `{ start_date: YYYY-MM-DD, end_date: YYYY-MM-DD }`
        *   **Returns:** `{ data: [{ date, total_mg, limit_exceeded, limit_mg }] }`

*(Note: Auth routes like sign-in are handled by NextAuth.js pages and are not part of the tRPC API.)*



---



## 6. Error Handling Strategy



* **API Responses:**

    * Consistent JSON error format: `{ "error": { "message": "...", "code": "..." } }`

    * Appropriate HTTP status codes (e.g., 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error).

* **Validation Errors:** Return **400 Bad Request** with specific error messages for invalid input (e.g., `caffeine_mg` not a number).

* **Database Errors:** Log internal server errors. For production, abstract specific DB errors from the user.

* **Client-Side:**

    * Graceful handling of API errors (e.g., display user-friendly error messages, disable forms).

    * Form validation feedback (e.g., red borders, inline error text).

* **Logging:** Implement server-side logging for errors, critical events, and suspicious activity.

* **Backend (tRPC, separate tests for utility functions):**

        * Database interactions (CRUD operations for all models).

        * Caffeine calculation logic (`mg_per_ml`).



---



## 7. Testing Plan



* **Unit Tests:**

    * **Frontend (Jest/React Testing Library):** Individual React components (e.g., input field, drink card, graph component).

* **Integration Tests:**

    * **Frontend-Backend Interaction:** Test API calls end-to-end (e.g., adding an entry and seeing it appear in the daily list).

* **End-to-End (E2E) Tests (Cypress/Playwright):**

    * Simulate full user journeys:

* **Performance Testing:**

    * Load testing on API endpoints, especially history and graph data endpoints, to ensure scalability with more users and data.

* **Security Testing:**

    * Authentication and Authorization checks (ensure users can only access their own data).

    * Input sanitization to prevent XSS/SQL injection.

    * Rate limiting on API endpoints (e.g., login attempts, new entry creation).
