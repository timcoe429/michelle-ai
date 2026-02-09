# Current Plan

## Status: Fixing OAuth + Project Setup

### Completed
- Core bot functionality (create, update, delete, find events)
- Daily summary with work calendar sync
- Slack integration with thinking indicators
- Prefix/color system for event categorization
- Weather integration for daily summaries (Fort Lauderdale)
- Follow-up event automation
- Error logging improvements
- Force fresh calendar data on every query

### In Progress
- [ ] **CLAUDE.md and /ai context files** — Setting up project memory so Cursor always knows where we left off
- [ ] **Google OAuth permanent fix** — Token expires every 7 days because Google Cloud project is in "Testing" mode. Need to either move to "Internal" app type or publish to "Production"

### Blockers
- Google OAuth token expiration breaks the bot weekly until manually refreshed

### Next Up
- Fix OAuth permanently (after context files are done)
- Evaluate multi-user deployment

---
