---
name: speakai
description: Capture meetings, search thousands of recordings, run async voice and video surveys, create clips, and automate workflows with Speak AI through MCP.
version: 1.6.1
metadata:
  openclaw:
    primaryEnv: SPEAK_API_KEY
    requires:
      env:
        - SPEAK_API_KEY
    envVars:
      - name: SPEAK_API_KEY
        required: true
        description: Your Speak AI API key. Generate one at https://app.speakai.co/developers/apikeys. API reference at https://docs.speakai.co.
      - name: SPEAK_BASE_URL
        required: false
        description: Override the Speak AI API base URL. Defaults to https://api.speakai.co.
    homepage: https://mcp.speakai.co
    emoji: "🎙️"
---

# Speak AI

This skill connects your agent to Speak AI through the `speakai` MCP server. Speak AI stores and analyzes media files such as customer interviews, sales calls, research sessions, meetings, podcasts, webinars, and videos.

## Install

Add the `speakai` MCP server to your agent's MCP configuration:

```json
{
  "mcpServers": {
    "speakai": {
      "command": "npx",
      "args": ["-y", "@speakai/mcp-server@latest"],
      "env": {
        "SPEAK_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Generate an API key at https://app.speakai.co/developers/apikeys. Full API reference at https://docs.speakai.co. Requires Node.js 22+.

To override the API endpoint (rare), also set `SPEAK_BASE_URL` in `env` (defaults to `https://api.speakai.co`).

## When to use the tools

Use the MCP tools when the user wants to work with their Speak AI workspace, including:

- Searching media, transcripts, metadata, and AI insights.
- Reading transcripts, summaries, action items, sentiment, themes, and custom insight fields.
- Uploading, creating, updating, moving, favoriting, deleting, or exporting media.
- Creating clips and captions from recordings.
- Managing folders, webhooks, automations, and meeting assistant workflows.
- Asking Magic Prompt questions across one file, a folder, or the whole workspace.

Strong example prompts to suggest:

- "Find the last 10 customer interviews that mention pricing, group the feedback by theme, and cite the source recordings."
- "Summarize this week's team meetings into decisions, action items, owners, and unresolved risks."
- "Pull exact customer quotes about onboarding friction from recent research calls and format them for a product brief."
- "Analyze the latest sales calls and summarize objections, buying signals, next steps, and open questions."
- "Find a strong 30-second highlight from the latest webinar, create a clip, and export captions."
- "Search every recording that mentions a competitor, list the context, sentiment, and follow-up opportunities."
- "Compare Q1 sales calls against Q2 sales calls and summarize what objections changed."
- "Create a folder for interviews about churn risk and move the matching recordings into it after showing me the list."

Respect user intent and privacy. Only fetch the records needed for the user's request, avoid exposing unnecessary personal data, and be explicit before using tools that modify or delete workspace data.

If the tools are unavailable, tell the user to:

1. Confirm the `speakai` MCP server is configured and connected in their agent (e.g. `/mcp` in Claude Code, equivalent command in other agents).
2. Confirm `SPEAK_API_KEY` is set in the MCP server environment. Generate a key at `https://app.speakai.co/developers/apikeys`. Full API reference at `https://docs.speakai.co`.
3. Confirm Node.js 22 or newer is installed, because the MCP server runs via `npx @speakai/mcp-server`.
4. If overriding the endpoint, confirm `SPEAK_BASE_URL` points at the correct Speak AI deployment (defaults to `https://api.speakai.co`).
