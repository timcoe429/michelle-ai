# Current Plan

## Status: OAuth Migration Complete, Per-User Config Active

### Completed
- Core bot functionality (create, update, delete, find events)
- Multi-user support with per-user calendar configuration
- Slack formatting fixes (native Slack syntax)
- Per-user config system (timezone, weather, daily channel)
- Multi-user daily summaries with per-user timezone/weather
- Prefix/color system for event categorization
- Follow-up event automation
- Error logging improvements
- Force fresh calendar data on every query
- Daily summary 400 error fix (full ISO 8601 format for Google Calendar API)

### In Progress
- [ ] **Omiah setup** — Needs Google OAuth refresh token configured

### Blockers
- None currently

### Next Up
- Complete Omiah's Google OAuth setup
- Consider per-user cron schedules if timezone differences become an issue

---
