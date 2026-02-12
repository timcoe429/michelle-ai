const cron = require('node-cron');
const { sendSlackMessage } = require('./slack');
const { listEvents } = require('./calendar');

function formatTime(isoString, timezone) {
  if (!isoString) return 'All day';
  
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone || process.env.TIMEZONE || 'America/Denver'
  });
}

function formatEventList(events, timezone) {
  if (!events || events.length === 0) {
    return '  _No events scheduled_';
  }
  
  // Sort by ISO start time (timezone-agnostic). Guard against missing/invalid start.
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = a.start ? new Date(a.start) : new Date(0);
    const dateB = b.start ? new Date(b.start) : new Date(0);
    if (isNaN(dateA.getTime())) return 1;
    if (isNaN(dateB.getTime())) return -1;
    return dateA - dateB;
  });
  
  return sortedEvents.map(event => {
    const time = formatTime(event.start, timezone);
    return `  • ${time} - ${event.title}`;
  }).join('\n');
}

async function fetchWeather(cityName) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    return { error: 'missing_api_key' };
  }
  
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&units=imperial&appid=${apiKey}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenWeatherMap error ${response.status}`);
    }
    
    const data = await response.json();
    return {
      temp: data?.main?.temp,
      feelsLike: data?.main?.feels_like,
      condition: data?.weather?.[0]?.description
    };
  } catch (error) {
    console.error('Weather fetch failed:', error.message);
    return { error: error.message };
  }
}

async function sendDailySummary() {
  // Find all configured users
  const userKeys = Object.keys(process.env).filter(key => 
    key.startsWith('USER_') && key.endsWith('_SLACK_ID')
  );
  
  if (userKeys.length === 0) {
    console.warn('No users configured, skipping daily summary');
    return;
  }
  
  // Process each user
  for (const slackIdKey of userKeys) {
    const userId = process.env[slackIdKey];
    const userPrefix = slackIdKey.replace('_SLACK_ID', '');
    
    // Get user config
    const dailyChannel = process.env[`${userPrefix}_DAILY_CHANNEL`];
    if (!dailyChannel) {
      console.log(`Skipping user ${userId} - no DAILY_CHANNEL configured`);
      continue;
    }
    
    const calendarId = process.env[`${userPrefix}_CALENDAR`];
    const timezone = process.env[`${userPrefix}_TIMEZONE`] || process.env.TIMEZONE || 'America/Denver';
    const weatherLocation = process.env[`${userPrefix}_WEATHER_LOCATION`];
    
    if (!calendarId) {
      console.error(`User ${userId} missing CALENDAR config, skipping`);
      continue;
    }
    
    try {
      await sendUserDailySummary({
        userId,
        calendarId,
        timezone,
        dailyChannel,
        weatherLocation
      });
    } catch (error) {
      console.error(`Error sending daily summary for user ${userId}:`, error);
    }
  }
}

// Get start/end of day as UTC instants for a given timezone (avoids server TZ assumptions)
function getStartAndEndOfDayInTimezone(now, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year').value, 10);
  const month = parseInt(parts.find(p => p.type === 'month').value, 10) - 1;
  const day = parseInt(parts.find(p => p.type === 'day').value, 10);

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Find UTC instant when it's 00:00:00 in user's timezone
  let startOfDayDate = null;
  for (let h = 0; h < 24; h++) {
    const candidate = new Date(Date.UTC(year, month, day, h, 0, 0, 0));
    const timeParts = timeFormatter.formatToParts(candidate);
    const hour = parseInt(timeParts.find(p => p.type === 'hour').value, 10);
    const min = parseInt(timeParts.find(p => p.type === 'minute').value, 10);
    const sec = parseInt(timeParts.find(p => p.type === 'second').value, 10);
    if (hour === 0 && min === 0 && sec === 0) {
      startOfDayDate = candidate;
      break;
    }
  }
  if (!startOfDayDate) {
    startOfDayDate = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
  }

  // Find UTC instant when it's 23:00:00 in user's timezone, then add 59m59s999ms
  let endOfDayDate = null;
  for (let h = 0; h < 24; h++) {
    const candidate = new Date(Date.UTC(year, month, day, h, 0, 0, 0));
    const timeParts = timeFormatter.formatToParts(candidate);
    const hour = parseInt(timeParts.find(p => p.type === 'hour').value, 10);
    const min = parseInt(timeParts.find(p => p.type === 'minute').value, 10);
    const sec = parseInt(timeParts.find(p => p.type === 'second').value, 10);
    if (hour === 23 && min === 0 && sec === 0) {
      endOfDayDate = new Date(candidate.getTime() + (59 * 60 + 59) * 1000 + 999);
      break;
    }
  }
  if (!endOfDayDate) {
    endOfDayDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  }

  return { startOfDayDate, endOfDayDate };
}

async function sendUserDailySummary({ userId, calendarId, timezone, dailyChannel, weatherLocation }) {
  const now = new Date();
  const { startOfDayDate, endOfDayDate } = getStartAndEndOfDayInTimezone(now, timezone);

  // Fetch events and weather in parallel
  const promises = [listEvents(calendarId, startOfDayDate.toISOString(), endOfDayDate.toISOString())];
  
  // Only fetch weather if location is configured
  if (weatherLocation) {
    promises.push(fetchWeather(weatherLocation));
  } else {
    promises.push(Promise.resolve(null));
  }
  
  const [events, weather] = await Promise.all(promises);
  
  // Format date string in user's timezone
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone
  });
  
  let summary = `📅 *Daily Summary for ${dateStr}*\n\n`;
  
  // Add weather if available
  if (weather && !weather.error) {
    const temperature = Math.round(Number(weather.temp));
    const feelsLike = Math.round(Number(weather.feelsLike));
    const condition = weather.condition ? weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1) : 'Unknown';
    const location = weatherLocation || 'your location';
    summary += `🌤️ *Weather:* ${temperature}°F (feels like ${feelsLike}°F) - ${condition} in ${location}\n\n`;
  }
  
  summary += formatEventList(events, timezone);
  
  await sendSlackMessage(dailyChannel, summary);
  console.log(`Daily summary sent to user ${userId} in channel ${dailyChannel}`);
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
