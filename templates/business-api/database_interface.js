import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	GetCommand,
	QueryCommand,
	UpdateCommand,
	DeleteCommand,
	PutCommand,
	ScanCommand,
	BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { projectLimitsByPlan } from "./plan.js";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const LEADS_TABLE = process.env.LEADS_TABLE_NAME;
const PROJECTS_TABLE = process.env.PROJECTS_TABLE_NAME;
const CREATED_BY_INDEX = "createdByUserIdIndex";

export const createProject = async (userId, planType, projectData) => {
	const projectId = projectData.projectId || uuidv4();
	const timestamp = new Date().toISOString();

	const item = {
		projectId,
		createdByUserId: userId,
		createdAt: timestamp,
		updatedAt: timestamp,
		sharedWithUserEmails: [],

		name: projectData.name || "Untitled Project",
		/*leadColumns: [{
			"name": "Name",
			"description": "The name of the lead",
		},
		{
			"name": "Email",
			"description": "The email address of the lead",
		},
		{
			"name": "Phone",
			"description": "The phone number of the lead",
		},
		{
			"name": "Company",
			"description": "The company of the lead",
		},
		{
			"name": "Additional Info",
			"description": "Additional information about the lead",
		}],*/
		crawls: projectData.crawls || [],
		files: [],
		actions: [
			{
				name: "Query",
				description:
					"Use this action to search the company's knowledge base for relevant information",
				active: true,
				parameters: [
					{
						name: "queries",
						type: "array",
						description: `List of search queries (0-3) to find relevant information in knowledge base. Keep concise and business-focused.`,
						required: true,
					},
				],
			},
			{
				name: "Add Lead",
				description:
					"Use this action to save a potential customer to the database",
				active: true,
				parameters: [
					{
						name: "Name",
						type: "string",
						description: "The name of the lead",
						required: true,
					},
					{
						name: "Email",
						type: "string",
						description: "The email address of the lead",
						required: true,
					},
					{
						name: "Phone",
						type: "string",
						description: "The phone number of the lead",
					},
					{
						name: "Company",
						type: "string",
						description: "The company of the lead",
					},
					{
						name: "Additional Info",
						type: "string",
						description: "Additional information about the lead",
					},
				],
			},
		],
		chatOptions: {
			businessInfo: {
				businessName: projectData.businessName || "My Business",
				businessDescription:
					projectData.businessDescription ||
					"We are a business that solves the following problems for our customers...",

				supportEmail: projectData.supportEmail || "N/A",
				emailVerified: false,

				convertType: projectData.convertType || "Subscription",
				destination:
					projectData.destination || "https://example.com/subscribe",

				...(projectData?.chatOptions?.businessInfo || {}),
			},
			styles: {
				colorScheme: {
					name: "Default",
					scheme: {
						primaryColor: "#6366f1", // Main brand color - used for assistant messages and key UI elements
						secondaryColor: "#334155", // Used for user messages and secondary elements
						tertiaryColor: "#1e293b", // Used for header and supporting elements
						backgroundColor: "#ffffff", // Keep background separate as it's not part of the color scheme
					},
				},
				iconType: "question",
				iconSize: "48px",
				profileIcon: "https://example.com/logo.png",
			},
			aiOptions: {
				welcomeMessageMode: "new-user",
				welcomeMessage: "Hello! How can I help you today?",
				customInstructions:
					"You are a helpful customer service representative for <company>...",
				responseStyle:
					"Respond in a friendly and professional manner with very short and concise responses.",
				profileName: "Assistant",
			},
		},
		limits: projectLimitsByPlan[planType],
		chatWidgetLink: `https://web-indexer-bucket.s3.amazonaws.com/chatWidgetLink-${projectId}.js`,
		zapierWebhookUrl: "",
	};

	const command = new PutCommand({
		TableName: PROJECTS_TABLE,
		Item: item,
	});

	await docClient.send(command);
	return item;
};

export const updateProject = async (
	projectId,
	projectData,
	existingProject = null
) => {
	const timestamp = new Date().toISOString();
	projectData.updatedAt = timestamp; // Ensure updatedAt is always set

	const validFields = [
		"name",
		"updatedAt",
		"crawls",
		"chatOptions",
		"chatWidgetLink",
		"businessInfo",
		"emailVerification",
		"zapierWebhookUrl",
		"files",
		"actions",
	];

	const updateExpression = [];
	const expressionAttributeNames = {};
	const expressionAttributeValues = {};

	if (existingProject) {
		const existingSupportEmail =
			existingProject?.chatOptions?.businessInfo?.supportEmail;

		// Check if supportEmail is changing
		const newSupportEmail =
			projectData.chatOptions?.businessInfo?.supportEmail;
		if (
			newSupportEmail !== undefined &&
			newSupportEmail !== existingSupportEmail
		) {
			//console.log('Support email is changing', newSupportEmail, existingSupportEmail);
			projectData.chatOptions.businessInfo.emailVerified = false;
		}
	}

	for (const field of validFields) {
		if (projectData[field] !== undefined) {
			updateExpression.push(`#${field} = :${field}`);
			expressionAttributeNames[`#${field}`] = field;
			expressionAttributeValues[`:${field}`] = projectData[field];
		}
	}

	if (updateExpression.length === 0) {
		throw new Error("No valid fields to update");
	}

	const command = new UpdateCommand({
		TableName: PROJECTS_TABLE,
		Key: { projectId },
		UpdateExpression: `SET ${updateExpression.join(", ")}`,
		ExpressionAttributeNames: expressionAttributeNames,
		ExpressionAttributeValues: expressionAttributeValues,
		ReturnValues: "UPDATED_NEW",
	});

	const result = await docClient.send(command);
	return result.Attributes;
};

// Not exposed to the API, only to stripe webhook
export const setProjectLimitsByUserId = async (userId, planType) => {
	const projects = await getProjectsByOwner(userId);

	// Process in batches of 25 (DynamoDB batch write limit)
	for (let i = 0; i < projects.length; i += 25) {
		const batch = projects.slice(i, i + 25);

		const command = new BatchWriteCommand({
			RequestItems: {
				[PROJECTS_TABLE]: batch.map((project) => ({
					PutRequest: {
						Item: {
							...project,
							limits: projectLimitsByPlan[planType],
						},
					},
				})),
			},
		});

		await docClient.send(command);
	}
};

export const getProject = async (req, res, next) => {
	const { projectId } = req.params;
	const userId = req.auth.userId;
	const email = req.auth.email;

	const command = new GetCommand({
		TableName: PROJECTS_TABLE,
		Key: { projectId },
	});

	const result = await docClient.send(command);
	const project = result.Item;

	if (!project) {
		return res.status(404).json({ error: "Project not found" });
	}

	if (email === "rahel.gunaratne@gmail.com") {
		// Admin user hack temporarily (dunno y the auth role thing no work here)
		req.project = project;
		return next();
	}

	if (
		project.createdByUserId !== userId &&
		!project.sharedWithUserEmails.includes(email)
	) {
		return res.status(403).json({ error: "Unauthorized" });
	}

	req.project = project;
	next();
};

export const getProjectById = async (projectId) => {
	const command = new GetCommand({
		TableName: PROJECTS_TABLE,
		Key: { projectId },
	});

	const result = await docClient.send(command);
	const project = result.Item;

	if (!project) {
		return null;
	}

	return project;
};

export const getProjectsByOwner = async (userId) => {
	const command = new QueryCommand({
		TableName: PROJECTS_TABLE,
		IndexName: CREATED_BY_INDEX,
		KeyConditionExpression: "createdByUserId = :userId",
		ExpressionAttributeValues: {
			":userId": userId,
		},
	});

	const result = await docClient.send(command);
	return result.Items;
};

export const getProjectsSharedWithYou = async (userEmail) => {
	const command = new ScanCommand({
		TableName: PROJECTS_TABLE,
		FilterExpression: "contains(sharedWithUserEmails, :email)",
		ExpressionAttributeValues: {
			":email": userEmail,
		},
	});

	const result = await docClient.send(command);
	return result.Items;
};

export const shareProject = async (projectId, userEmail) => {
	// First, get the current project
	const getCommand = new GetCommand({
		TableName: PROJECTS_TABLE,
		Key: { projectId },
	});

	const { Item: project } = await docClient.send(getCommand);

	if (!project) {
		throw new Error("Project not found");
	}

	// Check if the email is already in the array
	if (!project.sharedWithUserEmails.includes(userEmail)) {
		const updateCommand = new UpdateCommand({
			TableName: PROJECTS_TABLE,
			Key: { projectId },
			UpdateExpression:
				"SET sharedWithUserEmails = list_append(if_not_exists(sharedWithUserEmails, :empty_list), :new_email)",
			ExpressionAttributeValues: {
				":empty_list": [],
				":new_email": [userEmail],
			},
			ReturnValues: "UPDATED_NEW",
		});

		const result = await docClient.send(updateCommand);
		return result;
	} else {
		return { message: "Email already shared with this project" };
	}
};

export const deleteProject = async (projectId) => {
	const command = new DeleteCommand({
		TableName: PROJECTS_TABLE,
		Key: { projectId },
	});

	const result = await docClient.send(command);
	return result;
};

/* LEADS FUNCTIONS */
export const getLeadsForProject = async (
	projectId,
	n = 20,
	lastEvaluatedKey = null
) => {
	const command = new QueryCommand({
		TableName: LEADS_TABLE,
		KeyConditionExpression:
			"PK = :projectId AND begins_with(SK, :leadPrefix)",
		ExpressionAttributeValues: {
			":projectId": `PROJECT#${projectId}`,
			":leadPrefix": "LEAD#",
		},
		Limit: parseInt(n, 10),
		ExclusiveStartKey: lastEvaluatedKey
			? JSON.parse(lastEvaluatedKey)
			: undefined,
	});

	const response = await docClient.send(command);
	return response.Items;
};

export const exportLeadsData = async (projectId) => {
	// Get all leads for the project
	const leads = await getLeadsForProject(projectId);

	// Format for export
	return leads.map((lead) => {
		// Remove PK, SK and other internal fields
		const { PK, SK, ...exportData } = lead;
		return exportData;
	});
};
