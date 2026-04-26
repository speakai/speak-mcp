# Speak AI MCP for Claude Code

This Claude Code plugin connects your local Claude Code session to Speak AI through the `@speakai/mcp-server` MCP server. It lets Claude Code work with your Speak AI media, transcripts, AI insights, clips, folders, exports, automations, webhooks, and meeting assistant workflows.

## Install from the marketplace

```sh
claude plugin marketplace add speakai/speakai-mcp
claude plugin install speakai-mcp@speakai
```

When Claude Code enables the plugin, enter your Speak AI API key from:

```text
https://app.speakai.co/developers/apikeys
```

## Example prompts

Use prompts like these after the plugin is installed:

```text
Find the last 10 customer interviews that mention pricing, group the feedback by theme, and cite the source recordings.
```

```text
Summarize this week's team meetings into decisions, action items, owners, and unresolved risks.
```

```text
Pull exact customer quotes about onboarding friction from recent research calls and format them for a product brief.
```

```text
Analyze the latest sales calls and summarize objections, buying signals, next steps, and open questions.
```

```text
Find a strong 30-second highlight from the latest webinar, create a clip, and export captions.
```

```text
Search every recording that mentions a competitor, list the context, sentiment, and follow-up opportunities.
```

```text
Compare Q1 sales calls against Q2 sales calls and summarize what objections changed.
```

```text
Create a folder for interviews about churn risk and move the matching recordings into it after showing me the list.
```

## Local development

From this repository root:

```sh
claude --plugin-dir ./plugins/speakai-mcp
```

Then run `/reload-plugins` inside Claude Code after editing plugin files.

## Troubleshooting

- If tools do not appear, run `/mcp` in Claude Code and confirm the `speakai` server is connected.
- If authentication fails, rotate or recreate your API key in Speak AI and reconfigure the plugin.
- If `npx` cannot install the MCP server, confirm Node.js 22 or newer is available in your shell.
