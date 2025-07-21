import express from "express";
import cors from "cors";
import serverless from "serverless-http";
import Stripe from "stripe";
import { Pinecone } from "@pinecone-database/pinecone";
import { CohereClient } from "cohere-ai";
import FirecrawlApp from "@mendable/firecrawl-js";

import {
	chunkMarkdown,
	takeScreenshot,
	extractBusinessInfo,
	sendEmail,
} from "./api_interface.js";
import { auth, authenticate } from "auth-sdk";
import {
	getProject,
	setProjectLimitsByUserId,
	updateProject,
	createProject,
	getProjectsByOwner,
	getProjects,
} from "./database_interface.js";
import {
	generateKey,
	getFileBuffer,
	fileExists,
	getURL,
	uploadFile,
} from "./s3_interface.js";
import { generateColorSchemes } from "./color_generator.js";
import { v4 as uuidv4 } from "uuid";
import { deployProject } from "./helper.js";

const app = express();

app.use(
	cors({
		origin: "*",
	})
);

// Pinecone App instance
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || "test" });
const index = pc.index("web-indexer");

// Cohere API instance
const cohere = new CohereClient({
	token: process.env.COHERE_API_KEY,
});

const firecrawlApp = new FirecrawlApp({
	apiKey: process.env.FIRECRAWL_API_KEY,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
	apiVersion: "2023-10-16",
});

app.post("/api/v1/deploy-all-projects", async (req, res) => {
	const projects = await getProjects();

	let success = 0;
	let failed = 0;

	for (const project of projects) {
		try {
			await deployProject(project);
			success++;
		} catch (error) {
			console.error(
				"Failed to deploy project:",
				project.projectId,
				error
			);
			failed++;
		}
	}

	res.status(200).send({
		message: "All projects deployed successfully!",
		success,
		failed,
	});
});

app.post(
	"/api/v1/test-domain",
	express.json({ limit: "10mb" }),
	authenticate,
	async (req, res) => {
		try {
			const { domain } = req.body;
			const userId = req.auth.userId;

			// Check how many projects the user has - start this early
			const projectsPromise = getProjectsByOwner(userId);

			// Start the crawl early
			console.log("Starting crawl", domain);
			const crawlPromise = firecrawlApp.crawlUrl(domain, {
				limit: 3,
				scrapeOptions: {
					formats: ["markdown", "screenshot"],
					excludeTags: ["script", ".ad", "#footer"],
				},
				excludePaths: [],
				includePaths: [],
				maxDepth: 3,
				ignoreSitemap: false,
				allowBackwardLinks: true,
			});

			// Wait for projects to check existing project
			const projects = await projectsPromise;
			const existingProject = projects.find(
				(p) => p.name === "Untitled Project"
			);
			if (
				existingProject &&
				existingProject.crawls &&
				existingProject.crawls.length > 0
			) {
				return res.status(200).json(existingProject);
			}

			const projectId = uuidv4();

			// Wait for crawl results
			const crawlResponse = await crawlPromise;
			if (!crawlResponse.success) {
				console.error("[Failed to crawl]", domain, crawlResponse.error);
				throw new Error("Failed to start crawl");
			}

			// Start business info extraction and screenshot processing in parallel
			const businessInfoPromise = extractBusinessInfo(
				crawlResponse.data[0].markdown
			);

			console.log(
				"Extracted business info",
				domain,
				crawlResponse.data.length
			);

			// Process each page in parallel
			const processingPromises = crawlResponse.data.map(async (data) => {
				try {
					if (!data.markdown) {
						console.error(
							"Error",
							"No markdown content to process"
						);
						return null;
					}

					const markdownContent = data.markdown;
					const sourceUrl = data.metadata.url;
					const title = data.metadata.title;
					const description = data.metadata.description;

					// Chunk the markdown content
					//console.log("Starting chunking for", sourceUrl);
					const chunks = await chunkMarkdown(
						markdownContent,
						title,
						description
					);

					//console.log("Requesting embeddings for", sourceUrl);
					const embeddings = await cohere.embed({
						texts: chunks.map((chunk) => chunk.content),
						model: "embed-english-light-v3.0",
						inputType: "search_document",
						embeddingTypes: ["float"],
					});

					const vectors = chunks.map((chunk, index) => ({
						id: `${sourceUrl}-${index}`,
						values: embeddings.embeddings.float[index],
						metadata: {
							sourceUrl,
							content: chunk.content,
							header: chunk.header,
							timestamp: new Date().toISOString(),
						},
					}));

					//console.log("Storing vectors for", sourceUrl);
					await index.namespace(projectId).upsert(vectors);
					return { sourceUrl };
				} catch (error) {
					console.error(
						`Error processing ${
							data.metadata?.url || "unknown URL"
						}:`,
						error
					);
					return null; // Return null but don't fail the entire Promise.all
				}
			});

			// Process screenshot in parallel
			const screenshotPromise = (async () => {
				try {
					const screenshotKey = generateKey(domain) + ".jpeg";
					const screenshotUrl = crawlResponse.data[0].screenshot;
					const screenshotResponse = await fetch(screenshotUrl);
					const screenshotBuffer = Buffer.from(
						await screenshotResponse.arrayBuffer()
					);

					// Start color scheme generation and file upload in parallel
					const [colorSchemes] = await Promise.all([
						generateColorSchemes(screenshotBuffer),
						uploadFile(screenshotKey, screenshotBuffer),
					]);

					return {
						screenshot: getURL(screenshotKey),
						colorSchemes,
					};
				} catch (screenshotError) {
					console.error("Error taking screenshot:", screenshotError);
					return {
						screenshot: null,
						colorSchemes: [],
					};
				}
			})();

			// Wait for all parallel operations to complete
			const [processedData, businessInfo, screenshotData] =
				await Promise.all([
					Promise.all(processingPromises),
					businessInfoPromise,
					screenshotPromise,
				]);

			// Initialize crawl object
			const crawl = {
				domain: domain,
				crawlId: "random-id",
				status: "completed",
				colorSchemes: screenshotData.colorSchemes || [],
				completed: crawlResponse.data.length,
				total: crawlResponse.data.length,
				urls: crawlResponse.data.map((d) => d.metadata.url),
				screenshot: screenshotData.screenshot,
			};

			const project = {
				projectId,
				name: "Untitled Project",
				crawls: [crawl],
				chatOptions: {
					businessInfo: {
						...businessInfo,
					},
				},
			};

			const newProject = await createProject(userId, "None", project);

			console.log("Project created", newProject);
			const projectSize = JSON.stringify(newProject).length;
			console.log("Response size:", projectSize);

			res.status(200).json(newProject);
			console.log("Test successful");
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: "Failed to test domain" });
		}
	}
);

app.get(
	"/api/v1/take-screenshot/:projectId/:crawlId",
	authenticate,
	getProject,
	async (req, res) => {
		try {
			const { force } = req.query;
			const crawls = req.project.crawls;
			const crawl = crawls.find((c) => c.crawlId === req.params.crawlId);

			if (!crawl) {
				return res.status(404).json({ error: "Crawl not found" });
			}

			// check if color schemes already exist
			if (crawl.colorSchemes && crawl.screenshot && !force) {
				return res.status(200).json({
					screenshot: crawl.screenshot,
					colorSchemes: crawl.colorSchemes,
				});
			}

			const domain = crawl.domain;
			let colorSchemes;
			const screenshotKey = generateKey(domain) + ".jpeg";
			const exists = await fileExists(screenshotKey);

			if (!exists) {
				// take screenshot
				const screenshot = await takeScreenshot(crawl.domain);

				if (screenshot && screenshot.image) {
					let base64Image = screenshot.image;

					if (base64Image.includes(",")) {
						base64Image = base64Image.split(",")[1];
					}
					// Convert base64 to buffer
					const imageBuffer = Buffer.from(base64Image, "base64");
					// Upload to S3
					await uploadFile(screenshotKey, imageBuffer);

					colorSchemes = await generateColorSchemes(imageBuffer);
				} else if (exists) {
					const imgBuffer = await getFileBuffer(screenshotKey);
					colorSchemes = await generateColorSchemes(imgBuffer);
				}
			} else {
				const imgBuffer = await getFileBuffer(screenshotKey);
				colorSchemes = await generateColorSchemes(imgBuffer);
			}

			crawl.screenshot = getURL(screenshotKey);
			if (colorSchemes) crawl.colorSchemes = colorSchemes;

			await updateProject(req.params.projectId, { crawls });

			res.status(200).json({
				screenshot: crawl.screenshot,
				colorSchemes,
			});
		} catch (error) {
			console.error("Error generating screenshot:", error);
			res.status(500).json({
				error: "Failed to generate screenshot",
				details: error.message,
			});
		}
	}
);

app.post(
	"/api/v1/scraping/:projectId",
	express.json({ limit: "10mb" }),

	async (req, res) => {
		try {
			const { projectId } = req.params;
			const { type, data, success, error, id } = req.body;
			const { authorization } = req.headers;

			if (!success) {
				console.error("Error", type, error);
				return res.status(200).json({
					message:
						"Event ignored - only processing successful crawl.page events",
				});
			}

			if (
				!authorization ||
				authorization !==
					`Bearer ${process.env.FIRECRAWL_WEBHOOK_SECRET}`
			) {
				return res.status(401).json({
					error: "Unauthorized",
				});
			}

			// Only process crawl.page events and successful crawls
			if (type !== "crawl.page") {
				return;
			}

			// Check if we have data to process
			if (!data || !data.length || !data[0].markdown) {
				console.error("Error", "No markdown content to process");
				return res.status(400).json({
					error: "No markdown content to process",
				});
			}

			const markdownContent = data[0].markdown;
			const sourceUrl = data[0].metadata.url;

			const title = data[0].metadata.title;
			const description = data[0].metadata.description;

			// Chunk the markdown content
			const chunks = await chunkMarkdown(
				markdownContent,
				title,
				description
			);

			const embeddings = await cohere.embed({
				texts: chunks.map((chunk) => chunk.content),
				model: "embed-english-light-v3.0",
				inputType: "search_document",
				embeddingTypes: ["float"],
			});

			const vectors = chunks.map((chunk, index) => ({
				id: `${sourceUrl}-${index}`,
				values: embeddings.embeddings.float[index],
				metadata: {
					sourceUrl,
					content: chunk.content,
					header: chunk.header,
					timestamp: new Date().toISOString(),
				},
			}));

			await index.namespace(projectId).upsert(vectors);

			res.status(200).json({
				message: "Successfully processed page content",
				chunksProcessed: chunks.length,
			});
		} catch (error) {
			console.error("Error processing webhook:", error);
			res.status(500).json({
				error: "Failed to process webhook",
				details: error.message,
			});
		}
	}
);

// Updated webhook handler
app.post(
	"/api/v1/webhook",
	express.raw({ type: "application/json" }),
	async (request, response) => {
		let event = request.body;
		const endpointSecret = process.env.STRIPE_SIGNING_SECRET;

		// Verify webhook signature
		if (endpointSecret) {
			const signature = request.headers["stripe-signature"];
			try {
				event = stripe.webhooks.constructEvent(
					request.body,
					signature,
					endpointSecret
				);
			} catch (err) {
				console.log(
					`⚠️  Webhook signature verification failed.`,
					err.message
				);
				return response.sendStatus(400);
			}
		}

		const plans = {
			starter_v2: "Starter",
			pro_v2: "Pro",
		};

		try {
			const handleSubscriptionUpdate = async (subscription) => {
				const userId = subscription.metadata.client_reference_id;
				const planType = subscription.items.data[0].price.lookup_key;
				const mappedPlan = plans[planType] || "None";

				let claims = {
					plan: mappedPlan,
					subscription: subscription.status,
					stripeCustomerId: subscription.customer,
					cancel_at_period_end: subscription.cancel_at_period_end,
					current_period_end: subscription.current_period_end,
				};

				if (subscription.status === "trialing") {
					claims.hasUsedTrial = true;
				}

				const userRecord = await auth.getUser(userId);
				const existingClaims = userRecord.customClaims || {};

				await auth.setCustomUserClaims(userId, {
					...existingClaims,
					...claims,
				});

				await setProjectLimitsByUserId(userId, mappedPlan);
			};

			switch (event.type) {
				case "customer.subscription.created":
					// Add the userId to the stripe customer object
					await stripe.customers.update(event.data.object.customer, {
						metadata: {
							client_reference_id:
								event.data.object.metadata.client_reference_id,
						},
					});

				case "customer.subscription.updated":
				case "customer.subscription.deleted":
					await handleSubscriptionUpdate(event.data.object);
					break;

				case "setup_intent.succeeded":
				case "payment_method.attached":
					const customerId = event.data.object.customer;
					const customer = await stripe.customers.retrieve(
						customerId
					);
					const userId = customer.metadata.client_reference_id;
					const userRecord = await auth.getUser(userId);

					await auth.setCustomUserClaims(userId, {
						...userRecord.customClaims,
						hasPaymentMethod: true,
					});
					break;

				default:
					console.log(`Unhandled event type ${event.type}`);
			}

			response.json({ received: true });
		} catch (error) {
			console.error("Webhook error:", error);
			response.status(400).send(`Webhook Error: ${error.message}`);
		}
	}
);

export const handler = serverless(app);
