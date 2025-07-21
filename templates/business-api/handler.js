import express from "express";
import cors from "cors";
import serverless from "serverless-http";
import { auth, authenticate } from "auth-sdk";
import {
	createProject,
	deleteProject,
	getProject,
	getProjectsByOwner,
	getProjectsSharedWithYou,
	shareProject,
	updateProject,
	setProjectLimitsByUserId,
	getLeadsForProject,
	exportLeadsData,
} from "./database_interface.js";
import FirecrawlApp from "@mendable/firecrawl-js";
import { Pinecone } from "@pinecone-database/pinecone";
import {
	getURL,
	uploadFile,
	bucketName,
	generateKey,
	deleteFile,
} from "./s3_interface.js";
import { CohereClient } from "cohere-ai";
import { numberOfProjectLimitsByPlan } from "./plan.js";
import nodemailer from "nodemailer";
import {
	getContrastTextColor,
	getContrastTextColorShaded,
} from "./color_generator.js";
import multer from "multer";
import { extractBusinessInfo } from "./api_interface.js";
import { generateColorSchemes } from "./color_generator.js";
import { deployProject } from "./helper.js";

import Stripe from "stripe";
import path from "path";
import fs, { stat } from "fs";
import { minify } from "terser";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

const cohere = new CohereClient({
	token: process.env.COHERE_API_KEY,
});

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || "test" });
const index = pc.index("web-indexer");
const firecrawlApp = new FirecrawlApp({
	apiKey: process.env.FIRECRAWL_API_KEY,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
	apiVersion: "2023-10-16",
});

const app = express();

const upload = multer({
	limits: {
		fileSize: 1024 * 1024 * 6, // 6MB limit
	},
	dest: "/tmp",
});

/**
 * Add the JSON body parser middleware to Express.js, and CORS middleware to
 * allow cross-origin requests from the browser.
 */
app.use(cors());
app.use(express.json());
app.use(authenticate);

app.post("/api/v1/register", async (req, res) => {
	const email = req.auth.email;
	if (!email) {
		return res.status(400).json({ error: "Email is required" });
	}

	// use nodemailer to send email
	const transporter = nodemailer.createTransport({
		host: "mail.privateemail.com", // Namecheap's private email server
		port: 587,
		secure: false, // Use TLS, can set to true if using port 465 for SSL
		auth: {
			user: process.env.EMAIL_USER,
			pass: process.env.EMAIL_PASSWORD,
		},
	});

	const emailHtml = await fs.promises.readFile(
		path.join(process.cwd(), "onboarding-email.html"),
		"utf8"
	);

	const mailOptions = {
		from: process.env.EMAIL_USER,
		to: email,
		subject: `Welcome to WebIndexer!`,
		html: emailHtml,
		replyTo: process.env.EMAIL_USER,
	};

	transporter.sendMail(mailOptions, function (error, info) {
		if (error) {
			console.log(error);
			res.status(500).json({ error: "Failed to send email" });
		} else {
			res.status(200).json({ message: "Email sent successfully" });
		}
	});
});

// Create a new project
app.post("/api/v1/projects", async (req, res) => {
	try {
		const userId = req.auth.userId;
		const planType = req.auth.claims.plan;

		// Check how many projects the user has
		const projects = await getProjectsByOwner(userId);
		if (projects.length >= numberOfProjectLimitsByPlan[planType]) {
			// Ignore check if the project name is "Untitled Project", so only 1 can be created.
			return res.status(403).json({ error: "Project limit reached" });
		}

		const { name } = req.body;
		const newProject = await createProject(userId, planType, { name });
		res.status(201).json(newProject);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to create project" });
	}
});

// Get projects by owner
app.get("/api/v1/projects/owner", async (req, res) => {
	try {
		const userId = req.auth.userId;
		const projects = await getProjectsByOwner(userId);
		res.json(projects);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to retrieve projects" });
	}
});

// Get projects shared with the user
app.get("/api/v1/projects/shared", async (req, res) => {
	try {
		const userEmail = req.auth.email;
		const projects = await getProjectsSharedWithYou(userEmail);
		res.json(projects);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to retrieve shared projects" });
	}
});

// Get a project by ID
app.get("/api/v1/projects/:projectId", getProject, async (req, res) => {
	try {
		// remove verificationCode
		delete req.project.emailVerification;
		res.json(req.project);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to retrieve project" });
	}
});

// Share a project
app.post("/api/v1/projects/:projectId/share", getProject, async (req, res) => {
	try {
		// max 5 shares
		const sharedWithUserEmails = req.project.sharedWithUserEmails || [];
		if (sharedWithUserEmails.length >= 5) {
			return res.status(403).json({ error: "Share limit reached" });
		}

		const { projectId } = req.params;
		const { userEmail } = req.body;
		const result = await shareProject(projectId, userEmail);
		res.json(result);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to share project" });
	}
});

// Delete a project
app.delete("/api/v1/projects/:projectId", getProject, async (req, res) => {
	try {
		const { projectId } = req.params;
		await deleteProject(projectId);
		res.status(204).send();
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to delete project" });
	}
});

// Update a project
app.put("/api/v1/projects/:projectId", getProject, async (req, res) => {
	try {
		const { projectId } = req.params;
		const projectData = req.body;
		const updatedProject = await updateProject(
			projectId,
			projectData,
			req.project
		);
		res.json(updatedProject);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to update project" });
	}
});

app.post(
	"/api/v1/projects/:projectId/icon",
	getProject,
	upload.single("icon"),
	async (req, res) => {
		try {
			const { projectId } = req.params;
			const icon = req.file;

			if (!icon) {
				return res.status(400).json({ error: "Icon file is required" });
			}

			const fileextension = path.extname(icon.originalname).toLowerCase();

			const iconKey = `icons/${projectId}.${fileextension}`;
			const iconData = fs.readFileSync(icon.path);

			// Upload the icon to S3
			await uploadFile(iconKey, iconData);

			// Construct the S3 URL
			const iconUrl = `https://${bucketName}.s3.amazonaws.com/${iconKey}`;

			res.json({ message: "Icon uploaded", iconUrl: iconUrl });
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: "Failed to upload icon" });
		}
	}
);

app.post(
	"/api/v1/send-verification-email/:projectId",
	getProject,
	async (req, res) => {
		const { email } = req.body;
		if (!email) return res.status(400).json({ error: "Email is required" });

		const code = crypto.randomInt(100000, 999999).toString(); // 6-digit code

		const existingChatOptions = req.project.chatOptions || {};
		const updatedChatOptions = {
			...existingChatOptions,
			businessInfo: {
				...existingChatOptions.businessInfo,
				emailVerified: false,
				supportEmail: email,
			},
		};

		// save it in the DB
		await updateProject(req.project.projectId, {
			chatOptions: updatedChatOptions,
			emailVerification: {
				code: code,
				email: email,
			},
		});

		// Nodemailer setup (Replace with your email provider)
		const transporter = nodemailer.createTransport({
			host: "mail.privateemail.com", // Namecheap's private email server
			port: 587,
			secure: false, // Use TLS, can set to true if using port 465 for SSL
			auth: {
				user: process.env.EMAIL_USER,
				pass: process.env.EMAIL_PASSWORD,
			},
		});

		await transporter.sendMail({
			from: process.env.EMAIL_USER,
			to: email,
			subject: "WebIndexer - Verification Code",
			text: `Your email verification code is: ${code}

If you didn't request this code, please ignore this email.
Generated by webindexer.app`,
		});

		res.json({ message: "Verification code sent" });
	}
);

// ✅ Verify code and store email
app.post("/api/v1/verify-email/:projectId", getProject, async (req, res) => {
	const { email, code } = req.body;
	if (!email || !code)
		return res.status(400).json({ error: "Missing fields" });

	// confirm that the email is the same
	if (
		req.project.chatOptions.businessInfo.supportEmail !==
		req.project.emailVerification.email
	) {
		return res.status(400).json({ error: "Email has been changed" });
	}

	const verificationCode = req.project.emailVerification.code;
	if (verificationCode === code) {
		const existingChatOptions = req.project.chatOptions || {};
		const updatedChatOptions = {
			...existingChatOptions,
			businessInfo: {
				...existingChatOptions.businessInfo,
				emailVerified: true,
			},
		};

		await updateProject(req.project.projectId, {
			chatOptions: updatedChatOptions,
		});

		// Store the email in your database here
		res.json({ success: true, message: "Email verified" });
	} else {
		res.status(400).json({ error: "Invalid code" });
	}
});

app.post("/api/v1/start-crawl/:projectId", getProject, async (req, res) => {
	try {
		const crawlOptions = req.body.crawlOptions;
		const domain = crawlOptions.domain;
		const project = req.project;

		// Check if domain is already crawling
		const crawls = project.crawls || [];
		if (crawls) {
			const crawl = crawls.find((crawl) => crawl.domain === domain);
			if (crawl) {
				// Already crawling this domain, skip
				throw new Error("Domain is already crawling");
			}
		}

		// Check if limit has been reached
		const limits = project.limits;
		if (crawls.length >= limits.crawlLimit) {
			throw new Error("Crawl limit reached");
		}

		// Check if pageLimit is larger
		if (crawlOptions.limit > limits.pageLimit) {
			throw new Error("Page limit exceeded");
		}

		// Check if business info needs to be extracted
		let colorSchemes, screenshot;
		let businessInfoUpdate = {};
		if (project.chatOptions.businessInfo.businessName == "My Business") {
			try {
				// Scrape the homepage to extract business info and screenshot
				const scrapeResponse = await firecrawlApp.scrapeUrl(domain, {
					formats: ["markdown", "screenshot"],
					onlyMainContent: true,
					removeBase64Images: true,
					excludeTags: ["script", ".ad", "#footer"],
				});

				if (scrapeResponse.success) {
					const firstPage = scrapeResponse;
					// Extract business info
					const businessInfo = await extractBusinessInfo(
						firstPage.markdown
					);

					// Process screenshot and generate color schemes
					const screenshotKey = generateKey(domain) + ".jpeg";
					const screenshotResponse = await fetch(
						firstPage.screenshot
					);
					const screenshotBuffer = Buffer.from(
						await screenshotResponse.arrayBuffer()
					);

					// Generate color schemes and upload file in parallel
					const [colorSchemesGenerated, _] = await Promise.all([
						generateColorSchemes(screenshotBuffer),
						uploadFile(screenshotKey, screenshotBuffer),
					]);

					// Prepare update data with screenshot and color schemes
					businessInfoUpdate = {
						chatOptions: {
							...project.chatOptions,
							businessInfo: {
								...project.chatOptions.businessInfo,
								...businessInfo,
							},
						},
					};

					colorSchemes = colorSchemesGenerated;
					screenshot = getURL(screenshotKey);
				}
			} catch (error) {
				console.error("Error extracting business info:", error);
				throw new Error("Failed to extract business info");
			}
		}

		// Start the main crawl
		const crawlResponse = await firecrawlApp.asyncCrawlUrl(domain, {
			limit: crawlOptions.limit,
			scrapeOptions: {
				formats: ["markdown"],
				excludeTags: ["script", ".ad", "#footer"],
			},
			webhook: {
				url: `${process.env.REST_API_URL}/api/v1/scraping/${req.params.projectId}`,
				headers: {
					authorization: `Bearer ${process.env.FIRECRAWL_WEBHOOK_SECRET}`,
				},
			},
			excludePaths: crawlOptions.excludePaths || [],
			includePaths: crawlOptions.includePaths || [],
			maxDepth: crawlOptions.depth || 3,
			ignoreSitemap: crawlOptions.ignoreSitemap || false,
			allowBackwardLinks: crawlOptions.allowBackwardLinks || true,
		});

		if (!crawlResponse.success) {
			console.error("[Failed to crawl]", domain, crawlResponse.error);
			throw new Error("Failed to start crawl");
		}

		// Create new crawl object
		const crawl = {
			domain: domain,
			crawlId: crawlResponse.id,
			status: "started",
			urls: [],
			colorSchemes: colorSchemes || [],
			screenshot: screenshot || null,
		};

		crawls.push(crawl);

		// Update project with new crawl
		const updatedProject = await updateProject(req.params.projectId, {
			crawls,
			...businessInfoUpdate,
		});

		res.status(200).json({
			message: "Crawl started",
			crawlId: crawlResponse.id,
			businessInfoUpdate,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to start crawl" });
	}
});

app.post("/api/v1/send-insights", getProject, async (req, res) => {
	/*
{
	"projectUsage": { // since this months start
		"invocationCount": 42,
	},
	"projectTotalUsage": { // total 
		"likes": 1,
		"response_rate": {
			"n": 108,
			"avg": 1.8769907407407411
		},
		"invocation_count": 108,
		"dislikes": 8,
		"message_activity": [ //past 30 days
			0,
			0,
			19,
			2,
			0,
			0,
			0,
			0,
			0,
			0,
			1,
			2,
			14,
			7,
			0,
			4,
			3,
			1,
			0,
			0,
			0,
			0,
			0,
			0,
			29,
			1,
			5,
			0,
			10,
			10,
			0
		],
		"topics": {
			"1 evaluation": 1,
			"2 4 pricing": 1,
			"4 pricing": 1,
			"5 pricing": 1,
			"7 pricing": 1,
			"booking": 2,
			"evaluation": 20,
			"greeting": 28,
			"pricing": 12,
			"recipe": 2,
			"unknown": 38
		},
		"visitors": 21
	}
}

Put this in an email. And analyze the leads as well. Also change feedback to retrieve by last week.
	*/
});

app.get("/api/v1/api/check-iframe", async (req, res) => {
	const { url } = req.query;
	if (!url) {
		return res.status(400).json({ error: "Missing url parameter" });
	}
	try {
		const response = await fetch(url, { method: "HEAD" });
		const xFrameOptions = response.headers.get("x-frame-options");
		const blocked =
			xFrameOptions &&
			(xFrameOptions.toUpperCase().includes("DENY") ||
				xFrameOptions.toUpperCase().includes("SAMEORIGIN"));
		res.json({ blocked });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to check the URL" });
	}
});

app.get(
	"/api/v1/check-status/:projectId/:crawlId",
	getProject,
	async (req, res) => {
		try {
			const crawlId = req.params.crawlId;
			const status = await firecrawlApp.checkCrawlStatus(crawlId);
			status.urls = status.data.map((page) => page.metadata.sourceURL);
			delete status.data;

			// add to crawl
			const crawls = req.project.crawls || [];
			const crawl = crawls.find((crawl) => crawl.crawlId === crawlId);

			if (!crawl) {
				return res.status(404).json({
					error: "Crawl not found",
				});
			}

			if (status.status !== "completed" || crawl.status !== "completed") {
				crawl.status = status.status;
				crawl.total = status.total;
				crawl.completed = status.completed || status.total;
				crawl.urls = status.urls;

				// update project
				await updateProject(req.params.projectId, { crawls });
			}

			res.status(200).json({
				status: status.status,
				total: status.total,
				completed: status.completed,
				urls: status.urls,
			});
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: "Failed to check status" });
		}
	}
);

// Delete crawl
/*
Start crawl -> https://{url}, wwww.{url}, {url}, https://www.{url}
Scraping -> https://{url}, https://www.{url}

*/

app.delete("/api/v1/delete-crawl/:projectId", getProject, async (req, res) => {
	try {
		const { projectId } = req.params;
		const { crawlId } = req.query;

		const crawl = req.project.crawls.find(
			(crawl) => crawl.crawlId === crawlId
		);

		if (!crawl) {
			return res.status(404).json({
				error: "Crawl not found",
			});
		}

		if (crawl.status === "started") {
			res.status(500).json({
				error: "Crawl is in progress, please wait for it to complete before deleting",
			});
			return;
		}

		const updatedCrawls = req.project.crawls.filter(
			(c) => c.domain !== crawl.domain
		);
		await updateProject(projectId, { crawls: updatedCrawls });

		// add https:// if not present
		const normalizedDomain = crawl.domain
			.replace(/^(https?:\/\/)/, "")
			.replace(/^www\./, "");

		const formattedDomains = [
			`https://${normalizedDomain}`,
			`https://www.${normalizedDomain}`,
		];
		for (const formattedDomain of formattedDomains) {
			// Also delete entries from Pinecone
			let paginationToken = null;
			while (true) {
				// fetch ids with listPaginated
				const params = {
					limit: 100,
					prefix: formattedDomain,
				};
				if (paginationToken) {
					params.paginationToken = paginationToken;
				}

				const results = await index
					.namespace(projectId)
					.listPaginated(params);

				const vectorIds = results.vectors.map((vector) => vector.id);
				if (vectorIds.length == 0) {
					break;
				}

				await index.namespace(projectId).deleteMany(vectorIds);
				paginationToken = results.pagination?.next;

				if (!paginationToken) {
					break;
				}
			}
		}

		res.status(200).json({
			message: "Successfully deleted crawl",
			domain: crawl.domain,
		});
	} catch (error) {
		console.error("Error deleting crawl:", error);
		res.status(500).json({
			error: "Failed to delete crawl",
			details: error.message,
		});
	}
});

/* FILE HANDLER */
// Upload file endpoint
app.post(
	"/api/v1/projects/:projectId/upload",
	upload.single("file"),
	getProject,
	async (req, res) => {
		try {
			const { projectId } = req.params;
			const project = req.project;

			if (!req.file) {
				return res.status(400).json({ error: "No file uploaded" });
			}

			const file = req.file;
			const fileId = uuidv4();
			const fileName = file.originalname;
			const fileType = file.mimetype;
			const key = `pdfs/${projectId}/${fileName}`;

			const metadata = {
				fileId: fileId,
				fileName: fileName,
				projectId: projectId,
			};

			const fileContent = fs.readFileSync(file.path);

			// Create file object
			const uploadedFile = {
				fileId,
				name: fileName,
				type: fileType,
				status: "processing",
				createdAt: new Date().toISOString(),
			};

			// Add to project files
			const files = project.files || [];
			files.push(uploadedFile);

			// Update project
			await updateProject(projectId, { files });

			// Upload to S3
			await uploadFile(key, fileContent, "public-read", metadata);

			// After successful upload to S3
			fs.unlinkSync(file.path);

			res.status(200).json({
				message: "File uploaded successfully",
				file: uploadedFile,
			});
		} catch (error) {
			console.error("Error uploading file:", error);
			res.status(500).json({ error: "Failed to upload file" });
		}
	}
);

// Check file status endpoint
app.get(
	"/api/v1/projects/:projectId/file-status/:fileId",
	getProject,
	async (req, res) => {
		try {
			const { fileId } = req.params;
			const project = req.project;

			// Find file in project
			const files = project.files || [];
			const file = files.find((f) => f.fileId === fileId);

			if (!file) {
				return res.status(404).json({ error: "File not found" });
			}

			res.status(200).json({
				fileId: file.fileId,
				name: file.name,
				type: file.type,
				status: file.status,
				createdAt: file.createdAt,
				updatedAt: file.updatedAt,
			});
		} catch (error) {
			console.error("Error checking file status:", error);
			res.status(500).json({ error: "Failed to check file status" });
		}
	}
);

// Delete file endpoint
app.delete(
	"/api/v1/projects/:projectId/delete-file/:fileId",
	getProject,
	async (req, res) => {
		try {
			const { projectId, fileId } = req.params;
			const project = req.project;

			// Find file in project
			const files = project.files || [];
			const file = files.find((f) => f.fileId === fileId);

			if (!file) {
				return res.status(404).json({ error: "File not found" });
			}

			// Delete from S3
			const key = `pdfs/${fileId}`;
			await deleteFile(key);

			// Delete from Pinecone
			let paginationToken = null;
			while (true) {
				// fetch ids with listPaginated
				const params = {
					limit: 100,
					prefix: fileId,
				};
				if (paginationToken) {
					params.paginationToken = paginationToken;
				}

				const results = await index
					.namespace(projectId)
					.listPaginated(params);

				const vectorIds = results.vectors.map((vector) => vector.id);
				if (vectorIds.length === 0) {
					break;
				}

				await index.namespace(projectId).deleteMany(vectorIds);
				paginationToken = results.pagination?.next;

				if (!paginationToken) {
					break;
				}
			}

			// Update project (remove file)
			const updatedFiles = files.filter((f) => f.fileId !== fileId);
			await updateProject(projectId, { files: updatedFiles });

			res.status(200).json({
				message: "File deleted successfully",
				fileId,
			});
		} catch (error) {
			console.error("Error deleting file:", error);
			res.status(500).json({ error: "Failed to delete file" });
		}
	}
);

// Get paginated data by projectId
app.get(
	"/api/v1/projects/:projectId/data/:page",
	getProject,
	async (req, res) => {
		try {
			const { projectId, page } = req.params;
			const pageSize = 10; // Number of items per page

			// Get paginated results from Pinecone
			const results = await index.namespace(projectId).listPaginated({
				limit: pageSize,
				paginationToken: page === "1" ? undefined : page,
			});

			// Fetch metadata for the vectors
			const vectorIds = results.vectors.map((vector) => vector.id);
			if (vectorIds.length == 0) {
				return res.status(200).json({
					data: [],
					pagination: {
						nextPage: null,
						hasMore: false,
					},
				});
			}

			const vectorData = await index
				.namespace(projectId)
				.fetch(vectorIds);

			// Format the response
			const formattedResults = {
				data: results.vectors.map((vector, index) => ({
					id: vector.id,
					content: vectorData.records[vector.id].metadata.content,
					header: vectorData.records[vector.id].metadata.header,
					sourceUrl: vectorData.records[vector.id].metadata.sourceUrl,
					timestamp: vectorData.records[vector.id].metadata.timestamp,
				})),
				pagination: {
					nextPage: results.pagination?.next,
					hasMore: !!results.pagination?.next,
				},
			};

			res.status(200).json(formattedResults);
		} catch (error) {
			console.error("Error fetching paginated data:", error);
			res.status(500).json({
				error: "Failed to fetch data",
				details: error.message,
			});
		}
	}
);

// Edit data
app.put("/api/v1/projects/:projectId/data", getProject, async (req, res) => {
	try {
		const { projectId } = req.params;
		const { id, content, header, sourceUrl, timestamp } = req.body;

		if (!content) {
			return res.status(400).json({
				error: "id and content are required",
			});
		}

		let newId = id;
		let newTimestamp = timestamp;

		if (!timestamp) {
			newTimestamp = new Date().toISOString();
		}

		if (!id) {
			// Generate a new ID
			newId = `custom-${newTimestamp}`;
		}

		// Embed the content
		const embedding = await cohere.embed({
			texts: [content],
			model: "embed-english-light-v3.0",
			inputType: "search_document",
			embeddingTypes: ["float"],
		});

		// Upsert the vector
		const vector = {
			id: newId,
			values: embedding.embeddings.float[0],
			metadata: {
				content,
				header,
				sourceUrl,
				timestamp: newTimestamp,
			},
		};

		await index.namespace(projectId).upsert([vector]);

		res.status(200).json({
			message: "Successfully upserted data",
			id,
		});
	} catch (error) {
		console.error("Error upserting data:", error);
		res.status(500).json({
			error: "Failed to upsert data",
			details: error.message,
		});
	}
});

// Delete data entry
app.delete("/api/v1/projects/:projectId/data", getProject, async (req, res) => {
	try {
		const { projectId } = req.params;
		const { id } = req.query;

		if (!id) {
			return res.status(400).json({
				error: "id is required",
			});
		}

		// decode the id
		const decodedId = decodeURIComponent(id);

		// Delete the vector
		await index.namespace(projectId).deleteOne(decodedId);

		res.status(200).json({
			message: "Successfully deleted data",
			id,
		});
	} catch (error) {
		console.error("Error deleting data:", error);
		res.status(500).json({
			error: "Failed to delete data",
			details: error.message,
		});
	}
});

// Query data by text
app.post("/api/v1/projects/:projectId/query", getProject, async (req, res) => {
	try {
		const { projectId } = req.params;
		const { query, limit = 5 } = req.body;

		if (!query) {
			return res.status(400).json({
				error: "Query text is required",
			});
		}

		// Get embedding for the query text
		const queryEmbedding = await cohere.embed({
			texts: [query],
			model: "embed-english-light-v3.0",
			inputType: "search_query",
			embeddingTypes: ["float"],
		});

		// Query Pinecone with the embedding
		const queryResponse = await index.namespace(projectId).query({
			vector: queryEmbedding.embeddings.float[0],
			topK: limit,
			includeMetadata: true,
		});

		// Format the response
		const results = queryResponse.matches.map((match) => ({
			id: match.id,
			score: match.score,
			content: match.metadata.content,
			header: match.metadata.header,
			sourceUrl: match.metadata.sourceUrl,
			timestamp: match.metadata.timestamp,
		}));

		res.status(200).json({
			query,
			results,
		});
	} catch (error) {
		console.error("Error querying data:", error);
		res.status(500).json({
			error: "Failed to query data",
			details: error.message,
		});
	}
});

app.get("/api/v1/deploy/:projectId", getProject, async (req, res) => {
	const chatOptions = req.project.chatOptions;

	if (!chatOptions) {
		return res
			.status(400)
			.send({ error: "chatOptions object is required." });
	}

	try {
		const s3Url = await deployProject(req.project);
		res.send({
			message: "File uploaded successfully!",
			url: s3Url,
		});
	} catch (error) {
		console.error("Error:", error);
		res.status(500).send({
			error: "Failed to deploy project.",
		});
	}
});

/* STRIPE HANDLERS */
app.post("/api/v1/subscribe", async (req, res) => {
	/*
If no subscription, then create a new checkout session for the requested item. Apply trial if applicable
If free trial and upgrade is selected, cancel trial and start subscription
If active subscription and selected plan is lower, then switch at period end
If active subscription and selected plan is higher, then switch immediately and apply pro-rata
If cancelled, then create a new checkout session for the requested item

Claims will be updated in webhook.
*/
	try {
		const userId = req.auth.userId;
		const {
			plan,
			subscription,
			hasPaymentMethod,
			cancel_at_period_end,
			hasUsedTrial,
			stripeCustomerId,
		} = req.auth.claims;
		const requestedPlanKey = req.body.lookup_key;

		// Validate requested plan
		const prices = await stripe.prices.list({
			lookup_keys: [requestedPlanKey],
			expand: ["data.product"],
		});

		if (!prices.data.length) {
			return res.status(400).json({ error: "Invalid plan selected" });
		}

		const requestedPriceId = prices.data[0].id;

		// If user has active subscription
		if (subscription === "active" || subscription === "trialing") {
			const subscriptions = await stripe.subscriptions.list({
				customer: stripeCustomerId,
				limit: 1,
			});

			if (subscriptions.data.length > 0) {
				const currentSub = subscriptions.data[0];
				const currentPriceId = currentSub.items.data[0].price.id;

				// Handle case where subscription is scheduled to cancel
				if (currentSub.cancel_at_period_end === true) {
					// If they're keeping the same plan, just remove the cancellation
					if (currentPriceId === requestedPriceId) {
						await stripe.subscriptions.update(currentSub.id, {
							cancel_at_period_end: false,
						});
						return res
							.status(200)
							.json({ message: "Subscription reactivated" });
					}
					// If changing plans, remove cancellation and update plan
					else {
						const updateParams = {
							cancel_at_period_end: false,
							items: [
								{
									id: currentSub.items.data[0].id,
									price: requestedPriceId,
								},
							],
						};

						// If upgrading to higher tier, apply proration
						if (
							prices.data[0].unit_amount >
							currentSub.items.data[0].price.unit_amount
						) {
							updateParams.proration_behavior = "always_invoice";
						} else {
							updateParams.proration_behavior = "none";
						}

						await stripe.subscriptions.update(
							currentSub.id,
							updateParams
						);
						return res.status(200).json({
							message:
								updateParams.proration_behavior ===
								"always_invoice"
									? "Subscription upgraded and reactivated"
									: "Subscription will be updated at period end and has been reactivated",
						});
					}
				}

				// If upgrading from trial or to a higher tier
				if (
					subscription === "trialing" ||
					prices.data[0].unit_amount >
						currentSub.items.data[0].price.unit_amount
				) {
					// Immediate upgrade
					await stripe.subscriptions.update(currentSub.id, {
						items: [
							{
								id: currentSub.items.data[0].id,
								price: requestedPriceId,
							},
						],
						proration_behavior: "always_invoice",
					});
					return res
						.status(200)
						.json({ message: "Subscription upgraded" });
				} else {
					// Downgrade at period end
					await stripe.subscriptions.update(currentSub.id, {
						items: [
							{
								id: currentSub.items.data[0].id,
								price: requestedPriceId,
							},
						],
						proration_behavior: "none",
					});
					return res.status(200).json({
						message: "Subscription will be updated at period end",
					});
				}
			}
		}

		// Create new checkout session for new subscriptions
		const session_data = {
			client_reference_id: userId,
			billing_address_collection: "auto",
			line_items: [{ price: requestedPriceId, quantity: 1 }],
			mode: "subscription",
			success_url: "https://webindexer.app/success",
			cancel_url: "https://webindexer.app",
			automatic_tax: { enabled: true },
			subscription_data: {
				metadata: { client_reference_id: userId },
			},
		};

		if (stripeCustomerId) {
			session_data.customer = stripeCustomerId;
		}

		// Apply trial if eligible
		if (requestedPlanKey === "starter_v2" && !hasUsedTrial) {
			session_data.subscription_data = {
				...session_data.subscription_data,
				trial_period_days: 30,
				trial_settings: {
					end_behavior: { missing_payment_method: "cancel" },
				},
				payment_behavior: "allow_incomplete",
			};
			session_data.payment_method_collection = "if_required";
		}

		const session = await stripe.checkout.sessions.create(session_data);
		res.status(200).json({ id: session.id, url: session.url });
	} catch (error) {
		console.error("Error in subscribe:", error);
		res.status(500).json({ error: error.message });
	}
});

app.post("/api/v1/cancel-subscription", async (req, res) => {
	/*
If free trial with payment info, cancel at period end
if active subscription, cancel at period end

Claims will be updated in webhook.
*/
	try {
		const userId = req.auth.userId;
		const { subscription, stripeCustomerId } = req.auth.claims;

		if (subscription !== "active" && subscription !== "trialing") {
			return res
				.status(400)
				.json({ error: "No active subscription to cancel" });
		}

		const subscriptions = await stripe.subscriptions.list({
			customer: stripeCustomerId,
			limit: 1,
		});

		if (!subscriptions.data.length) {
			return res.status(404).json({ error: "No subscription found" });
		}

		const currentSub = subscriptions.data[0];

		if (currentSub.cancel_at_period_end) {
			return res.status(200).json({
				message: "Subscription already scheduled for cancellation",
				cancelAt: currentSub.cancel_at,
			});
		}

		const updatedSub = await stripe.subscriptions.update(currentSub.id, {
			cancel_at_period_end: true,
		});

		res.status(200).json({
			message: "Subscription scheduled for cancellation",
			cancelAt: updatedSub.cancel_at,
		});
	} catch (error) {
		console.error("Error in cancel-subscription:", error);
		res.status(500).json({ error: error.message });
	}
});

app.post("/api/v1/add-payment-method", async (req, res) => {
	try {
		const { stripeCustomerId } = req.auth.claims;

		if (!stripeCustomerId) {
			return res.status(400).json({ error: "No customer ID found" });
		}

		// Retrieve the stripe customer
		const customer = await stripe.customers.retrieve(stripeCustomerId);

		// Check if the customer has the payment method already
		if (customer.invoice_settings.default_payment_method) {
			await auth.setCustomUserClaims(req.auth.userId, {
				...req.auth.claims,
				hasPaymentMethod: true,
			});
			return res
				.status(400)
				.json({ error: "Payment method already exists" });
		}

		// Check if there is a client_reference_id metadata in the stripe customer
		if (!customer.metadata.client_reference_id) {
			await stripe.customers.update(stripeCustomerId, {
				metadata: { client_reference_id: req.auth.userId },
			});
		}

		const session = await stripe.checkout.sessions.create({
			client_reference_id: req.auth.userId,
			mode: "setup",
			customer: stripeCustomerId,
			payment_method_types: ["card"],
			success_url: "https://webindexer.app/projects",
			cancel_url: "https://webindexer.app",
			setup_intent_data: {
				metadata: { client_reference_id: req.auth.userId },
			},
		});

		res.status(200).json({ url: session.url });
	} catch (error) {
		console.error("Error in add-payment-method:", error);
		res.status(500).json({ error: error.message });
	}
});

app.get("/api/v1/check-session/:sessionId", async (req, res) => {
	const session = await stripe.checkout.sessions.retrieve(
		req.params.sessionId
	);
	res.status(200).json(session);
});

/* LEAD HANDLERS */
// Get all leads for a project
app.get("/api/v1/leads/:projectId", getProject, async (req, res) => {
	try {
		const { projectId } = req.params;

		const leads = await getLeadsForProject(projectId);

		const mappedLeadInfo = leads.map((lead) => {
			return {
				...(lead.leadInfo || {}),
				createdAt: lead.createdAt,
			};
		});

		res.status(200).json(mappedLeadInfo);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to fetch leads" });
	}
});

// Export leads
app.get("/api/v1/leads/:projectId/export", getProject, async (req, res) => {
	try {
		const { projectId } = req.params;

		const exportData = await exportLeadsData(projectId);
		res.status(200).json(exportData);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to export leads" });
	}
});

// Send a lead to zapier webhook
app.post("/api/v1/leads/:projectId", getProject, async (req, res) => {
	try {
		const { leadInfo, webhookUrl } = req.body;

		console.log(leadInfo);

		// check type
		console.log(typeof leadInfo);

		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(leadInfo),
		});

		if (!response.ok) {
			throw new Error("Failed to send lead to webhook");
		}

		res.status(200).json(leadInfo);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to create lead" });
	}
});

app.use((req, res, next) => {
	return res.status(404).json({
		error: "Not Found",
	});
});

app.use((err, req, res, next) => {
	console.error(err);
	if (err.name === "UnauthorizedError") {
		return res.status(401).json({ error: "Invalid token" });
	} else {
		return res.status(500).json({ error: "Internal Server Error" });
	}
});

export const handler = serverless(app);
