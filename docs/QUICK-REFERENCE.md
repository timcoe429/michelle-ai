# Quick Reference

## Common Commands

- Install dependencies: `npm install`
- Run dev server (auto-reload): `npm run dev`
- Run production server: `npm start`
- Expose local Slack endpoint: `ngrok http 3006`

## File Finder

| Task | File |
| --- | --- |
| Server routes and Slack events | `src/index.js` |
| Claude tools and message handling | `src/bot.js` |
| Google Calendar CRUD | `src/calendar.js` |
| Slack API messaging | `src/slack.js` |
| Conversation memory | `src/memory.js` |
| Daily summary cron | `src/scheduler.js` |

## Environment Variables

Slack:
- `SLACK_BOT_TOKEN`: Bot OAuth token (xoxb-)
- `SLACK_SIGNING_SECRET`: Signing secret for request verification
- `SLACK_CHANNEL_ID`: Channel or DM for daily summary
- `ALLOWED_USER_ID`: Slack user ID allowed to use the bot

Anthropic:
- `ANTHROPIC_API_KEY`: API key for Claude

Google Calendar OAuth:
- `GOOGLE_CLIENT_ID`: OAuth client ID
- `GOOGLE_CLIENT_SECRET`: OAuth client secret
- `GOOGLE_REFRESH_TOKEN`: OAuth refresh token

Calendar IDs:
- `CALENDAR_WORK`: Work calendar ID
- `CALENDAR_PERSONAL`: Personal calendar ID
- `CALENDAR_NORTHSTAR`: Northstar calendar ID

Daily summary:
- `DAILY_SUMMARY_CRON`: Cron schedule (default `0 7 * * *`)
- `TIMEZONE`: IANA timezone (e.g., `America/Denver`)

## Claude Tools

- `list_events`: List events from a specific calendar in a time range
- `list_all_calendars`: List today's events across all calendars
- `create_event`: Create a new event with title/time/description/color
- `update_event`: Update an event by ID
- `delete_event`: Delete an event by ID
- `find_event`: Search for events by title/keyword
