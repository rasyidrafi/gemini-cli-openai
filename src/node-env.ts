import * as fs from "fs";
import * as path from "path";
import { LocalKVStorage, KVNamespace } from "./local-kv";
import { Env } from "./types";

/**
 * Load environment variables for Node.js deployment
 */
export function loadNodeEnv(): Env {
	// Load from .env file if it exists
	const envPath = path.join(process.cwd(), ".env");
	if (fs.existsSync(envPath)) {
		const envContent = fs.readFileSync(envPath, "utf-8");
		const envLines = envContent.split("\n");

		for (const line of envLines) {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith("#")) {
				const [key, ...valueParts] = trimmed.split("=");
				const value = valueParts.join("=").trim();
				if (key && value) {
					process.env[key] = value;
				}
			}
		}
	}

	// Create local KV storage
	const kvStorage = new LocalKVStorage("./.local-kv");

	return {
		GCP_SERVICE_ACCOUNT: process.env.GCP_SERVICE_ACCOUNT || "",
		GEMINI_PROJECT_ID: process.env.GEMINI_PROJECT_ID,
		GEMINI_CLI_KV: kvStorage as KVNamespace,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		ENABLE_FAKE_THINKING: process.env.ENABLE_FAKE_THINKING,
		ENABLE_REAL_THINKING: process.env.ENABLE_REAL_THINKING,
		STREAM_THINKING_AS_CONTENT: process.env.STREAM_THINKING_AS_CONTENT,
		ENABLE_AUTO_MODEL_SWITCHING: process.env.ENABLE_AUTO_MODEL_SWITCHING,
		GEMINI_MODERATION_HARASSMENT_THRESHOLD: process.env.GEMINI_MODERATION_HARASSMENT_THRESHOLD as any,
		GEMINI_MODERATION_HATE_SPEECH_THRESHOLD: process.env.GEMINI_MODERATION_HATE_SPEECH_THRESHOLD as any,
		GEMINI_MODERATION_SEXUALLY_EXPLICIT_THRESHOLD: process.env.GEMINI_MODERATION_SEXUALLY_EXPLICIT_THRESHOLD as any,
		GEMINI_MODERATION_DANGEROUS_CONTENT_THRESHOLD: process.env.GEMINI_MODERATION_DANGEROUS_CONTENT_THRESHOLD as any,
		ENABLE_GEMINI_NATIVE_TOOLS: process.env.ENABLE_GEMINI_NATIVE_TOOLS,
		ENABLE_GOOGLE_SEARCH: process.env.ENABLE_GOOGLE_SEARCH,
		ENABLE_URL_CONTEXT: process.env.ENABLE_URL_CONTEXT,
		GEMINI_TOOLS_PRIORITY: process.env.GEMINI_TOOLS_PRIORITY,
		DEFAULT_TO_NATIVE_TOOLS: process.env.DEFAULT_TO_NATIVE_TOOLS,
		ALLOW_REQUEST_TOOL_CONTROL: process.env.ALLOW_REQUEST_TOOL_CONTROL,
		ENABLE_INLINE_CITATIONS: process.env.ENABLE_INLINE_CITATIONS,
		INCLUDE_GROUNDING_METADATA: process.env.INCLUDE_GROUNDING_METADATA,
		INCLUDE_SEARCH_ENTRY_POINT: process.env.INCLUDE_SEARCH_ENTRY_POINT,
	};
}