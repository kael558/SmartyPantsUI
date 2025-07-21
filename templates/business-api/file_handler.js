import AWS from "aws-sdk";
import { UnstructuredClient } from "unstructured-client";
import { Strategy } from "unstructured-client/sdk/models/shared";
import { CohereClient } from "cohere-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { getProjectById, updateProject } from "./database_interface";

// Initialize clients
const s3 = new AWS.S3();

const unstructuredClient = new UnstructuredClient({
	security: {
		apiKeyAuth: process.env.UNSTRUCTURED_API_KEY,
	},
});

const cohere = new CohereClient({
	token: process.env.COHERE_API_KEY,
});

const pinecone = new Pinecone({
	apiKey: process.env.PINECONE_API_KEY,
});
const index = pinecone.index(process.env.PINECONE_INDEX || "web-indexer");

export const handler = async (event) => {
	let projectId, fileId;
	try {
		// Get the S3 bucket and key from the event
		const bucket = event.Records[0].s3.bucket.name;
		const key = decodeURIComponent(
			event.Records[0].s3.object.key.replace(/\+/g, " ")
		);
		//fileId = path.basename(key);

		// Get the file from S3
		const fileData = await s3
			.getObject({
				Bucket: bucket,
				Key: key,
			})
			.promise();

		// Get metadata
		const metadata = fileData.Metadata || {};
		const fileName = metadata["filename"];
		projectId = metadata["projectid"];
		fileId = metadata["fileid"];

		if (!projectId) {
			console.error("Project ID not found in metadata");
			throw new Error("Project ID not found in metadata");
		}

		const unstructuredResponse = await unstructuredClient.general.partition(
			{
				partitionParameters: {
					files: {
						content: fileData.Body,
						fileName: fileName,
					},
					strategy: Strategy.Auto,
					chunkingStrategy: "by_title",
					maxCharacters: 5000,
					includeOrigElements: false,
					combineUnderNChars: 0,
					multipageSections: true,
				},
			}
		);

		// Extract text chunks from the response
		const textChunks = unstructuredResponse
			.filter(
				(element) =>
					typeof element.text === "string" &&
					element.text.includes("\n")
			)
			.map((element) => element.text);

		console.log(`Extracted ${textChunks.length} text chunks from document`);

		if (textChunks.length === 0) {
			console.warn("No text chunks were extracted from the document");
			throw new Error("No text chunks were extracted from the document");
		}

		// Generate embeddings with Cohere
		const batchSize = 96;
		let allEmbeddings = [];

		for (let i = 0; i < textChunks.length; i += batchSize) {
			const batch = textChunks.slice(i, i + batchSize);
			const embeddingResponse = await cohere.embed({
				texts: batch,
				model: "embed-english-light-v3.0",
				inputType: "search_document",
				embeddingTypes: ["float"],
			});
			allEmbeddings.push(...embeddingResponse.embeddings.float);
		}

		// Get the object URL
		const objectUrl = `https://${bucket}.s3.amazonaws.com/${key}`;
		const vectors = textChunks.map((chunk, index) => {
			const lines = chunk
				.split("\n")
				.filter((line) => line.trim() !== "");
			const header = lines[0]?.trim() || "";
			const content = lines.slice(1).join("\n").trim();

			return {
				id: `${fileId}-${index}`,
				values: allEmbeddings[index],
				metadata: {
					sourceUrl: objectUrl,
					content: content,
					header: header,
					timestamp: new Date().toISOString(),
				},
			};
		});

		// Upsert vectors to Pinecone
		await index.namespace(projectId).upsert(vectors);

		// Update the project
		const project = await getProjectById(projectId);

		const files = project.files || [];
		const existingFile = files.find((file) => file.fileId === fileId);
		existingFile.status = "processed";
		await updateProject(projectId, {
			files,
		});

		return {
			statusCode: 200,
			body: JSON.stringify({
				message: "Document processed successfully",
				fileId: fileId,
				chunksProcessed: textChunks.length,
				vectorsUpserted: vectors.length,
			}),
		};
	} catch (error) {
		console.error("Error processing document:", error.message, error.stack);
		for (let i = 0; i < 5; i++) {
			if (
				await updateProjectWithFileStatus(
					projectId,
					fileId,
					"failed",
					error.message
				)
			) {
				break;
			}
			await new Promise((resolve) => setTimeout(resolve, 3000));
		}

		return {
			statusCode: 500,
			body: JSON.stringify({
				message: "Error processing document",
				error: error.message,
				stack: error.stack,
			}),
		};
	}
};

async function updateProjectWithFileStatus(projectId, fileId, status, error) {
	const project = await getProjectById(projectId);
	const files = project.files || [];
	const existingFile = files.find((file) => file.fileId === fileId);

	if (existingFile) {
		existingFile.status = status;
		existingFile.error = error || null;
		await updateProject(projectId, {
			files,
		});

		return true;
	}

	return false;
}
