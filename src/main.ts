/**
 * ArXiv MCP Server - Main Entry Point
 *
 * This file serves as the entry point for the ArXiv MCP Server Actor.
 * It sets up a proxy server that forwards requests to the locally running
 * ArXiv MCP server, which provides a Model Context Protocol (MCP) interface
 * for AI assistants to search and access arXiv papers.
 */

import { spawn } from "node:child_process";
import http from "node:http";
// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/)
import { Actor, log } from "apify";
import { waitForServer } from "./utils.js";

// This is an ESM project, and as such, it requires you to specify extensions in your relative imports
// Read more about this here: https://nodejs.org/docs/latest-v18.x/api/esm.html#mandatory-file-extensions
// Note that we need to use `.js` even when inside TS files
// import { router } from './routes.js';


// Configuration constants for the MCP server
const MCP_SERVER_PORT = 3000; // Port on which the MCP server will run locally
const MCP_COMMAND = "uv tool run arxiv-mcp-server"; // Command to run the ArXiv MCP server using uv package manager

// Check if the Actor is running in standby mode
const STANDBY_MODE = Actor.getEnv().metaOrigin === 'STANDBY';


// Initialize the Apify Actor environment
// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init()
await Actor.init();

if (!STANDBY_MODE) {
    // If the Actor is not in standby mode, we should not run the MCP server
    await Actor.fail('This actor is not meant to be run directly. It should be run in standby mode.');
}

/**
 * Spawn the supergateway process that will run the ArXiv MCP server
 *
 * supergateway is used to:
 * - Execute the ArXiv MCP server command
 * - Configure server endpoints
 * - Handle server-sent events (SSE) for real-time communication
 */
const child = spawn(
	"supergateway",
	[
		"--stdio",
		`"${MCP_COMMAND}"`, // Command to execute the ArXiv MCP server
		"--port",
		`${MCP_SERVER_PORT}`, // Port for the MCP server to listen on
		"--ssePath",
		"/sse", // Endpoint for server-sent events
		"--messagePath",
		"/message", // Endpoint for message handling
		"--healthEndpoint",
		"/health", // Endpoint for health checks
	],
	{
		stdio: "inherit", // Inherit stdio streams to see logs in the Actor console
		shell: true, // Run command in a shell to support complex commands
	},
);

// Set up error handling for the child process
child.on("error", (err) => {
	log.error("Child process error:", err);
});

// Log when the child process exits
child.on("exit", (code) => {
	log.info(`Child process exited with code ${code}`);
});

/**
 * Cleanup function to gracefully terminate the child process
 * This ensures resources are properly released when the Actor stops
 */
function cleanup() {
	log.info("Cleaning up before exit...");
	child.kill("SIGINT"); // Send SIGINT signal to allow graceful shutdown
}

// Register cleanup handlers for various termination scenarios
Actor.on("exit", () => {
	cleanup();
});
Actor.on("aborting", () => {
	cleanup();
});
process.on("SIGINT", () => {
	cleanup();
	process.exit(0);
});

// Wait for the MCP server to start and become available
log.info("Waiting for MCP server to start...");
const mcpServerHealthEndpoint = `http://localhost:${MCP_SERVER_PORT}/health`;
// Poll the health endpoint until it responds or times out (30 seconds with 1-second intervals)
await waitForServer(mcpServerHealthEndpoint, 30000, 1000);
log.info("MCP server is online!");

/**
 * Create an HTTP server that acts as a proxy between external clients and the local MCP server
 * This allows the Actor to expose the MCP server to the internet through the Apify platform
 */
const server = http.createServer((req, res) => {
	// Handle Apify readiness probe for platform health checks
	if (req.headers["x-apify-container-server-readiness-probe"]) {
		res.writeHead(200);
		res.end("ok");
		return;
	}

	// Set up options for proxying the request to the local MCP server
	const options = {
		hostname: "localhost",
		port: MCP_SERVER_PORT,
		path: req.url, // Forward the same URL path
		method: req.method, // Use the same HTTP method
		headers: req.headers, // Forward all headers
	};

	// Create a request to the local MCP server
	const proxyReq = http.request(options, (proxyRes) => {
		// Ensure we received a valid response from the backend
		if (!proxyRes.statusCode) {
			res.writeHead(500);
			res.end("No status code from backend");
			return;
		}

		// Forward the backend response headers and status code to the client
		res.writeHead(proxyRes.statusCode, proxyRes.headers);

		// Pipe the backend response body directly to the client
		proxyRes.pipe(res, { end: true });
	});

	// Pipe the client request body to the backend request
	req.pipe(proxyReq, { end: true });

	// Handle errors in the proxy request
	proxyReq.on("error", (err) => {
		res.writeHead(500);
		res.end(`Proxy error: ${err.message}`);
	});
});

// Start the HTTP server on the port provided by the Apify platform
server.listen(Actor.config.get("standbyPort"));
