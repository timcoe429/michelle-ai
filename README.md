# Slack Calendar Bot

Personal Slack bot for managing Google Calendars. Chat with it in Slack to create, view, edit, and delete events across multiple calendars.

## Features

- Manage 3 calendars: Work, Personal, Northstar
- Create, edit, delete, and view events
- Search for events by keyword
- Daily morning summary of all calendars
- Conversation memory (remembers context for 30 minutes)
- Only responds to authorized user (you)

## Setup

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name it (e.g., "Calendar Bot") and select your workspace

**OAuth & Permissions:**
- Add Bot Token Scopes:
  - `chat:write`
  - `im:history`
  - `im:read`
  - `im:write`
- Install to workspace
- Copy the **Bot User OAuth Token** (starts with `xoxb-`)

**Event Subscriptions:**
- Enable Events
- Request URL: `https://your-railway-url.railway.app/slack/events`
- Subscribe to bot events:
  - `message.im`
- Copy the **Signing Secret** from Basic Information

**App Home:**
- Enable "Messages Tab"
- Check "Allow users to send Slash commands and messages from the messages tab"

### 2. Set Up Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials (Desktop app type)
5. Download the credentials JSON

**Get Refresh Token:**

Run this one-time script locally to get your refresh token:

```javascript
// get-token.js
const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'urn:ietf:wg:oauth:2.0:oob'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar']
});

console.log('Authorize this app by visiting:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the code: ', async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  console.log('Refresh Token:', tokens.refresh_token);
  rl.close();
});
```

### 3. Find Your Calendar IDs

In Google Calendar:
1. Click the three dots next to each calendar
2. Settings and sharing
3. Scroll to "Integrate calendar"
4. Copy the Calendar ID

For your primary calendar, the ID is usually your email or "primary".

### 4. Deploy to Railway

1. Push this code to GitHub
2. Go to [railway.app](https://railway.app)
3. New Project → Deploy from GitHub repo
4. Add environment variables (see below)

### 5. Environment Variables

Set these in Railway:

```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CHANNEL_ID=your-dm-channel-id
ALLOWED_USER_ID=US0HJTDND

ANTHROPIC_API_KEY=your-anthropic-key

GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token

CALENDAR_WORK=tim@servicecore.com
CALENDAR_PERSONAL=primary
CALENDAR_NORTHSTAR=tim@northstarroof.com

DAILY_SUMMARY_CRON=0 7 * * *
TIMEZONE=America/Denver
```

### 6. Update Slack Event URL

After Railway deploys, copy your app URL and update the Slack Event Subscriptions Request URL:
`https://your-app.railway.app/slack/events`

## Usage

Just DM the bot in Slack:

- "What's on my calendar today?"
- "Add a meeting tomorrow at 2pm on my work calendar"
- "Create an event on Northstar for Friday at 10am - Site visit at 123 Main St"
- "Delete the meeting with John"
- "Move my 3pm to 4pm"
- "What do I have this week?"

## Daily Summary

The bot posts a daily summary at 7am (configurable via `DAILY_SUMMARY_CRON`). Make sure `SLACK_CHANNEL_ID` is set to the channel/DM where you want it posted.

To find your DM channel ID:
1. Open Slack in browser
2. Go to your DM with the bot
3. The URL will be like: `app.slack.com/client/TXXXXX/DXXXXX`
4. The `DXXXXX` part is your channel ID

## Troubleshooting

**Bot not responding:**
- Check Railway logs
- Verify Slack Event URL is correct
- Make sure bot is invited to the channel/DM

**Calendar errors:**
- Verify calendar IDs are correct
- Check Google refresh token hasn't expired
- Ensure Calendar API is enabled in Google Cloud

**Memory issues:**
- Conversations reset after 30 minutes of inactivity
- Server restart clears all conversations (stateless)
