import express from "express";
import path from "path";
import serverless from "serverless-http";
import prerender from "prerender-node";

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

app.use(express.static(path.join(__dirname, "app", "build")));

app.get("*", (req, res) => {
	res.sendFile(path.join(__dirname, "app", "build", "index.html"));
});

export const handler = serverless(app);
