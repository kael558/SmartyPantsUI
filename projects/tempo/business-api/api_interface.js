import { CohereClient } from "cohere-ai";
import FirecrawlApp from '@mendable/firecrawl-js';

export async function chat(messages, model = "gemma2-9b-it", json_mode = false) {
	const cleanedMessages = messages.map(({ role, content }) => ({
		role,
		content,
	}));

	const payload = {
		model,
		messages: cleanedMessages,
	};

	if (json_mode) {
		payload.response_format = { type: "json_object" };
	}

	try {
		if (model === "gpt-4o-mini") {
			const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
				},
				body: JSON.stringify(payload),
			});

			const data = await openaiResponse.json();

			if (openaiResponse.status !== 200) {
				console.log(data);
				throw new Error(`[OPENAI]: Failed to chat: ${openaiResponse.status}: ${data.error}`);
			}

			return data.choices[0].message.content.replace(/\*/g, "");
		}


		// Try Groq first
		const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
			},
			body: JSON.stringify(payload),
		});

		// If rate limited, try OpenAI
		if (groqResponse.status === 429 || groqResponse.status === 413) {
			console.log("Rate limited by Groq, trying OpenAI...");
			payload.model = "gpt-4o-mini";

			const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
				},
				body: JSON.stringify(payload),
			});

			const data = await openaiResponse.json();

			if (openaiResponse.status !== 200) {
				const data = await openaiResponse.json();
				throw new Error(`[OPENAI]: Failed to chat: ${openaiResponse.status}: ${data.error}`);
			}

			return data.choices[0].message.content.replace(/\*/g, "");
		}

		const data = await groqResponse.json();
		if (groqResponse.status !== 200) {
			throw new Error(`[GROQ] Failed to chat: ${groqResponse.status}. ${JSON.stringify(data)}`);
		}

		return data.choices[0].message.content.replace(/\*/g, "");

	} catch (error) {
		console.error("Error:", error);
		throw error;
	}
}

export async function embed(input, inputType = 'search_query', model = 'embed-english-light-v3.0') {
	const cohere = new CohereClient({
		token: process.env.COHERE_API_KEY
	});

	let texts = input instanceof Array ? input : [input];

	const embed = await cohere.v2.embed({
		texts,
		model: model,
		inputType: inputType,
		embeddingTypes: ['float']
	});

	if (input instanceof Array) {
		return embed.embeddings.float;
	}

	return embed.embeddings.float[0];
}


async function extractChunksFromMarkdown(markdown, title, description) {
	const system_msg = `<<<INSTRUCTION>>>
You are a content chunking assistant. Your task is to break down the provided content into standalone, self-contained chunks that can be understood independently.

RULES FOR CHUNKING:
1. Each chunk should be self-contained and make sense on its own.
2. Include relevant context within each chunk.
3. Focus on concepts, functionality, explanations, or other meaningful content.
4. Exclude irrelevant or generic error messages (e.g., "Error 404, page not found") and placeholder text that is not informative.
5. Preserve code examples and their explanations together.
6. Include the title and relevant description parts where necessary for context.
7. Format each chunk with a clear heading and content.
8. Number each chunk sequentially.

OUTPUT FORMAT:
===CHUNK_START===
## Chunk [number]
[Heading/Title]
[Content including any necessary context, code, and explanations]
===CHUNK_END===

IMPORTANT: Use these exact separators for each chunk to ensure proper parsing.
<<<END_INSTRUCTION>>>`;

	const messages = [
		{ role: "system", content: system_msg },
		{
			role: "user",
			content: `
<<<CONTENT>>>
Title: ${title}
Description: ${description}

${markdown}
<<<END_CONTENT>>>

Please break this content into logical, self-contained chunks using the specified format with CHUNK_START and CHUNK_END separators.

Only include useful information.
`
		}
	];

	try {
		const response = await chat(messages, "gpt-4o-mini");
		return parseChunks(response);
	} catch (error) {
		console.error("Error extracting chunks:", error);
		throw error;
	}
}

function parseChunks(response) {
	const chunks = [];
	// Updated regex to use the new separators
	const chunkRegex = /===CHUNK_START===\s*(## Chunk \d+[\s\S]*?)===CHUNK_END===/g;

	let match;
	while ((match = chunkRegex.exec(response)) !== null) {
		const content = match[1].trim();
		const numberMatch = content.match(/## Chunk (\d+)/);
		const number = numberMatch ? parseInt(numberMatch[1]) : 0;

		// Remove the chunk number line and get the rest of the content
		const contentWithoutNumber = content
			.replace(/## Chunk \d+\n/, '')
			.trim();

		// Split into heading and body
		const [heading, ...bodyParts] = contentWithoutNumber.split('\n');
		const body = bodyParts.join('\n').trim();

		chunks.push({
			number: number,
			header: heading.trim(),
			content: body,
		});
	}

	return chunks.sort((a, b) => a.number - b.number);
}

export async function chunkMarkdown(markdown, title, description) {
	try {
		const chunks = await extractChunksFromMarkdown(markdown, title, description);
		return chunks;
	} catch (error) {
		console.error("Error in chunkMarkdown:", error);
		throw error;
	}
}


export async function takeScreenshot(url) {
	const firecrawlApp = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
	const startTime = Date.now();
	const scrapeResult = await firecrawlApp.scrapeUrl(url, { formats: ['screenshot'] });

	if (scrapeResult.error) {
		console.log('Error:', scrapeResult.error);
		return;
	}

	console.log("Time taken to generate screenshot:", Date.now() - startTime, "ms. For URL: ", url);

	const screenshotUrl = scrapeResult.screenshot;

	// Fetch the screenshot and convert it to a base64 string
	const screenshotResponse = await fetch(screenshotUrl);
	const screenshotBuffer = Buffer.from(await screenshotResponse.arrayBuffer());
	const base64Screenshot = screenshotBuffer.toString('base64');

	// Return the base64 string
	return { image: base64Screenshot };
}


export async function takeScreenshotCloudBrowser(url) {
	// if url doesn't start with http or https, add https
	if (!url.match(/^https?:\/\//)) {
		url = 'https://' + url;
	}

	try {
		const startTime = Date.now();

		const encodedUrl = encodeURIComponent(url);
		const apiKey = process.env.CLOUD_BROWSER_API_KEY;

		const response = await fetch(`https://services.eu-central-1.v2.cloudbrowser-api.com/image?source=${encodedUrl}&key=${apiKey}`, {
			method: 'GET',
		});

		console.log("Time taken to generate screenshot:", Date.now() - startTime, "ms. For URL: ", url);

		if (response.ok) {
			const data = await response.json();
			const base64Image = data["base64"];
			if (!base64Image) {
				console.log(data);
				throw new Error("No image data received");
			}

			const formattedData = { "image": base64Image };

			return formattedData;
		} else if (response.status === 404) {
			const errorData = await response.json();
			console.log("Screenshot hasn't been generated. The error: " + errorData.error);
		} else if (response.status === 401) {
			console.log("Invalid authentication token");
		} else if (response.status === 403) {
			console.log("Active subscription hasn't been found");
		} else {
			const data = await response.json();
			console.log("Unknown Error:", response.status, data);

		}

	} catch (error) {
		console.log('Screenshot generation has failed, the error: ' + error.message + "for URL: " + url);
	}
}


export async function takeScreenshotSiteShot(url) {
	const headers = {
		"Content-type": "application/x-www-form-urlencoded",
		"Accept": "text/plain",
		"userkey": process.env.SITE_SHOT_API_KEY
	};

	// if url doesn't start with http or https, add https
	if (!url.match(/^https?:\/\//)) {
		url = 'https://' + url;
	}

	const params = {
		'url': url,
		'width': 1024,
		'height': 768,
		'format': 'jpeg',
		'response_type': 'json',
		'delay_time': 2000,
		'timeout': 60000,
		'no_ads': 1,
		'no_cookie_popup': 1,
	}

	try {
		const formData = new URLSearchParams(params).toString();

		const startTime = Date.now();
		console.log('Generating screenshot... for URL:', url);

		const response = await fetch('https://api.site-shot.com/', {
			method: 'POST',
			headers: headers,
			body: formData
		});

		if (response.ok) {
			const data = await response.json();
			console.log('Screenshot generated in', Date.now() - startTime, 'ms');
			return data;
			/*
			// Extract base64 image data after the comma
			const base64Image = data.image.split(',')[1];
			// Convert base64 to buffer
			const imageBuffer = Buffer.from(base64Image, 'base64');
			// Write to file
			await require('fs').promises.writeFile('screenshot.png', imageBuffer);
			return data;*/
		} else if (response.status === 404) {
			const errorData = await response.json();
			console.log("Screenshot hasn't been generated. The error: " + errorData.error);
		} else if (response.status === 401) {
			console.log("Invalid authentication token");
		} else if (response.status === 403) {
			console.log("Active subscription hasn't been found");
		}

	} catch (error) {
		console.log('Screenshot generation has failed, the error: ' + error.message);
	}
}


export async function extractBusinessInfo(markdown) {
	const system_msg = `<<<INSTRUCTION>>>
You are a business information extractor. Your task is to extract relevant business information from the provided content.

RULES:
1. Identify the business name from the title, heading, or content.
2. Extract a short, 2-3 line business description summarizing its purpose.
3. Ignore unrelated content.

OUTPUT FORMAT IN JSON:
{
  "businessName": "[Extracted Business Name]",
  "businessDescription": "[Short 2-3 line description]"
}
<<<END_INSTRUCTION>>>`;

	const messages = [
		{ role: "system", content: system_msg },
		{
			role: "user",
			content: `<<<CONTENT>>>\n${markdown}\n<<<END_CONTENT>>>\nExtract the business name and a short description.`
		}
	];

	try {
		const response = await chat(messages, "llama-3.3-70b-versatile", true);
		return JSON.parse(response);
	} catch (error) {
		console.error("Error extracting business info:", error);
		throw error;
	}
}


export async function sendEmail(to, subject, text) {
	const transporter = nodemailer.createTransport({
		host: 'mail.privateemail.com', // Namecheap's private email server
		port: 587,
		secure: false, // Use TLS, can set to true if using port 465 for SSL
		auth: {
			user: process.env.EMAIL_USER,
			pass: process.env.EMAIL_PASSWORD
		}
	})


	const mailOptions = {
		from: process.env.EMAIL_USER,
		to: to,
		subject: subject,
		text: text
	};

	try {
		const info = await transporter.sendMail(mailOptions);
		console.log('Email sent:', info.response);
		return info.response;
	} catch (error) {
		console.error('Error sending email:', error);
		throw error;
	}
}
