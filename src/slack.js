const https = require('https');

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

module.exports = { sendSlackMessage };
