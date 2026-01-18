const Anthropic = require('@anthropic-ai/sdk');
const { postSlackMessage, sendSlackMessage, deleteSlackMessage } = require('./slack');
const { getConversation, addMessage } = require('./memory');
const calendar = require('./calendar');

const anthropic = new Anthropic();

// Define tools for Claude
const tools = [
  {
    name: "list_events",
    description: "List events from a calendar. Use this to see what's scheduled.",
    input_schema: {
      type: "object",
      properties: {
        calendar: {
          type: "string",
          description: "Which calendar to check: 'work', 'personal', or 'northstar'"
        },
        start_date: {
          type: "string",
          description: "Start date/time in ISO format (e.g., '2024-01-15T00:00:00'). Defaults to now."
        },
        end_date: {
          type: "string",
          description: "End date/time in ISO format. Defaults to 7 days from now."
        }
      },
      required: ["calendar"]
    }
  },
  {
    name: "list_all_calendars",
    description: "List today's events from ALL calendars (work, personal, northstar) at once.",
    input_schema: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Start date/time in ISO format. Defaults to now."
        },
        end_date: {
          type: "string",
          description: "End date/time in ISO format. Defaults to end of today."
        }
      }
    }
  },
  {
    name: "get_next_event",
    description: "Get the single next upcoming event across all calendars. Use this when user asks 'what's next' or 'what do I have coming up'.",
    input_schema: {
      type: "object",
      properties: {
        include_all_calendars: {
          type: "boolean",
          description: "Whether to check all calendars (default true)"
        }
      }
    }
  },
  {
    name: "create_event",
    description: "Create a new calendar event.",
    input_schema: {
      type: "object",
      properties: {
        calendar: {
          type: "string",
          description: "Which calendar: 'work', 'personal', or 'northstar'"
        },
        title: {
          type: "string",
          description: "Event title"
        },
        start_time: {
          type: "string",
          description: "Start time in ISO format (e.g., '2024-01-15T14:00:00-07:00')"
        },
        end_time: {
          type: "string",
          description: "End time in ISO format"
        },
        description: {
          type: "string",
          description: "Event description (optional)"
        },
        color: {
          type: "string",
          description: "Event color: blue, green, purple, red, yellow, orange, turquoise, gray (optional)"
        }
      },
      required: ["calendar", "title", "start_time", "end_time"]
    }
  },
  {
    name: "update_event",
    description: "Update an existing calendar event. First use find_event to get the event ID.",
    input_schema: {
      type: "object",
      properties: {
        calendar: {
          type: "string",
          description: "Which calendar the event is on"
        },
        event_id: {
          type: "string",
          description: "The event ID to update"
        },
        title: {
          type: "string",
          description: "New title (optional)"
        },
        start_time: {
          type: "string",
          description: "New start time in ISO format (optional)"
        },
        end_time: {
          type: "string",
          description: "New end time in ISO format (optional)"
        },
        description: {
          type: "string",
          description: "New description (optional)"
        },
        color: {
          type: "string",
          description: "New color (optional)"
        }
      },
      required: ["calendar", "event_id"]
    }
  },
  {
    name: "delete_event",
    description: "Delete a calendar event. First use find_event to get the event ID.",
    input_schema: {
      type: "object",
      properties: {
        calendar: {
          type: "string",
          description: "Which calendar the event is on"
        },
        event_id: {
          type: "string",
          description: "The event ID to delete"
        }
      },
      required: ["calendar", "event_id"]
    }
  },
  {
    name: "find_event",
    description: "Search for events by title/keyword. Returns event IDs needed for update/delete.",
    input_schema: {
      type: "object",
      properties: {
        calendar: {
          type: "string",
          description: "Which calendar to search"
        },
        query: {
          type: "string",
          description: "Search term to find in event titles"
        },
        start_date: {
          type: "string",
          description: "Start of search range (ISO format). Defaults to now."
        },
        end_date: {
          type: "string",
          description: "End of search range (ISO format). Defaults to 30 days from now."
        }
      },
      required: ["calendar", "query"]
    }
  }
];

// Execute a tool call
async function executeTool(toolName, toolInput) {
  try {
    switch (toolName) {
      case 'list_events':
        return await calendar.listEvents(
          toolInput.calendar,
          toolInput.start_date,
          toolInput.end_date
        );
      
      case 'list_all_calendars':
        return await calendar.listAllCalendarsEvents(
          toolInput.start_date,
          toolInput.end_date
        );

      case 'get_next_event':
        return await calendar.getNextEvent();
      
      case 'create_event':
        return await calendar.createEvent(toolInput.calendar, {
          title: toolInput.title,
          startTime: toolInput.start_time,
          endTime: toolInput.end_time,
          description: toolInput.description,
          color: toolInput.color
        });
      
      case 'update_event':
        return await calendar.updateEvent(toolInput.calendar, toolInput.event_id, {
          title: toolInput.title,
          startTime: toolInput.start_time,
          endTime: toolInput.end_time,
          description: toolInput.description,
          color: toolInput.color
        });
      
      case 'delete_event':
        return await calendar.deleteEvent(toolInput.calendar, toolInput.event_id);
      
      case 'find_event':
        return await calendar.findEvent(
          toolInput.calendar,
          toolInput.query,
          toolInput.start_date,
          toolInput.end_date
        );
      
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return { error: error.message };
  }
}

// Get current date info for context
function getDateContext() {
  const now = new Date();
  const timezone = process.env.TIMEZONE || 'America/Denver';
  
  return `Current date and time: ${now.toLocaleString('en-US', { timeZone: timezone, dateStyle: 'full', timeStyle: 'short' })}. Timezone: ${timezone}.`;
}

const SYSTEM_PROMPT = `You are Tim's personal assistant. You manage three Google Calendars (Work, Personal, Northstar) and help him structure his time effectively.

CRITICAL CONTEXT - READ THIS FIRST:
Tim has ADHD. This fundamentally shapes how you communicate:

1. LISTS ARE FINE FOR SCHEDULES - When Tim asks "what do I have today?" or wants his daily overview, give him the full list. That's helpful context. The morning summary should show everything.

2. ONE THING AT A TIME FOR ACTIONS - When Tim needs to DO something (steps to complete, decisions to make, things to set up), give him one action at a time. Wait for him to complete it before giving the next. Don't dump 5 instructions at once.

3. TIME BLOCKING > TO-DO LISTS - A task without time blocked is a task that won't happen. When Tim mentions something he needs to do, your job is to help him decide WHEN, not just track THAT. Ask: "When do you want to block time for that?"

4. DON'T OVERWHELM - If there's a lot going on, don't dump it all. Summarize simply, then offer to go deeper.

5. PROTECT FOCUS TIME - When Tim blocks time for project work, that's sacred. He hyperfocuses and that's when he does his best work. Don't suggest cramming more in.

6. BUFFER TIME MATTERS - Don't let him stack things back-to-back. He needs transition time. If he's scheduling something right after another block, gently suggest a 15-min buffer.

7. BE DIRECT AND CONCISE - Short responses. No fluff. Slack, not email.

YOUR JOB IS TO:
- Help Tim decide WHEN things get done, not just what needs doing
- Block time on his calendar for projects and tasks (not just meetings)
- Give him his ONE next thing when he asks
- Protect his time from overload
- Keep responses structured and scannable

RESPONSE FORMATTING:
- Use emojis sparingly for scannability: ✅ success, 📅 dates, 🕐 times, 📍 calendar
- When confirming a created event:

✅ **Event created!**
📅 **[Title]**
🕐 [Time] - [End Time]
📍 [Calendar]

- When listing the day's schedule, use a clean list format
- When asking questions, ask ONE question at a time

CALENDARS:
- **Work** - ServiceCore/Docket work
- **Personal** - Personal stuff
- **Northstar** - Northstar Roofing business

TIMEZONE: Eastern Time (America/New_York)

EXAMPLES OF GOOD RESPONSES:

User: "What do I have today?"
You: "Here's your day:

🕐 9:00 AM - Client call (Work)
🕐 11:00 AM - Dentist (Personal)
🕐 2:00 PM - Northstar proposal work (Northstar)
🕐 4:00 PM - Team sync (Work)

Your next thing is the client call at 9am."

User: "I need to work on the Northstar proposal this week"
You: "When do you want to block time for that? I see tomorrow afternoon is open. How long do you need?"

User: "Add 2 hours tomorrow at 2pm for Northstar proposal"
You: "✅ **Time blocked!**
📅 **Northstar proposal**
🕐 2:00 PM - 4:00 PM
📍 Northstar

You're set."

EXAMPLES OF BAD RESPONSES:

❌ "I've added that to your calendar! Is there anything else you'd like me to help you with? I can also help you with tasks, reminders, or anything else!" (too fluffy)

❌ "You should also consider adding buffer time, and maybe breaking that into smaller chunks, and also have you thought about..." (too many suggestions at once)

${getDateContext()}`;

async function handleMessage(event) {
  const userId = event.user;
  const userMessage = event.text;
  const channel = event.channel;
  
  console.log(`Message from ${userId}: ${userMessage}`);

  let thinkingTs = null;
  try {
    thinkingTs = await postSlackMessage(channel, '_thinking..._');
  } catch (error) {
    console.error('Error sending thinking indicator:', error);
  }
  
  // Get conversation history
  const history = getConversation(userId);
  
  // Add user message to history
  addMessage(userId, 'user', userMessage);
  
  // Build messages array for Claude
  const messages = [
    ...history,
    { role: 'user', content: userMessage }
  ];
  
  try {
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: tools,
      messages: messages
    });
    
    // Handle tool use loop
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');
      const toolResults = [];
      
      for (const toolUse of toolUseBlocks) {
        console.log(`Executing tool: ${toolUse.name}`, toolUse.input);
        const result = await executeTool(toolUse.name, toolUse.input);
        console.log(`Tool result:`, result);
        
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result)
        });
      }
      
      // Continue conversation with tool results
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
      
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: tools,
        messages: messages
      });
    }
    
    // Extract text response
    const textContent = response.content.find(block => block.type === 'text');
    const replyText = textContent ? textContent.text : "I couldn't process that request.";
    
    // Add assistant response to history
    addMessage(userId, 'assistant', replyText);

    if (thinkingTs) {
      try {
        await deleteSlackMessage(channel, thinkingTs);
      } catch (error) {
        console.error('Error deleting thinking indicator:', error);
      }
    }
    
    // Send response to Slack
    await sendSlackMessage(channel, replyText);
    
  } catch (error) {
    console.error('Error processing message:', error);
    if (thinkingTs) {
      try {
        await deleteSlackMessage(channel, thinkingTs);
      } catch (deleteError) {
        console.error('Error deleting thinking indicator:', deleteError);
      }
    }
    await sendSlackMessage(channel, "Sorry, I encountered an error processing your request. Please try again.");
  }
}

module.exports = { handleMessage };
