# Start Here

Before starting any work, read these files in order:

1. [`/ai/context.md`](ai/context.md) - What this project is
2. [`/ai/current_plan.md`](ai/current_plan.md) - Where we are and what's next
3. [`/ai/decisions.md`](ai/decisions.md) - Why we made certain choices

## Additional Documentation

- [`.cursorrules`](.cursorrules) - Coding standards and development guidelines
- [`docs/PROJECT-STRUCTURE.md`](docs/PROJECT-STRUCTURE.md) - File structure
- [`docs/QUICK-REFERENCE.md`](docs/QUICK-REFERENCE.md) - Common tasks and env vars
- [`docs/DEVELOPMENT-NOTES.md`](docs/DEVELOPMENT-NOTES.md) - Patterns and troubleshooting
- [`README.md`](README.md) - Project overview and setup

After reading, confirm what phase we're in and what the next task is.

---

# Development Rules

## Working Rules

1. **Plan before executing** — For any change, first explain what you'll do and wait for approval
2. **No silent reverts** — Never revert code without explicitly stating what you're reverting and why
3. **Show don't guess** — When debugging, show actual error messages, don't guess at causes
4. **One change at a time** — Make one logical change, verify it works, then move to the next

## Where to Put New Code

| Task | File |
| --- | --- |
| Server routes and Slack events | `src/index.js` |
| Claude tools and message handling | `src/bot.js` |
| Google Calendar CRUD | `src/calendar.js` |
| Slack API messaging | `src/slack.js` |
| Conversation memory | `src/memory.js` |
| Daily summary cron | `src/scheduler.js` |

## Calendars

- Work (view-only): `CALENDAR_WORK` — tim@servicecore.com
- Northstar (primary, editable): `CALENDAR_NORTHSTAR` — tim@northstarroof.com
- Prefix system: "SC - " = yellow (work), "P - " = green (personal), default = blue (Northstar)

## Testing

1. ALWAYS run `npm run dev` after making changes
2. Verify the server starts without errors on port 3006
3. For Slack webhook testing locally: `ngrok http 3006`
4. Production deploys on Railway from GitHub

---
