import { auth } from "auth-sdk";
import {
	getContrastTextColor,
	getContrastTextColorShaded,
} from "./color_generator.js";
import { getURL, uploadFile } from "./s3_interface.js";
import { updateProject } from "./database_interface.js";
import fs from "fs";
import path from "path";
import { minify } from "terser";

export async function deployProject(project) {
	try {
		if (!project.chatOptions) {
			throw new Error("chatOptions object is required.");
		}

		// Get user claims for pricing plan
		const userClaims = (await auth.getUser(project.createdByUserId))
			.customClaims || { plan: "Starter" };
		const pricingPlan = userClaims.plan;

		const iconTypePaths = {
			question:
				"M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 448c-110.532 0-200-89.431-200-200 0-110.495 89.472-200 200-200 110.491 0 200 89.471 200 200 0 110.53-89.431 200-200 200zm107.244-255.2c0 67.052-72.421 68.084-72.421 92.863V300c0 6.627-5.373 12-12 12h-45.647c-6.627 0-12-5.373-12-12v-8.659c0-35.745 27.1-50.034 47.579-61.516 17.561-9.845 28.324-16.541 28.324-29.579 0-17.246-21.999-28.693-39.784-28.693-23.189 0-33.894 10.977-48.942 29.969-4.057 5.12-11.46 6.071-16.666 2.124l-27.824-21.098c-5.107-3.872-6.251-11.066-2.644-16.363C184.846 131.491 214.94 112 261.794 112c49.071 0 101.45 38.304 101.45 88.8zM298 368c0 23.159-18.841 42-42 42s-42-18.841-42-42 18.841-42 42-42 42 18.841 42 42z",
			message:
				"M378.74,181.184c0-76.576-84.708-138.743-189.305-138.743C84.73,42.441,0,104.608,0,181.184 c0,47.154,32.291,88.591,81.343,113.7l-47.024,89.389l101.987-70.515c16.955,3.645,34.6,6.234,53.129,6.234 C294.053,319.992,378.74,257.846,378.74,181.184z M129.942,196.24H89.95v-40.014h39.992V196.24z M251.3,156.226h39.992v40.014 H251.3V156.226z M170.625,156.226h39.971v40.014h-39.971V156.226z M502.664,268.481c0-50.325-38.763-93.984-95.602-115.943c2.804,10.332,4.314,21.053,4.314,32.097 c0,90.77-100.304,164.412-224.25,164.412c-1.532,0-2.955-0.324-4.465-0.324c32.68,30.868,83.695,50.799,141.138,50.799 c17.515,0,34.147-2.438,50.152-5.846l96.378,66.546l-44.457-84.363C472.206,352.111,502.664,312.981,502.664,268.481z",

			robot: "M379.98 299.98C406.04 299.98 427.4 321.56 427.4 347.98L427.4 366.4C427.4 389.97 417.21 412.61 399.31 427.67C365.78 456.28 318.13 470.02 256 470.02C194.51 470.02 146.93 456.29 113.55 427.68C95.69 412.62 85.54 390.00 85.54 366.45L85.54 347.98C85.54 321.56 106.9 299.98 132.96 299.98L379.98 299.98ZM254.25 42.82L256.07 42.68C264.24 42.68 271.27 48.23 272.33 55.70L272.47 57.87L272.46 74.85L347.33 74.86C373.39 74.86 394.75 96.44 394.75 122.86L394.75 219.10C394.75 245.52 373.39 267.10 347.33 267.10L165.33 267.10C139.27 267.10 117.91 245.52 117.91 219.10L117.91 122.86C117.91 96.44 139.27 74.86 165.33 74.86L208.46 74.85L208.47 57.87C208.47 49.91 214.93 43.22 223.10 42.82L224.07 42.68L256.07 42.68L254.25 42.82ZM208.19 138.93C193.27 138.93 181.25 150.94 181.25 165.87C181.25 180.79 193.27 192.80 208.19 192.80C223.12 192.80 235.13 180.79 235.13 165.87C235.13 150.94 223.12 138.93 208.19 138.93ZM304.30 138.93C289.38 138.93 277.36 150.94 277.36 165.87C277.36 180.79 289.38 192.80 304.30 192.80C319.23 192.80 331.24 180.79 331.24 165.87C331.24 150.94 319.23 138.93 304.30 138.93Z",
			"web-indexer":
				"M48.2 245.3v226.3h98.2c10.9 0 19.7 8.9 19.7 19.8v.5c0 11-8.8 19.8-19.7 19.8H28.7c-10.9 0-19.7-8.9-19.7-19.8V224.8c0-10.9 8.8-19.8 19.7-19.8h118.2c10.9 0 19.7 8.9 19.7 19.8v.5c0 11-8.8 19.9-19.7 19.9H48.2zm380.9-20.5v267c0 11-8.8 19.8-19.7 19.8H291.2c-10.9 0-19.8-8.9-19.8-19.8v-.5c0-11 8.9-19.8 19.8-19.8h98.2V245.3h-98.2c-10.9 0-19.8-8.9-19.8-19.9v-.5c0-10.9 8.9-19.8 19.8-19.8h118.2c10.9 0 19.7 8.9 19.7 19.8zM183.1 356c0 16-12.8 28.9-28.7 28.9s-28.7-12.9-28.7-28.9 12.8-28.9 28.7-28.9 28.7 13 28.7 28.9zm123.3 0c0 16-12.8 28.9-28.7 28.9s-28.7-12.9-28.7-28.9 12.8-28.9 28.7-28.9 28.7 13 28.7 28.9zM264.4 0H168c-7.5 0-13.5 6.1-13.5 13.6v83.2c0 7.5 6 13.6 13.5 13.6h34.1v116.8c0 5.6 2.2 10.6 5.8 14.2 3.6 3.6 8.6 5.9 14.2 5.9 11 0 20-9 20-20.1V110.4h34.1c7.5 0 13.5-6.1 13.5-13.6V13.6c0-7.5-6-13.6-13.5-13.6zm-13.5 85.8H183.10V30.6h81.1v55",
		};

		let iconTypePath =
			iconTypePaths[project.chatOptions.styles.iconType] ||
			iconTypePaths["question"];
		let iconUrl = "";

		if (project.chatOptions.styles.iconType === "custom") {
			iconUrl = project.chatOptions.styles.iconUrl;
			iconTypePath = null;
		}

		const welcomeMessageBackgroundColor =
			project.chatOptions.styles.colorScheme.scheme
				.welcomeMessageBackgroundColor ||
			project.chatOptions.styles.colorScheme.scheme.backgroundColor;

		const styles = {
			// Base styles
			iconOffsetRight: "48px",
			iconOffsetBottom: "32px",
			iconOffsetRightMobile:
				project.projectId === "8ceda8f3-0bda-4046-ae44-7e76436c3f3f"
					? "80px"
					: "16px",
			offsetRight: "32px",
			offsetBottom: "32px",
			width: "400px",
			height: "512px",
			borderRadius: "8px",
			welcomeMessageActive: false,
			welcomeMessageMode: "new-user",
			welcomeMessageBackgroundColor,

			// Color contrasts
			primaryColorContrast: getContrastTextColor(
				project.chatOptions.styles.colorScheme.scheme.primaryColor
			),
			secondaryColorContrast: getContrastTextColor(
				project.chatOptions.styles.colorScheme.scheme.secondaryColor
			),
			tertiaryColorContrast: getContrastTextColor(
				project.chatOptions.styles.colorScheme.scheme.tertiaryColor
			),
			backgroundColorContrast: getContrastTextColor(
				project.chatOptions.styles.colorScheme.scheme.backgroundColor
			),
			welcomeMessageBackgroundColorContrast: getContrastTextColor(
				welcomeMessageBackgroundColor
			),

			// Shaded contrasts
			primaryColorContrastShaded: getContrastTextColorShaded(
				project.chatOptions.styles.colorScheme.scheme.primaryColor
			),
			secondaryColorContrastShaded: getContrastTextColorShaded(
				project.chatOptions.styles.colorScheme.scheme.secondaryColor
			),
			tertiaryColorContrastShaded: getContrastTextColorShaded(
				project.chatOptions.styles.colorScheme.scheme.tertiaryColor
			),

			includePaths: [],
			excludePaths: [],
			...project.chatOptions.styles,
			...project.chatOptions.styles.colorScheme.scheme,
			...project.chatOptions.aiOptions,
			destination: project.chatOptions.businessInfo.destination,
			iconTypePath: iconTypePath,
			iconUrl: iconUrl,
			projectId: project.projectId,
			pricingPlan: pricingPlan,
		};

		// Read template file
		const template = await fs.promises.readFile(
			path.join(process.cwd(), "script_template.txt"),
			"utf8"
		);

		// Replace variables in template
		let widgetCode = template;
		for (const [key, value] of Object.entries(styles)) {
			const placeholder = `\${${key}}`;
			let formattedValue = Array.isArray(value)
				? JSON.stringify(value)
				: value;
			widgetCode = widgetCode.replaceAll(placeholder, formattedValue);
		}

		// Minify the code
		const minified = await minify(widgetCode);
		if (minified.error) {
			console.error("Minification error:", minified.error);
			minified.code = widgetCode;
		}

		// Upload to S3
		const fileName = `chatWidgetLink-${project.projectId}.js`;
		await uploadFile(fileName, minified.code);

		// Generate S3 URL and update project
		const s3Url = getURL(fileName);
		await updateProject(project.projectId, {
			chatWidgetLink: s3Url,
		});

		return s3Url;
	} catch (error) {
		console.error(`Error deploying project ${project.projectId}:`, error);
		throw error;
	}
}
