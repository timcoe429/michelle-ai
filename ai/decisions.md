# Decisions Log

## Single Calendar Per User (Migrated from Two-Calendar System)
**Decision:** Each user has one calendar in Northstar Workspace. Migrated from two-calendar system (Work + Northstar) to simplify operations and support multi-user.
**Why:** Work calendar (ServiceCore) is no longer needed. Single calendar per user simplifies code, supports multi-user deployment, and reduces complexity.

## Prefix-Based Color Coding
**Decision:** "P - " prefix + green for personal, no prefix + blue for everything else. Removed "SC - " work prefix after migration.
**Why:** Visual distinction in Google Calendar. Bot auto-detects keywords and applies prefixes/colors. Simplified after removing work calendar.

## Claude Creates Cursor Prompts (Not Code)
**Decision:** In the PM workflow, Claude writes prompts for Cursor to execute.
**Why:** Keeps Tim focused on direction/decisions, Cursor handles implementation.

## Simple Date Handling
**Decision:** No complex timezone manipulation. Use ISO datetime strings directly.
**Why:** Google Calendar events already contain timezone-aware data. Sorting ISO strings works natively.

## Personality-Driven System Prompt
**Decision:** Bot personality and thinking guidance leads the system prompt, technical rules are guardrails.
**Why:** Previous rule-heavy approach caused rigid pattern-matching behavior. Natural thinking produces better results.

## In-Memory Conversation Store
**Decision:** Use simple in-memory Map with 30-min TTL instead of database.
**Why:** Multi-user ready but stateless is fine for now. Server restarts clear context which is acceptable.

## Force Fresh Calendar Data
**Decision:** Every schedule-related query fetches live data from Google Calendar API.
**Why:** Prevents hallucination from stale cached data.

## Per-User Config via Env Vars
**Decision:** Each user's settings (calendar, timezone, weather location, daily channel) stored as env vars with USER_{NAME}_ prefix pattern.
**Why:** Single config location in Railway, no database dependency, simple to manage. Env vars are version-controlled via Railway dashboard and easy to update without code changes. Chose this over database for simplicity — stateless design keeps server restartable without data loss.

## ISO 8601 Format for Calendar API Calls
**Decision:** Use full ISO 8601 datetime strings (via Date.toISOString()) instead of partial datetime strings + separate timeZone parameter.
**Why:** Google Calendar API rejects requests that mix partial ISO strings with a timeZone parameter (returns 400 Bad Request). Full ISO format via .toISOString() is the standard the API expects.
**Implementation:** In scheduler.js, create Date objects for start/end of user's day, call .toISOString(), and pass to listEvents without a timezone parameter. The calendar.js listEvents function signature was updated to remove the timeZone argument.

## Timezone-Aware Daily Summary Date Ranges
**Decision:** Use Intl.DateTimeFormat with formatToParts to calculate start/end of day in user's timezone, not server timezone.
**Why:** Server runs in UTC on Railway. Previous code using new Date(todayStr) with setHours() created midnight in server timezone, causing wrong date ranges for users in other timezones. This led to events from the previous day appearing in daily summaries and incorrect chronological ordering.

## Pipe Separator for Schedule Event Lists
**Decision:** Use pipe separator (|) between time and event name in schedule lists, reserve bullets (•) for general list items.
**Why:** Clearer visual distinction in Slack formatting. System prompt now explicitly instructs Claude to use "7:00 - 9:00 AM | Event Name" format for calendar event lists while keeping bullets for other list types.

## 48-Hour Search Window for Timezone Date Calculations
**Decision:** Daily summary uses 48-hour UTC search window (day-1 noon through day+1 noon) to find start/end of day in user's timezone.
**Why:** Previous single-day UTC search failed for timezones west of UTC where 23:59 local time falls on the next UTC day. This produced invalid date ranges (end before start) and zero events from the Google Calendar API.

---
