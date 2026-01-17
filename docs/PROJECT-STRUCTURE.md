# Project Structure

## Architecture Diagram (ASCII)

Slack --> Express (src/index.js) --> Claude (src/bot.js) --> Google Calendar (src/calendar.js)
   ^               |                       |
   |               v                       v
   |           Slack API (src/slack.js)  Memory (src/memory.js)

## File Structure

- src/index.js: Express server, Slack webhook handling, signature verification, scheduler startup
- src/bot.js: Claude integration, tool definitions, Slack message processing
- src/calendar.js: Google Calendar operations (list, create, update, delete, find)
- src/slack.js: Slack API message sending
- src/memory.js: Conversation memory with TTL and cleanup
- src/scheduler.js: Daily summary cron job
- scripts/get-google-token.js: One-time OAuth helper for refresh token
- package.json: Scripts and dependencies
- .env.example: Environment template
- README.md: Setup and deployment instructions

## Data Flow (Slack Message)

1. Slack sends an event to `POST /slack/events` in `src/index.js`.
2. Signature verification runs (timestamp + signing secret).
3. Event is filtered (message only, no bot/subtype, allowed user).
4. `src/bot.js` loads conversation history from `src/memory.js`.
5. Claude processes the message and may call calendar tools.
6. Tool calls in `src/bot.js` invoke `src/calendar.js`.
7. Response is sent to Slack via `src/slack.js`.
8. Assistant reply is stored in memory for follow-up context.

## Integration Points

- Slack events and response:
  - Webhook handling: `src/index.js`
  - Message sending: `src/slack.js`
- Claude/Anthropic:
  - Tool use and message processing: `src/bot.js`
- Google Calendar:
  - OAuth and CRUD operations: `src/calendar.js`
- Daily summary:
  - Cron scheduler: `src/scheduler.js`
  - Slack delivery: `src/slack.js`

## Security Notes

- Slack signature verification uses `x-slack-signature` and `x-slack-request-timestamp`.
- Requests older than 5 minutes are rejected.
- Only the `ALLOWED_USER_ID` is processed; others are ignored.
