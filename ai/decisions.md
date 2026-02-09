# Decisions Log

## Two-Calendar System
**Decision:** Work calendar is view-only, Northstar is the primary editable calendar.
**Why:** Tim's work calendar (ServiceCore) is managed elsewhere. Michelle only needs to read it for scheduling awareness. All new events go on Northstar.

## Prefix-Based Color Coding
**Decision:** "SC - " prefix + yellow for work, "P - " prefix + green for personal, no prefix + blue for Northstar default.
**Why:** Visual distinction in Google Calendar. Bot auto-detects keywords and applies prefixes/colors.

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
**Why:** Single user, stateless is fine. Server restarts clear context which is acceptable.

## Force Fresh Calendar Data
**Decision:** Every schedule-related query fetches live data from Google Calendar API.
**Why:** Prevents hallucination from stale cached data.

---
