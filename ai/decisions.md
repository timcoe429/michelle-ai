## Feb 1, 2026 - API Response Handling
- Increased max_tokens from 1024 to 4096 for complex multi-event requests
- Added response logging after every Anthropic API call
- Better error messages when Claude returns no text content

## Feb 1, 2026 - Google OAuth Lesson Learned
- Testing mode = 7-day token expiration (critical detail that was missed)
- For personal apps on Google Workspace: use "Internal" app type to avoid expiration
- When credentials get into weird state: create fresh OAuth credentials rather than debugging
