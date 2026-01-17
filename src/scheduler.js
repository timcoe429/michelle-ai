const cron = require('node-cron');
const { sendSlackMessage } = require('./slack');
const { listAllCalendarsEvents } = require('./calendar');

function formatTime(isoString) {
  if (!isoString) return 'All day';
  
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: process.env.TIMEZONE || 'America/Denver'
  });
}

function formatEventList(events) {
  if (!events || events.length === 0) {
    return '  _No events scheduled_';
  }
  
  return events.map(event => {
    const time = formatTime(event.start);
    return `  • ${time} - ${event.title}`;
  }).join('\n');
}

async function sendDailySummary() {
  const channelId = process.env.SLACK_CHANNEL_ID;
  
  if (!channelId) {
    console.error('SLACK_CHANNEL_ID not set, skipping daily summary');
    return;
  }
  
  try {
    // Get today's date range
    const now = new Date();
    const timezone = process.env.TIMEZONE || 'America/Denver';
    
    // Start of today
    const startOfDay = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    startOfDay.setHours(0, 0, 0, 0);
    
    // End of today
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);
    
    const events = await listAllCalendarsEvents(
      startOfDay.toISOString(),
      endOfDay.toISOString()
    );
    
    // Format the summary
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: timezone
    });
    
    let summary = `📅 *Daily Summary for ${dateStr}*\n\n`;
    
    summary += `*🏢 Work Calendar:*\n${formatEventList(events.work)}\n\n`;
    summary += `*👤 Personal Calendar:*\n${formatEventList(events.personal)}\n\n`;
    summary += `*🏠 Northstar Calendar:*\n${formatEventList(events.northstar)}`;
    
    await sendSlackMessage(channelId, summary);
    console.log('Daily summary sent successfully');
    
  } catch (error) {
    console.error('Error sending daily summary:', error);
  }
}

function scheduleDailySummary() {
  const cronSchedule = process.env.DAILY_SUMMARY_CRON || '0 7 * * *';
  
  console.log(`Scheduling daily summary with cron: ${cronSchedule}`);
  
  cron.schedule(cronSchedule, () => {
    console.log('Running daily summary job');
    sendDailySummary();
  }, {
    timezone: process.env.TIMEZONE || 'America/Denver'
  });
}

// Export for manual trigger if needed
module.exports = { scheduleDailySummary, sendDailySummary };
