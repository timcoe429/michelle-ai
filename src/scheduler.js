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
  
  // Sort by ISO start time (timezone-agnostic)
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.start);
    const dateB = new Date(b.start);
    return dateA - dateB;
  });
  
  return sortedEvents.map(event => {
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
    // Get today's date range in the calendar's timezone
    const now = new Date();
    const timezone = process.env.TIMEZONE || 'America/Denver';
    
    // Get today's date as YYYY-MM-DD string in target timezone
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: timezone });
    
    // Get timezone offset string (like "-07:00")
    const offsetPart = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset'
    }).formatToParts(now).find(p => p.type === 'timeZoneName').value.replace('GMT', '');
    
    // Format offset to RFC3339 format (e.g., "-5" -> "-05:00", "-7" -> "-07:00")
    // Parse offset (format is like "-5" or "+5" or "-5:30")
    let offsetStr = offsetPart;
    if (!offsetStr.includes(':')) {
      // Simple hour offset like "-5" or "+5"
      const sign = offsetStr.startsWith('-') ? '-' : '+';
      const hours = Math.abs(parseInt(offsetStr));
      offsetStr = `${sign}${String(hours).padStart(2, '0')}:00`;
    } else {
      // Already has minutes like "-5:30"
      const [hours, mins] = offsetStr.split(':');
      const sign = hours.startsWith('-') ? '-' : '+';
      const absHours = Math.abs(parseInt(hours));
      offsetStr = `${sign}${String(absHours).padStart(2, '0')}:${mins.padStart(2, '0')}`;
    }
    
    // Create RFC3339 datetime strings
    const startOfDay = `${todayStr}T00:00:00${offsetStr}`;
    const endOfDay = `${todayStr}T23:59:59${offsetStr}`;
    
    // Get Tim's calendar ID (hardcoded for now, will make multi-user later)
    const timCalendarId = process.env.USER_TIM_CALENDAR;
    if (!timCalendarId) {
      console.error('USER_TIM_CALENDAR not set, skipping daily summary');
      return;
    }
    
    const [weatherLine, timEvents] = await Promise.all([
      getWeatherLine(),
      listEvents(timCalendarId, startOfDay, endOfDay)
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
    summary += `${formatEventList(timEvents)}`;
    
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
