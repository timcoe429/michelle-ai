# Project Context

## What Is This?
Michelle is a Slack-based AI calendar assistant powered by Claude's API. She manages Tim's schedule through natural language conversations in Slack DMs.

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
- Work calendar is VIEW-ONLY — all new events go on Northstar
- Two-calendar system: Work (yellow, "SC -" prefix) and Northstar (default blue)
- Personal items get "P -" prefix and green color
- Google Cloud project is in "Testing" mode — OAuth tokens expire every 7 days (NEEDS FIX)
- Only one authorized user (ALLOWED_USER_ID)
- Conversation memory is in-memory, resets on server restart

## What We Don't Want
- Complex timezone logic — Google Calendar handles timezone-aware datetimes
- Conversation history fallbacks that contaminate context
- Over-engineered solutions — keep it simple and direct

---
