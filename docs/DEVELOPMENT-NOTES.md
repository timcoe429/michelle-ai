# Development Notes

## Code Patterns

- Centralized Slack handling in `src/index.js` with raw-body signature verification.
- Claude tool use loop in `src/bot.js` with structured tool inputs/outputs.
- Google Calendar operations in `src/calendar.js` using OAuth refresh tokens.
- In-memory conversation store with TTL in `src/memory.js`.
- Daily summary scheduled via `node-cron` in `src/scheduler.js`.

## Testing Procedures (Local)

1. Copy `.env.example` to `.env` and fill in credentials.
2. Run `npm install`.
3. Start the dev server: `npm run dev`.
4. Confirm the server logs show it is running on port `3006`.
5. If testing Slack webhooks locally, run `ngrok http 3006` and update the Slack Request URL.

## Common Issues and Solutions

- Slack signature errors:
  - Ensure `SLACK_SIGNING_SECRET` is correct.
  - Check server time drift; Slack requests expire after 5 minutes.
- Slack messages not sending:
  - Verify `SLACK_BOT_TOKEN` scopes include `chat:write`.
  - Confirm the bot is installed in the workspace.
- Calendar API errors:
  - Verify calendar IDs and refresh token.
  - Ensure Google Calendar API is enabled.

## How to Add a New Claude Tool

1. Add a new tool definition in `src/bot.js` (name, description, input schema).
2. Implement the tool handler in `executeTool` and map it to calendar or new logic.
3. Ensure the tool output is JSON-serializable for Claude.
4. Test via Slack message that triggers the tool.

## How to Add a New Calendar

1. Add a new environment variable (calendar ID) in `.env.example` and `.env`.
2. Update `CALENDARS` in `src/calendar.js` to include the new calendar.
3. Update any calendar name resolution rules in `resolveCalendarId`.
4. Update documentation and examples as needed.

## Troubleshooting Guide

- Dev server does not start:
  - Confirm Node.js version >= 18 and dependencies installed.
  - Check for missing or invalid environment variables.
- Daily summary missing:
  - Verify `SLACK_CHANNEL_ID` is set and `DAILY_SUMMARY_CRON` is valid.
  - Confirm the server stayed running at scheduled time.
- Claude tool errors:
  - Review logs from `executeTool` in `src/bot.js` for error details.
