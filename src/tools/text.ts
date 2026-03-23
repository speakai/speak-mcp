import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { speakClient, formatAxiosError } from "../client.js";

export function register(server: McpServer): void {
  // 10. Create text note
  server.tool(
    "create_text_note",
    "Create a new text note in Speak AI for analysis. The content will be analyzed for insights, topics, and sentiment.",
    {
      title: z.string().describe("Title for the text note"),
      content: z.string().describe("Full text content to analyze"),
      folderId: z
        .string()
        .optional()
        .describe("ID of the folder to place the note in"),
      language: z
        .string()
        .optional()
        .describe('BCP-47 language code, e.g. "en" or "fr"'),
    },
    async (body) => {
      try {
        const result = await speakClient.post("/v1/text/create", body);
        return {
          content: [
            { type: "text", text: JSON.stringify(result.data, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${formatAxiosError(err)}` }],
          isError: true,
        };
      }
    }
  );

  // 11. Get text insight
  server.tool(
    "get_text_insight",
    "Retrieve AI-generated insights for a text note, including topics, sentiment, summaries, and action items.",
    {
      mediaId: z.string().describe("Unique identifier of the text note"),
    },
    async ({ mediaId }) => {
      try {
        const result = await speakClient.get(`/v1/text/insight/${mediaId}`);
        return {
          content: [
            { type: "text", text: JSON.stringify(result.data, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${formatAxiosError(err)}` }],
          isError: true,
        };
      }
    }
  );

  // 12. Reanalyze text
  server.tool(
    "reanalyze_text",
    "Trigger a re-analysis of an existing text note to regenerate insights with the latest AI models.",
    {
      mediaId: z.string().describe("Unique identifier of the text note to reanalyze"),
    },
    async ({ mediaId }) => {
      try {
        const result = await speakClient.get(`/v1/text/reanalyze/${mediaId}`);
        return {
          content: [
            { type: "text", text: JSON.stringify(result.data, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${formatAxiosError(err)}` }],
          isError: true,
        };
      }
    }
  );

  // 13. Update text note
  server.tool(
    "update_text_note",
    "Update the title or content of an existing text note. Updating content will trigger re-analysis.",
    {
      mediaId: z.string().describe("Unique identifier of the text note"),
      title: z.string().optional().describe("New title for the text note"),
      content: z
        .string()
        .optional()
        .describe("New text content (will trigger re-analysis)"),
    },
    async ({ mediaId, ...body }) => {
      try {
        const result = await speakClient.put(
          `/v1/text/update/${mediaId}`,
          body
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(result.data, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${formatAxiosError(err)}` }],
          isError: true,
        };
      }
    }
  );
}
