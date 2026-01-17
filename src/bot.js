const Anthropic = require('@anthropic-ai/sdk');
const { sendSlackMessage } = require('./slack');
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

const SYSTEM_PROMPT = `You are Tim's personal calendar assistant. You help manage three Google Calendars:

1. **Work** - for ServiceCore/Docket work-related meetings and appointments
2. **Personal** - for personal events and appointments  
3. **Northstar** - for Northstar Roofing business events

Your job is to:
- Create, view, edit, and delete calendar events
- Help Tim stay organized across all three calendars
- Be concise and efficient in your responses
- When creating events, always confirm which calendar if not specified
- When searching for events to update/delete, use find_event first to get the event ID

Important:
- Always use ISO format for dates/times with timezone offset (e.g., 2024-01-15T14:00:00-07:00)
- Tim is in Mountain Time (America/Denver)
- Be helpful but brief - this is Slack, not email
- If an action is completed successfully, confirm it simply
- If you need clarification, ask directly

${getDateContext()}`;

async function handleMessage(event) {
  const userId = event.user;
  const userMessage = event.text;
  const channel = event.channel;
  
  console.log(`Message from ${userId}: ${userMessage}`);
  
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
    
    // Send response to Slack
    await sendSlackMessage(channel, replyText);
    
  } catch (error) {
    console.error('Error processing message:', error);
    await sendSlackMessage(channel, "Sorry, I encountered an error processing your request. Please try again.");
  }
}

module.exports = { handleMessage };
