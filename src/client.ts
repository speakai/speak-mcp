import axios from "axios";

const BASE_URL = process.env.SPEAK_BASE_URL ?? "https://api.speakai.co";
const API_KEY = process.env.SPEAK_API_KEY ?? "";
const ACCESS_TOKEN = process.env.SPEAK_ACCESS_TOKEN ?? "";

if (!API_KEY) {
  process.stderr.write(
    "[speak-mcp] Warning: SPEAK_API_KEY is not set. All requests will fail.\n"
  );
}

export const speakClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "x-speakai-key": API_KEY,
    ...(ACCESS_TOKEN ? { "x-access-token": ACCESS_TOKEN } : {}),
  },
  timeout: 60_000,
});

/**
 * Formats an Axios error into a human-readable string suitable for MCP error responses.
 */
export function formatAxiosError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    const message =
      typeof data === "object" && data !== null
        ? JSON.stringify(data, null, 2)
        : String(data ?? error.message);
    return status ? `HTTP ${status}: ${message}` : `Request failed: ${message}`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
