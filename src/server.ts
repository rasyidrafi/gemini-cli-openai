import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { Env } from "./types";
import { OpenAIRoute } from "./routes/openai";
import { DebugRoute } from "./routes/debug";
import { openAIApiKeyAuth } from "./middlewares/auth";
import { loggingMiddleware } from "./middlewares/logging";
import { loadNodeEnv } from "./node-env";

/**
 * Gemini CLI OpenAI Worker - Node.js Server Version
 *
 * A Node.js server that provides OpenAI-compatible API endpoints
 * for Google's Gemini models via the Gemini CLI OAuth flow.
 *
 * This version runs on traditional Node.js instead of Cloudflare Workers.
 */

// Load environment variables for Node.js
const env: Env = loadNodeEnv();

// Create the main Hono app
const app = new Hono<{ Bindings: Env }>();

// Add logging middleware
app.use("*", loggingMiddleware);

// Add CORS headers for all requests
app.use("*", async (c, next) => {
	// Set CORS headers
	c.header("Access-Control-Allow-Origin", "*");
	c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

	// Handle preflight requests
	if (c.req.method === "OPTIONS") {
		c.status(204);
		return c.body(null);
	}

	await next();
});

// Apply OpenAI API key authentication middleware to all /v1 routes
app.use("/v1/*", openAIApiKeyAuth);

// Setup route handlers
app.route("/v1", OpenAIRoute);
app.route("/v1/debug", DebugRoute);

// Add individual debug routes to main app for backward compatibility
app.route("/v1", DebugRoute);

// Root endpoint - basic info about the service
app.get("/", (c) => {
	const requiresAuth = !!env.OPENAI_API_KEY;

	return c.json({
		name: "Gemini CLI OpenAI Worker (Node.js)",
		description: "OpenAI-compatible API for Google Gemini models via OAuth",
		version: "1.0.0",
		authentication: {
			required: requiresAuth,
			type: requiresAuth ? "Bearer token in Authorization header" : "None"
		},
		endpoints: {
			chat_completions: "/v1/chat/completions",
			models: "/v1/models",
			debug: {
				cache: "/v1/debug/cache",
				token_test: "/v1/token-test",
				full_test: "/v1/test"
			}
		},
		documentation: "https://github.com/gewoonjaap/gemini-cli-openai"
	});
});

// Health check endpoint
app.get("/health", (c) => {
	return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Middleware to inject environment into context
app.use("*", async (c, next) => {
	c.env = env;
	await next();
});

// Start the server
const port = process.env.PORT ? parseInt(process.env.PORT) : 8787;
console.log(`🚀 Gemini CLI OpenAI Worker (Node.js) starting on port ${port}`);

serve({
	fetch: app.fetch,
	port,
});