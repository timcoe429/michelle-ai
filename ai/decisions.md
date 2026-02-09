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

---
