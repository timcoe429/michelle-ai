const https = require('https');

async function postSlackMessage(channel, text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      channel: channel,
      text: text
    });

    const options = {
      hostname: 'slack.com',
      path: '/api/chat.postMessage',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const response = JSON.parse(body);
        if (response.ok) {
          resolve(response.ts);
        } else {
          reject(new Error(`Slack API error: ${response.error}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function sendSlackMessage(channel, text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      channel: channel,
      text: text
    });

    const options = {
      hostname: 'slack.com',
      path: '/api/chat.postMessage',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const response = JSON.parse(body);
        if (response.ok) {
          resolve(response);
        } else {
          reject(new Error(`Slack API error: ${response.error}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function deleteSlackMessage(channel, ts) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      channel: channel,
      ts: ts
    });

    const options = {
      hostname: 'slack.com',
      path: '/api/chat.delete',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const response = JSON.parse(body);
        if (response.ok) {
          resolve(true);
        } else {
          reject(new Error(`Slack API error: ${response.error}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function getChannelHistory(channel, limit = 10) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      channel: channel,
      limit: limit
    });

    const options = {
      hostname: 'slack.com',
      path: '/api/conversations.history',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const response = JSON.parse(body);
        if (response.ok) {
          resolve(response.messages || []);
        } else {
          reject(new Error(`Slack API error: ${response.error}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = { postSlackMessage, sendSlackMessage, deleteSlackMessage, getChannelHistory };
