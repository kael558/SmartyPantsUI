import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
	DeleteObjectCommand,
	HeadObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";


//import * as dotenv from 'dotenv';
//dotenv.config({ path: './.env' });


// Configure AWS SDK
const s3Client = new S3Client({
	region: process.env.S3_REGION,
	credentials: {
		accessKeyId: process.env.S3_ACCESS_KEY_ID,
		secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
	},
});

export const bucketName = process.env.S3_BUCKET_NAME;



export async function generateSignedUrlForBuild(type) {
	let objectKey = "";
	if (type === "android") {
		objectKey = "builds/fluent-future-main-723cc7-debug.apk";
	} else if (type === "ios") {
		throw new Error("iOS builds are not supported yet");
	} else {
		throw new Error("Invalid build type");
	}

	const command = new GetObjectCommand({ Bucket: bucketName, Key: objectKey });
	const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL valid for 1 hour
	return signedUrl;
}

// Generate a signed URL for getting an audio file
export async function generateSignedUrlForAudio(objectKey, userId) {
	// Extract the user ID from the object key
	const keyParts = objectKey.split("/");
	const keyUserId = keyParts[1]; // Assuming the key format is speech/userId/sessionId/...

	// Check if the requesting user is the owner of the audio
	if (keyUserId !== userId) {
		throw new Error("Unauthorized access to audio file");
	}

	const command = new GetObjectCommand({ Bucket: bucketName, Key: objectKey });
	const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 86400 }); // URL valid for 1 day
	return signedUrl;
}

export const generateAudioKey = (params) => {
	const { userId, sessionId, contentIndex } = params;
	const hash = crypto
		.createHash("md5")
		.update(JSON.stringify(params))
		.digest("hex");
	return `speech/${userId}/${sessionId}/${contentIndex}_${hash}.mp3`;
};

// Upload a file to S3
export const uploadAudioFile = async (params, data) => {
	const key = generateAudioKey(params);
	const uploadParams = {
		Bucket: bucketName,
		Key: key,
		Body: Buffer.from(data, "base64"),
		ContentType: "audio/mpeg",
	};

	const command = new PutObjectCommand(uploadParams);
	await s3Client.send(command);

	// Generate and return the key
	return key;
};

export async function fileExists(key) {
	const params = {
		Bucket: bucketName,
		Key: key,
	};

	try {
		await s3Client.send(new HeadObjectCommand(params));
		return true;
	} catch (error) {
		if (error.name === "NotFound") {
			return false;
		}
		throw error;
	}
}



export async function generateSignedUrl(objectKey) {
	const command = new GetObjectCommand({ Bucket: bucketName, Key: objectKey });
	const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 86400 }); // URL valid for 1 day
	return signedUrl;
}


export const generateKey = (key) => {
	const hash = crypto.createHash("md5").update(key).digest("hex");
	return hash;
}

export const getFile = async (key) => {
	const params = {
		Bucket: bucketName,
		Key: key,
	};

	const command = new GetObjectCommand(params);
	const response = await s3Client.send(command);
	const data = await new Response(response.Body).arrayBuffer();
	return data;
};

export const getFileBuffer = async (key) => {
	const params = {
		Bucket: bucketName,
		Key: key,
	};

	const command = new GetObjectCommand(params);
	const response = await s3Client.send(command);
	// Convert the readable stream to a buffer
	const chunks = [];
	for await (const chunk of response.Body) {
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}


export function getURL(key) {
	return `https://${bucketName}.s3.amazonaws.com/${key}`;
}

export const uploadFile = async (key, data, ACL = 'public-read', metadata = {}) => {
	const params = {
		Bucket: bucketName,
		Key: key,
		Body: data,
		ACL,
		Metadata: metadata,
	};

	const command = new PutObjectCommand(params);

	await s3Client.send(command);
};



export const deleteFile = async (key) => {
	const params = {
		Bucket: bucketName,
		Key: key,
	};

	const command = new DeleteObjectCommand(params);
	await s3Client.send(command);
};

