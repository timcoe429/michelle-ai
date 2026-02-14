require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { handleMessage } = require('./bot');
const { scheduleDailySummary, sendDailySummary } = require('./scheduler');

const app = express();

// Raw body for Slack signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Verify Slack request signature
function verifySlackSignature(req) {
  const signature = req.headers['x-slack-signature'];
  const timestamp = req.headers['x-slack-request-timestamp'];
  
  if (!signature || !timestamp) return false;
  
  // Check timestamp is within 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) return false;
  
  const sigBasestring = `v0:${timestamp}:${req.rawBody}`;
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', process.env.SLACK_SIGNING_SECRET)
    .update(sigBasestring)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  );
}

// Health check
app.get('/', (req, res) => {
  res.send('Calendar bot is running!');
});

app.get('/trigger-summary', async (req, res) => {
  console.log('Manual daily summary trigger');
  try {
    await sendDailySummary();
    res.send('Daily summary triggered');
  } catch (error) {
    console.error('Manual trigger error:', error);
    res.status(500).send(error.message);
  }
});

// Slack events endpoint
app.post('/slack/events', async (req, res) => {
  // Handle URL verification challenge
  if (req.body.type === 'url_verification') {
    return res.send(req.body.challenge);
  }
  
  // Verify signature
  if (!verifySlackSignature(req)) {
    console.error('Invalid Slack signature');
    return res.status(401).send('Invalid signature');
  }
  
  // Respond immediately to Slack (they timeout after 3 seconds)
  res.status(200).send('ok');
  
  // Process the event
  const event = req.body.event;
  
  if (!event || event.type !== 'message') return;
  if (event.bot_id) return; // Ignore bot messages
  if (event.subtype) return; // Ignore message edits, deletes, etc.
  
  // Check if user is allowed
  const allowedUserIds = (process.env.ALLOWED_USER_IDS || '').split(',').map(id => id.trim());
  if (!allowedUserIds.includes(event.user)) {
    console.log(`Unauthorized user attempted access: ${event.user}`);
    return;
  }
  
  // Handle the message
  try {
    await handleMessage(event);
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

// Start server
const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start daily summary scheduler
  scheduleDailySummary();
});
