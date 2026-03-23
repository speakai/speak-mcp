import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { speakClient, formatAxiosError } from "../client.js";

export function register(server: McpServer): void {
  // 1. Get signed upload URL
  server.tool(
    "get_signed_upload_url",
    "Get a pre-signed S3 URL for direct media file upload. Use this before uploading a file directly to Speak AI storage.",
    {
      isVideo: z
        .boolean()
        .describe("Whether the file being uploaded is a video"),
      filename: z.string().describe("Original filename including extension"),
      mimeType: z
        .string()
        .describe('MIME type of the file, e.g. "audio/mp4" or "video/mp4"'),
    },
    async ({ isVideo, filename, mimeType }) => {
      try {
        const result = await speakClient.get("/v1/media/upload/signedurl", {
          params: { isVideo, filename, mimeType },
        });
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

  // 2. Upload media
  server.tool(
    "upload_media",
    "Upload a media file to Speak AI by providing a publicly accessible URL. Speak AI will fetch and process the file asynchronously.",
    {
      mediaUrl: z
        .string()
        .url()
        .optional()
        .describe("Publicly accessible URL of the media file to import"),
      fileName: z.string().optional().describe("Desired display name for the media file"),
      mediaType: z
        .string()
        .optional()
        .describe('Type of media: "audio" or "video"'),
      folderId: z
        .string()
        .optional()
        .describe("ID of the folder to place the media in"),
      language: z
        .string()
        .optional()
        .describe('BCP-47 language code, e.g. "en" or "fr"'),
    },
    async (body) => {
      try {
        const result = await speakClient.post("/v1/media/upload", body);
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

  // 3. List media
  server.tool(
    "list_media",
    "List all media files in the workspace with optional filtering, pagination, and sorting.",
    {
      mediaType: z
        .string()
        .optional()
        .describe('Filter by media type: "audio" or "video"'),
      page: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Page number for pagination (default: 1)"),
      pageSize: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Number of results per page (default: 20)"),
      sortBy: z
        .string()
        .optional()
        .describe('Sort field, e.g. "createdAt" or "name"'),
      filterMedia: z
        .string()
        .optional()
        .describe("Filter by media processing status"),
      filterName: z
        .string()
        .optional()
        .describe("Filter media by partial name match"),
      folderId: z
        .string()
        .optional()
        .describe("Filter media within a specific folder"),
    },
    async (params) => {
      try {
        const result = await speakClient.get("/v1/media", { params });
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

  // 4. Get media insights
  server.tool(
    "get_media_insights",
    "Retrieve AI-generated insights for a media file, including topics, sentiment, action items, and summaries.",
    {
      mediaId: z.string().describe("Unique identifier of the media file"),
    },
    async ({ mediaId }) => {
      try {
        const result = await speakClient.get(`/v1/media/insight/${mediaId}`);
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

  // 5. Get transcript
  server.tool(
    "get_transcript",
    "Retrieve the full transcript for a media file, including speaker labels and timestamps.",
    {
      mediaId: z.string().describe("Unique identifier of the media file"),
    },
    async ({ mediaId }) => {
      try {
        const result = await speakClient.get(`/v1/media/transcript/${mediaId}`);
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

  // 6. Update transcript speakers
  server.tool(
    "update_transcript_speakers",
    "Update or rename speaker labels in a media transcript.",
    {
      mediaId: z.string().describe("Unique identifier of the media file"),
      speakers: z
        .array(
          z.object({
            speakerId: z.string().describe("Internal speaker identifier"),
            name: z.string().describe("Display name to assign to the speaker"),
          })
        )
        .describe("Array of speaker ID to name mappings"),
    },
    async ({ mediaId, speakers }) => {
      try {
        const result = await speakClient.put(
          `/v1/media/speakers/${mediaId}`,
          { speakers }
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

  // 7. Get media status
  server.tool(
    "get_media_status",
    "Check the processing status of a media file (e.g. pending, transcribing, completed, failed).",
    {
      mediaId: z.string().describe("Unique identifier of the media file"),
    },
    async ({ mediaId }) => {
      try {
        const result = await speakClient.get(`/v1/media/status/${mediaId}`);
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

  // 8. Update media metadata
  server.tool(
    "update_media_metadata",
    "Update metadata fields (e.g. title, description, tags) for an existing media file.",
    {
      mediaId: z.string().describe("Unique identifier of the media file"),
      title: z.string().optional().describe("New display title for the media"),
      description: z.string().optional().describe("Description or notes for the media"),
      language: z
        .string()
        .optional()
        .describe("BCP-47 language code to override the detected language"),
      folderId: z
        .string()
        .optional()
        .describe("Move media to this folder ID"),
      customFields: z
        .record(z.unknown())
        .optional()
        .describe("Any additional custom metadata fields as key-value pairs"),
    },
    async ({ mediaId, ...body }) => {
      try {
        const result = await speakClient.put(`/v1/media/${mediaId}`, body);
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

  // 9. Delete media
  server.tool(
    "delete_media",
    "Permanently delete a media file and all associated transcripts and insights.",
    {
      mediaId: z.string().describe("Unique identifier of the media file to delete"),
    },
    async ({ mediaId }) => {
      try {
        const result = await speakClient.delete(`/v1/media/${mediaId}`);
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
