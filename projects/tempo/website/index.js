import express from "express";
import path from "path";
import serverless from "serverless-http";
import prerender from "prerender-node";
import fs from "fs";

const app = express();

/**
 * This middleware disables caching for all routes. This is generally not
 * recommended for production, but is useful for development.
 */
app.use((req, res, next) => {
	res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
	res.set("Pragma", "no-cache");
	res.set("Expires", "0");
	next();
});

prerender.set("prerenderToken", process.env.PRERENDER_TOKEN);
app.use(prerender);

// A/B Testing Configuration
const getABConfig = () => {
	try {
		const stage = process.env.STAGE || "dev";
		const configPath = path.join(__dirname, `ab-config-${stage}.json`);

		if (fs.existsSync(configPath)) {
			const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
			return config;
		}

		// Default config if file doesn't exist
		return {
			enabled: false,
			tests: [],
			defaultBuild: "app",
		};
	} catch (error) {
		console.error("Error reading A/B config:", error);
		return {
			enabled: false,
			tests: [],
			defaultBuild: "app",
		};
	}
};

// Bot Detection Function
const isBot = (userAgent) => {
	if (!userAgent) return false;

	const botPatterns = [
		"bot",
		"crawler",
		"spider",
		"scraper",
		"parser",
		"reader",
		"googlebot",
		"bingbot",
		"slurp",
		"duckduckbot",
		"baiduspider",
		"yandexbot",
		"facebookexternalhit",
		"twitterbot",
		"linkedinbot",
		"whatsapp",
		"telegrambot",
		"applebot",
		"archive.org_bot",
	];

	const lowerUserAgent = userAgent.toLowerCase();
	return botPatterns.some((pattern) => lowerUserAgent.includes(pattern));
};

// A/B Test Selection Function
const selectABVariant = (abConfig, req) => {
	if (!abConfig.enabled || !abConfig.tests || abConfig.tests.length === 0) {
		return abConfig.defaultBuild || "app";
	}

	// Get or create session ID for consistent experience
	let sessionId = req.headers["x-session-id"] || req.ip || "default";

	// Simple hash function to ensure consistent variant selection
	const hash = sessionId.split("").reduce((a, b) => {
		a = (a << 5) - a + b.charCodeAt(0);
		return a & a;
	}, 0);

	for (const test of abConfig.tests) {
		if (test.enabled && test.variants && test.variants.length > 0) {
			// Calculate cumulative percentages
			let cumulativePercentage = 0;
			const random = Math.abs(hash) % 100;

			for (const variant of test.variants) {
				cumulativePercentage += variant.rollout || 0;
				if (random < cumulativePercentage) {
					console.log(
						`Selected variant: ${variant.build} for test: ${test.name}`
					);
					return variant.build;
				}
			}
		}
	}

	return abConfig.defaultBuild || "app";
};

// Middleware to determine which build to serve
app.use((req, res, next) => {
	const userAgent = req.headers["user-agent"] || "";

	// Check if it's a bot - serve markdown build
	if (isBot(userAgent)) {
		const markdownPath = path.join(
			__dirname,
			"markdown",
			"markdown_build.html"
		);
		if (fs.existsSync(markdownPath)) {
			console.log("Serving markdown build to bot:", userAgent);
			return res.sendFile(markdownPath);
		}
	}

	// A/B Testing logic for regular users
	const abConfig = getABConfig();
	const selectedBuild = selectABVariant(abConfig, req);

	// Store the selected build in request for later use
	req.selectedBuild = selectedBuild;

	console.log(
		`Selected build: ${selectedBuild} for user agent: ${userAgent.substring(
			0,
			50
		)}...`
	);
	next();
});

// Serve static files from the selected build
app.use((req, res, next) => {
	const buildPath = path.join(__dirname, req.selectedBuild, "build");
	if (fs.existsSync(buildPath)) {
		express.static(buildPath)(req, res, next);
	} else {
		// Fallback to default app build
		express.static(path.join(__dirname, "app", "build"))(req, res, next);
	}
});

app.get("*", (req, res) => {
	const buildPath = path.join(
		__dirname,
		req.selectedBuild,
		"build",
		"index.html"
	);
	if (fs.existsSync(buildPath)) {
		res.sendFile(buildPath);
	} else {
		// Fallback to default app build
		res.sendFile(path.join(__dirname, "app", "build", "index.html"));
	}
});

export const handler = serverless(app);
