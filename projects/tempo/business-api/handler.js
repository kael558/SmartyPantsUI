import express from "express";
import cors from "cors";
import serverless from "serverless-http";
import { authenticate } from "./auth_interface.js";

import nodemailer from "nodemailer";
import multer from "multer";

import path from "path";
import fs from "fs";

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

import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

app.listen(3001, () => {
	console.log("Server is running on port 3001");
});

export const handler = serverless(app);
