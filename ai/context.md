# Project Context

## What Is This?
Michelle is a Slack-based AI calendar assistant powered by Claude's API. She manages users' schedules through natural language conversations in Slack DMs. Currently supports Tim and Omiah in the Northstar Workspace.

## Tech Stack
- **Runtime:** Node.js (>=18) on Railway
- **Server:** Express.js
- **AI:** Claude API (Anthropic SDK) with tool use
- **Calendar:** Google Calendar API (OAuth 2.0)
- **Messaging:** Slack API (Events API + Bot)
- **Scheduling:** node-cron for daily summaries

## Architecture
Slack → Express (src/index.js) → Claude (src/bot.js) → Google Calendar (src/calendar.js)

## Key Constraints
- Single calendar per user in Northstar Workspace
- Multi-user support: Tim and Omiah (configurable via env vars)
- Personal items get "P -" prefix and green color, everything else is blue
- Google Cloud project is in "Testing" mode — OAuth tokens expire every 7 days (NEEDS FIX)
- Authorized users configured via `ALLOWED_USER_IDS` (comma-separated)
- Conversation memory is in-memory, resets on server restart

## What We Don't Want
- Complex timezone logic — Google Calendar handles timezone-aware datetimes
- Conversation history fallbacks that contaminate context
- Over-engineered solutions — keep it simple and direct

---
