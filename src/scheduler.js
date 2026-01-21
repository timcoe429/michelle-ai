const cron = require('node-cron');
const { sendSlackMessage } = require('./slack');
const { listEvents } = require('./calendar');

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

async function fetchWeather() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const city = process.env.WEATHER_CITY || 'Fort Lauderdale, Florida';

  if (!apiKey) {
    console.warn('OPENWEATHER_API_KEY not set, skipping weather');
    return { error: 'missing_api_key' };
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=imperial&appid=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    let errorDetail = '';
    try {
      errorDetail = await response.text();
    } catch (readError) {
      errorDetail = '';
    }
    throw new Error(`OpenWeatherMap error ${response.status}: ${errorDetail}`);
  }

  const data = await response.json();
  return {
    temp: data?.main?.temp,
    feelsLike: data?.main?.feels_like,
    condition: data?.weather?.[0]?.description
  };
}

async function getWeatherLine() {
  try {
    const weather = await fetchWeather();
    if (!weather || weather.error) {
      return '🌤️ *Weather:* Weather unavailable';
    }

    const temperature = Math.round(Number(weather.temp));
    const feelsLike = Math.round(Number(weather.feelsLike));
    const conditionRaw = weather.condition || 'Unknown';
    const condition = conditionRaw.charAt(0).toUpperCase() + conditionRaw.slice(1);

    if (Number.isNaN(temperature) || Number.isNaN(feelsLike)) {
      return '🌤️ *Weather:* Weather unavailable';
    }

    return `🌤️ *Weather:* ${temperature}°F (feels like ${feelsLike}°F) - ${condition}`;
  } catch (error) {
    console.error('Weather fetch failed:', error.message);
    return '🌤️ *Weather:* Weather unavailable';
  }
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
    
    const [weatherLine, northstarEvents] = await Promise.all([
      getWeatherLine(),
      listEvents(startOfDay.toISOString(), endOfDay.toISOString())
    ]);
    
    // Format the summary
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: timezone
    });
    
    let summary = `📅 *Daily Summary for ${dateStr}*\n\n`;
    summary += `${weatherLine}\n\n`;
    summary += `${formatEventList(northstarEvents)}`;
    
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
