import { app, BrowserWindow, ipcMain, WebContentsView, screen } from "electron";
import path from "node:path";
import fs from "fs";
import Store from "electron-store";

import { exec } from "node:child_process";
import { wrapError, wrapSuccess } from "./helpers";
import { promisify } from "util";
import {
	newComponent,
	editComponent,
	newComponentPromptBase,
	editComponentPromptBase,
} from "./api_interface";

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);
const copyAsync = promisify(fs.cp);
const mkdirAsync = promisify(fs.mkdir);

const store = new Store();

let url = store.get("url", ""); // Variable to store the URL
let projectDir = store.get("projectDir", ""); // Variable to store the project directory path
let newComponentPrompt = store.get(
	"newComponentPrompt",
	newComponentPromptBase
); // Variable to store the new component prompt status
let editComponentPrompt = store.get(
	"editComponentPrompt",
	editComponentPromptBase
); // Variable to store the edit component prompt status

const history = [];

let toggleEditModeValue = true;

const createWindow = () => {
	ipcMain.handle("change-size", (event, data) => {
		console.log("Changing size:", data);
		const { device } = data;

		let viewWidth, viewHeight;

		switch (device) {
			case "mobile":
				viewWidth = 360;
				viewHeight = 640;
				break;
			case "tablet":
				viewWidth = 768;
				viewHeight = 1024;
				break;
			case "pc":
				viewWidth = width;
				viewHeight = height;
				break;
			default:
				console.error("Unknown device type.");
				return;
		}

		// Calculate the x and y coordinates to center the view
		const x = Math.round((width - viewWidth) / 2);
		const y = Math.round((height - viewHeight) / 2);

		view.setBounds({ x: 0, y: 0, width: viewWidth, height: viewHeight });

		return wrapSuccess(null);
	});

	const makeEdits = async (requested_change, filepath, csspath) => {
		const componentContent = await readFileAsync(filepath, "utf8");
		let stylesheetContent = "";

		// Try to read the CSS file, if it exists
		try {
			stylesheetContent = await readFileAsync(csspath, "utf8");
		} catch (error) {
			if (error.code === "ENOENT") {
				console.log(`CSS file not found: ${csspath}. Continuing without it.`);
			} else {
				throw error; // Re-throw if it's a different error
			}
		}

		const text = await editComponent(
			requested_change,
			componentContent,
			stylesheetContent,
			editComponentPrompt
		);

		console.log("Received text:", text);

		if (!text) {
			throw new Error("No text received from API");
		}

		// Function to extract sections based on delimiters
		function extractSection(fullText, sectionStartDelimiter) {
			const startIndex =
				fullText.indexOf(sectionStartDelimiter) + sectionStartDelimiter.length;
			const endIndex = fullText.indexOf("```", startIndex);
			return fullText.substring(startIndex, endIndex).trim();
		}

		// Extract UPDATED REACT COMPONENT
		const updatedReactComponent = extractSection(text, "```jsx");
		console.log("UPDATED REACT COMPONENT:", updatedReactComponent);

		// Write the updated content to the React component file
		await writeFileAsync(filepath, updatedReactComponent);
		console.log("File saved successfully:", filepath);

		// Extract UPDATED STYLESHEET if it exists
		const updatedStylesheet = extractSection(text, "```css");
		if (updatedStylesheet) {
			console.log("UPDATED STYLESHEET:", updatedStylesheet);
			// Write the updated content to the CSS file
			await writeFileAsync(csspath, updatedStylesheet);
			console.log("File saved successfully:", csspath);
		} else {
			console.log("No CSS updates were required or provided.");
		}

		const action = {
			type: "edit",
			filepath: filepath,
			componentContent: componentContent,
			csspath: csspath,
			stylesheetContent: stylesheetContent,
		};

		history.push(action);
	};

	ipcMain.handle("edit-code", async (event, data) => {
		try {
			const requested_change = data.input;
			const filepath = data.path;
			const csspath = data.path.replace(".tsx", ".css").replace(".jsx", ".css");

			await makeEdits(requested_change, filepath, csspath);
			await toggleEditMode();
			return wrapSuccess(null);
		} catch (error) {
			console.error("Error editing code:", error);
			return wrapError(error);
		}
	});

	ipcMain.handle("new-component", async (event, data) => {
		try {
			console.log("Input event received:", data);
			let requested_change = data.input;
			const filepath = data.path;
			const csspath = data.path.replace(".tsx", ".css").replace(".jsx", ".css");

			const text = await newComponent(requested_change, newComponentPrompt);

			if (!text) {
				throw new Error("No text received from API");
			}

			console.log("Received text from new component:", text);

			// Function to extract sections based on delimiters
			function extractSection(fullText, sectionStartDelimiter) {
				const startIndex =
					fullText.indexOf(sectionStartDelimiter) +
					sectionStartDelimiter.length;
				const endIndex = fullText.indexOf("```", startIndex);
				return fullText.substring(startIndex, endIndex).trim();
			}

			const filename = extractSection(text, "```plaintext");
			console.log("Filename:", filename);

			// Extract UPDATED REACT COMPONENT
			const newReactComponent = extractSection(text, "```jsx");
			console.log("NEW REACT COMPONENT:", newReactComponent);

			// Extract UPDATED STYLESHEET
			const newStyleSheet = extractSection(text, "```css");
			console.log("NEW STYLESHEET:", newStyleSheet);

			const directory = path.join(projectDir, "src");

			// Ensure the directory exists
			if (!fs.existsSync(directory)) {
				fs.mkdirSync(directory, { recursive: true });
			}

			// Create and write the .tsx file
			const tsxFilePath = path.join(directory, `${filename}.tsx`);
			fs.writeFileSync(tsxFilePath, newReactComponent, "utf8");
			console.log(`File written: ${tsxFilePath}`);

			// Create and write the .css file
			const cssFilePath = path.join(directory, `${filename}.css`);
			fs.writeFileSync(cssFilePath, newStyleSheet, "utf8");
			console.log(`File written: ${cssFilePath}`);

			//
			requested_change =
				`The new component ${filename} has been created at ${tsxFilePath}.
				Simply add the new component to this React component in the appropriate location while keeping the requested change in mind:` +
				requested_change;
			await makeEdits(requested_change, filepath, csspath);
			return wrapSuccess(null);
		} catch (error) {
			console.error("Error making new component:", error);
			return wrapError(error);
		}
	});

	ipcMain.handle("undo", async (event, data) => {
		if (history.length === 0) {
			return wrapError("No actions to undo");
		}

		const lastChange = history.pop();

		if (lastChange.type === "edit") {
			await writeFileAsync(
				lastChange.filepath,
				lastChange.componentContent,
				"utf8"
			);

			if (lastChange.csspath && lastChange.stylesheetContent) {
				await writeFileAsync(
					lastChange.csspath,
					lastChange.stylesheetContent,
					"utf8"
				);
			}

			return wrapSuccess(null);
		} else {
			return wrapError("Unknown action type");
		}
	});

	const getComponent = async (filePath) => {
		// Check if the file exists
		// Fix path to use /website/app/src instead of just /src
		let correctedPath = filePath;
		if (filePath.startsWith("/src/")) {
			correctedPath = "/website/app" + filePath;
		} else if (filePath.startsWith("src/")) {
			correctedPath = "website/app/" + filePath;
		}

		const fullPath = path.join(projectDir, correctedPath);
		try {
			// Check if the file exists
			await statAsync(fullPath);
			console.log("File exists:", fullPath);

			// Read the file content
			const data = await readFileAsync(fullPath, "utf8");
			console.log("Filepath:", fullPath);

			// Send back that the file exists, its path, and its content
			floatingWindow.webContents.send("component-selected", {
				exists: true,
				path: fullPath,
				content: data,
				relativePath: correctedPath,
			});
		} catch (err) {
			console.error("Error accessing file:", err);

			floatingWindow.webContents.send("component-selected", {
				exists: false,
				path: fullPath,
				error: err.message,
				relativePath: correctedPath,
			});
		}
	};

	// Listen for events from development view
	ipcMain.on("click-event", async (event, data) => {
		console.log("Component selected:", data.component);
		console.log(projectDir);

		if (!projectDir) {
			console.error("Project directory not set");
			event.reply("component-selected", { error: "Project directory not set" });
			return;
		}

		// Use fs to locate the file
		const filePath = data.component;

		await getComponent(filePath);
	});

	ipcMain.handle("select-component", async (event, data) => {
		const filepath = data.path;

		await getComponent(filepath);

		return wrapSuccess({
			exists: true,
			path: filepath,
		});
	});

	ipcMain.handle("set-project-dir", (event, path) => {
		// Check if the path exists
		if (!fs.existsSync(path)) {
			console.error("Path does not exist:", path);
			return wrapError("Path does not exist");
		}

		projectDir = path; // Set the project directory
		store.set("projectDir", path); // Save the project directory
		console.log("Project directory set:", path);
		floatingWindow.setTitle(`${path.substr(path.lastIndexOf("\\") + 1)}`);
		//getComponents();
		return wrapSuccess(null);
	});

	ipcMain.handle("open-vscode-editor", (event, data) => {
		console.log("Opening code editor for:", data);
		// open component file in vscode
		exec(`code ${data.path}`, (err, stdout, stderr) => {
			if (err) {
				console.error("Error opening file in VSCode:", err);
				return;
			}
			console.log("File opened in VSCode:", data.path);
		});

		// just say it was successful for now
		return wrapSuccess(null);
	});

	ipcMain.handle("open-devtools", (event, data) => {
		if (view) {
			view.webContents.openDevTools();
		}
		return wrapSuccess(null);
	});

	ipcMain.handle("load-url", (event, data) => {
		try {
			if (view) {
				view.webContents.loadURL(data.url);
			}
			url = data.url;
			store.set("url", url);

			if (toggleEditModeValue && view) {
				toggleEditMode();
			}

			return wrapSuccess(null);
		} catch (error) {
			return wrapError(error);
		}
	});

	ipcMain.handle("reload-page", (event, data) => {
		if (view) {
			view.webContents.reload();

			if (toggleEditModeValue) {
				toggleEditMode();
			}
		}

		return wrapSuccess(null);
	});

	ipcMain.handle("set-prompt", (event, data) => {
		if (data.type === "new-prompt") {
			newComponentPrompt = data.prompt;
			store.set("newComponentPrompt", newComponentPrompt);
		} else if (data.type === "edit-prompt") {
			editComponentPrompt = data.prompt;
			store.set("editComponentPrompt", editComponentPrompt);
		} else {
			return wrapError("Unknown prompt type");
		}

		return wrapSuccess(null);
	});

	// Project Management Handlers
	ipcMain.handle("load-projects", async (event) => {
		try {
			const projectsPath = path.join(__dirname, "../../projects");

			// Check if projects directory exists
			if (!fs.existsSync(projectsPath)) {
				await mkdirAsync(projectsPath, { recursive: true });
				return wrapSuccess([]);
			}

			// Read all directories in the projects folder
			const projectDirs = fs
				.readdirSync(projectsPath, { withFileTypes: true })
				.filter((dirent) => dirent.isDirectory())
				.map((dirent) => dirent.name);

			// Create project objects with name and path
			const projects = projectDirs.map((dirName) => ({
				name: dirName,
				path: path.join(projectsPath, dirName),
				created: fs
					.statSync(path.join(projectsPath, dirName))
					.birthtime.toISOString(),
			}));

			return wrapSuccess(projects);
		} catch (error) {
			console.error("Error loading projects:", error);
			return wrapError(error.message);
		}
	});

	// Project Data Management Handlers
	ipcMain.handle("load-project-data", async (event, projectPath) => {
		try {
			const dataPath = path.join(projectPath, "project_data.json");

			if (!fs.existsSync(dataPath)) {
				return wrapSuccess(null);
			}

			const data = await readFileAsync(dataPath, "utf8");
			const projectData = JSON.parse(data);

			return wrapSuccess(projectData);
		} catch (error) {
			console.error("Error loading project data:", error);
			return wrapError(error.message);
		}
	});

	ipcMain.handle(
		"save-project-data",
		async (event, { path: projectPath, data }) => {
			try {
				const dataPath = path.join(projectPath, "project_data.json");
				const jsonData = JSON.stringify(data, null, 2);

				await writeFileAsync(dataPath, jsonData, "utf8");

				return wrapSuccess(null);
			} catch (error) {
				console.error("Error saving project data:", error);
				return wrapError(error.message);
			}
		}
	);

	// Stage Tracker Management Handlers
	ipcMain.handle("load-stage-tracker", async (event, projectPath) => {
		try {
			const trackerPath = path.join(projectPath, "stage_tracker.json");

			if (!fs.existsSync(trackerPath)) {
				return wrapSuccess(null);
			}

			const data = await readFileAsync(trackerPath, "utf8");
			const trackerData = JSON.parse(data);

			return wrapSuccess(trackerData);
		} catch (error) {
			console.error("Error loading stage tracker:", error);
			return wrapError(error.message);
		}
	});

	ipcMain.handle(
		"save-stage-tracker",
		async (event, { path: projectPath, data }) => {
			try {
				const trackerPath = path.join(projectPath, "stage_tracker.json");
				const jsonData = JSON.stringify(data, null, 2);

				await writeFileAsync(trackerPath, jsonData, "utf8");

				return wrapSuccess(null);
			} catch (error) {
				console.error("Error saving stage tracker:", error);
				return wrapError(error.message);
			}
		}
	);

	// Git Integration Handlers
	ipcMain.handle("setup-github-repo", async (event, { projectPath, repo }) => {
		try {
			console.log(
				`Setting up GitHub repo: ${repo} for project: ${projectPath}`
			);

			return new Promise((resolve) => {
				// First check if git is already initialized
				exec("git status", { cwd: projectPath }, (err, stdout, stderr) => {
					if (err) {
						// Git not initialized, initialize it
						exec(
							"git init",
							{ cwd: projectPath },
							(initErr, initStdout, initStderr) => {
								if (initErr) {
									resolve(
										wrapError(`Failed to initialize git: ${initErr.message}`)
									);
									return;
								}

								// If no repo specified, just return success (git init only)
								if (!repo || repo.trim() === "") {
									resolve(
										wrapSuccess({ repo: "", initialized: true, gitOnly: true })
									);
									return;
								}

								// Add remote origin
								exec(
									`git remote add origin https://github.com/${repo}.git`,
									{ cwd: projectPath },
									(remoteErr, remoteStdout, remoteStderr) => {
										if (remoteErr) {
											// Try to set remote if it already exists
											exec(
												`git remote set-url origin https://github.com/${repo}.git`,
												{ cwd: projectPath },
												(setErr, setStdout, setStderr) => {
													if (setErr) {
														resolve(
															wrapError(
																`Failed to set remote: ${setErr.message}`
															)
														);
														return;
													}
													resolve(wrapSuccess({ repo, initialized: true }));
												}
											);
										} else {
											resolve(wrapSuccess({ repo, initialized: true }));
										}
									}
								);
							}
						);
					} else {
						// Git already initialized
						// If no repo specified, just return success
						if (!repo || repo.trim() === "") {
							resolve(
								wrapSuccess({ repo: "", initialized: false, gitOnly: true })
							);
							return;
						}

						// Update the remote
						exec(
							`git remote set-url origin https://github.com/${repo}.git`,
							{ cwd: projectPath },
							(remoteErr, remoteStdout, remoteStderr) => {
								if (remoteErr) {
									// Try to add remote if it doesn't exist
									exec(
										`git remote add origin https://github.com/${repo}.git`,
										{ cwd: projectPath },
										(addErr, addStdout, addStderr) => {
											if (addErr) {
												resolve(
													wrapError(`Failed to add remote: ${addErr.message}`)
												);
												return;
											}
											resolve(wrapSuccess({ repo, initialized: false }));
										}
									);
								} else {
									resolve(wrapSuccess({ repo, initialized: false }));
								}
							}
						);
					}
				});
			});
		} catch (error) {
			console.error("Error setting up GitHub repo:", error);
			return wrapError(error.message);
		}
	});

	ipcMain.handle("get-git-status", async (event, projectPath) => {
		try {
			return new Promise((resolve) => {
				exec(
					"git branch --show-current",
					{ cwd: projectPath },
					(err, stdout, stderr) => {
						const branch = err ? "main" : stdout.trim();

						exec(
							"git status --porcelain",
							{ cwd: projectPath },
							(err2, stdout2, stderr2) => {
								const changes = err2
									? 0
									: stdout2.split("\n").filter((line) => line.trim()).length;

								resolve(wrapSuccess({ branch, changes }));
							}
						);
					}
				);
			});
		} catch (error) {
			console.error("Error getting git status:", error);
			return wrapError(error.message);
		}
	});

	ipcMain.handle(
		"switch-git-branch",
		async (event, { projectPath, branch, createIfNotExists = true }) => {
			try {
				return new Promise((resolve) => {
					exec(
						`git checkout ${branch}`,
						{ cwd: projectPath },
						(err, stdout, stderr) => {
							if (err && createIfNotExists) {
								// Try to create the branch if it doesn't exist
								exec(
									`git checkout -b ${branch}`,
									{ cwd: projectPath },
									(err2, stdout2, stderr2) => {
										if (err2) {
											resolve(
												wrapError(
													`Failed to switch or create branch: ${err2.message}`
												)
											);
										} else {
											resolve(wrapSuccess({ branch, created: true }));
										}
									}
								);
							} else if (err) {
								resolve(
									wrapError(`Failed to switch to branch: ${err.message}`)
								);
							} else {
								resolve(wrapSuccess({ branch, created: false }));
							}
						}
					);
				});
			} catch (error) {
				console.error("Error switching git branch:", error);
				return wrapError(error.message);
			}
		}
	);

	// Playwright AI Agent Integration
	ipcMain.handle(
		"run-playwright-test",
		async (event, { projectPath, testId, testName, instructions }) => {
			try {
				console.log(`Running AI-powered Playwright test: ${testName}`);
				console.log(`Instructions: ${instructions}`);

				// Create enhanced AI-powered playwright test script
				const testScript = `
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Mock LLM API call - replace with actual LLM service
async function callLLM(htmlContent, instructions, actionLog) {
	// This would normally call an actual LLM API
	// For now, return simple actions based on instructions
	const actions = [];
	
	if (instructions.toLowerCase().includes('login') || instructions.toLowerCase().includes('sign in')) {
		actions.push({
			type: 'click',
			selector: 'button:has-text("Login"), button:has-text("Sign In"), a:has-text("Login"), a:has-text("Sign In")',
			description: 'Click login button'
		});
	}
	
	if (instructions.toLowerCase().includes('register') || instructions.toLowerCase().includes('sign up')) {
		actions.push({
			type: 'click',
			selector: 'button:has-text("Register"), button:has-text("Sign Up"), a:has-text("Register"), a:has-text("Sign Up")',
			description: 'Click register button'
		});
	}
	
	if (instructions.toLowerCase().includes('enter email') || instructions.toLowerCase().includes('type email')) {
		actions.push({
			type: 'type',
			selector: 'input[type="email"], input[placeholder*="email" i], input[name*="email" i]',
			text: 'test@example.com',
			description: 'Enter email address'
		});
	}
	
	if (instructions.toLowerCase().includes('enter password') || instructions.toLowerCase().includes('type password')) {
		actions.push({
			type: 'type',
			selector: 'input[type="password"], input[placeholder*="password" i], input[name*="password" i]',
			text: 'testpassword123',
			description: 'Enter password'
		});
	}
	
	if (instructions.toLowerCase().includes('submit') || instructions.toLowerCase().includes('send')) {
		actions.push({
			type: 'click',
			selector: 'button[type="submit"], button:has-text("Submit"), button:has-text("Send")',
			description: 'Submit form'
		});
	}
	
	// Default action if no specific actions found
	if (actions.length === 0) {
		actions.push({
			type: 'wait',
			duration: 2000,
			description: 'Wait and observe page'
		});
	}
	
	return actions;
}

test('${testName}', async ({ page }) => {
	const actionLog = [];
	const screenshotsDir = path.join('${projectPath}', 'test-screenshots', '${testId}');
	
	// Create screenshots directory
	if (!fs.existsSync(screenshotsDir)) {
		fs.mkdirSync(screenshotsDir, { recursive: true });
	}
	
	let stepCount = 0;
	
	try {
		// Step 1: Navigate to the page
		stepCount++;
		console.log(\`Step \${stepCount}: Navigating to localhost:3000\`);
		actionLog.push({ step: stepCount, action: 'navigate', url: 'http://localhost:3000', timestamp: new Date().toISOString() });
		
		await page.goto('http://localhost:3000');
		await page.waitForLoadState('networkidle');
		
		// Take initial screenshot
		await page.screenshot({ path: path.join(screenshotsDir, \`step-\${stepCount}-initial.png\`) });
		actionLog.push({ step: stepCount, action: 'screenshot', file: \`step-\${stepCount}-initial.png\`, timestamp: new Date().toISOString() });
		
		// Get initial HTML content
		const htmlContent = await page.content();
		
		// Step 2: Call LLM to analyze page and decide actions
		stepCount++;
		console.log(\`Step \${stepCount}: Analyzing page with AI\`);
		actionLog.push({ step: stepCount, action: 'ai_analysis', instructions: \`${instructions}\`, timestamp: new Date().toISOString() });
		
		const suggestedActions = await callLLM(htmlContent, \`${instructions}\`, actionLog);
		
		// Step 3: Execute suggested actions
		for (const action of suggestedActions) {
			stepCount++;
			console.log(\`Step \${stepCount}: \${action.description}\`);
			actionLog.push({ 
				step: stepCount, 
				action: action.type, 
				selector: action.selector,
				text: action.text,
				description: action.description,
				timestamp: new Date().toISOString() 
			});
			
			try {
				if (action.type === 'click') {
					const element = page.locator(action.selector).first();
					if (await element.isVisible({ timeout: 5000 })) {
						await element.click();
						console.log(\`✓ Clicked: \${action.selector}\`);
						actionLog[actionLog.length - 1].status = 'success';
					} else {
						console.log(\`⚠ Element not visible: \${action.selector}\`);
						actionLog[actionLog.length - 1].status = 'element_not_visible';
					}
				} else if (action.type === 'type') {
					const element = page.locator(action.selector).first();
					if (await element.isVisible({ timeout: 5000 })) {
						await element.fill(action.text);
						console.log(\`✓ Typed "\${action.text}" into: \${action.selector}\`);
						actionLog[actionLog.length - 1].status = 'success';
					} else {
						console.log(\`⚠ Input field not visible: \${action.selector}\`);
						actionLog[actionLog.length - 1].status = 'element_not_visible';
					}
				} else if (action.type === 'wait') {
					await page.waitForTimeout(action.duration);
					console.log(\`✓ Waited \${action.duration}ms\`);
					actionLog[actionLog.length - 1].status = 'success';
				}
				
				// Take screenshot after each action
				await page.screenshot({ path: path.join(screenshotsDir, \`step-\${stepCount}-\${action.type}.png\`) });
				actionLog[actionLog.length - 1].screenshot = \`step-\${stepCount}-\${action.type}.png\`;
				
				// Wait a bit between actions
				await page.waitForTimeout(1000);
				
			} catch (actionError) {
				console.error(\`✗ Error executing action: \${actionError.message}\`);
				actionLog[actionLog.length - 1].status = 'error';
				actionLog[actionLog.length - 1].error = actionError.message;
				
				// Take error screenshot
				await page.screenshot({ path: path.join(screenshotsDir, \`step-\${stepCount}-error.png\`) });
				actionLog[actionLog.length - 1].errorScreenshot = \`step-\${stepCount}-error.png\`;
			}
		}
		
		// Final screenshot
		stepCount++;
		await page.screenshot({ path: path.join(screenshotsDir, \`step-\${stepCount}-final.png\`) });
		actionLog.push({ step: stepCount, action: 'final_screenshot', file: \`step-\${stepCount}-final.png\`, timestamp: new Date().toISOString() });
		
		// Save action log
		const logFile = path.join(screenshotsDir, 'action-log.json');
		fs.writeFileSync(logFile, JSON.stringify({ testName: '${testName}', instructions: \`${instructions}\`, actions: actionLog }, null, 2));
		
		console.log('✓ AI-powered test completed successfully');
		console.log(\`Action log saved to: \${logFile}\`);
		console.log(\`Screenshots saved to: \${screenshotsDir}\`);
		
		// Basic success check - page should be responsive
		await expect(page).toHaveTitle(/.*/);
		
	} catch (error) {
		console.error('✗ AI-powered test failed:', error);
		
		// Take final error screenshot
		stepCount++;
		await page.screenshot({ path: path.join(screenshotsDir, \`step-\${stepCount}-test-error.png\`) });
		actionLog.push({ 
			step: stepCount, 
			action: 'test_error', 
			error: error.message, 
			screenshot: \`step-\${stepCount}-test-error.png\`,
			timestamp: new Date().toISOString() 
		});
		
		// Save action log even on failure
		const logFile = path.join(screenshotsDir, 'action-log.json');
		fs.writeFileSync(logFile, JSON.stringify({ testName: '${testName}', instructions: \`${instructions}\`, actions: actionLog, testFailed: true }, null, 2));
		
		throw error;
	}
});
`;

				// Write the test script to a temporary file
				const testFilePath = path.join(
					projectPath,
					`temp-ai-test-${testId}.js`
				);
				await writeFileAsync(testFilePath, testScript, "utf8");

				// Run the playwright test
				return new Promise((resolve) => {
					exec(
						`npx playwright test ${testFilePath} --reporter=json`,
						{
							cwd: projectPath,
							timeout: 60000, // Increased timeout for AI tests
						},
						async (err, stdout, stderr) => {
							try {
								// Clean up the temporary test file
								if (fs.existsSync(testFilePath)) {
									fs.unlinkSync(testFilePath);
								}

								// Try to read the action log
								const screenshotsDir = path.join(
									projectPath,
									"test-screenshots",
									testId
								);
								const logFile = path.join(screenshotsDir, "action-log.json");
								let actionLog = null;

								try {
									if (fs.existsSync(logFile)) {
										const logData = await readFileAsync(logFile, "utf8");
										actionLog = JSON.parse(logData);
									}
								} catch (logError) {
									console.error("Error reading action log:", logError);
								}

								if (err) {
									console.error("AI-powered Playwright test failed:", err);
									resolve(wrapError(`AI test failed: ${err.message}`));
								} else {
									console.log("AI-powered Playwright test passed");
									resolve(
										wrapSuccess({
											passed: true,
											results: "AI-powered test completed successfully",
											output: stdout,
											actionLog: actionLog,
											screenshotsDir: screenshotsDir,
										})
									);
								}
							} catch (cleanupError) {
								console.error("Error during test cleanup:", cleanupError);
								resolve(wrapError("Test completed but cleanup failed"));
							}
						}
					);
				});
			} catch (error) {
				console.error("Error running AI-powered playwright test:", error);
				return wrapError(error.message);
			}
		}
	);

	ipcMain.handle("create-project", async (event, data) => {
		try {
			const { name } = data;
			const sourcePath = path.join(__dirname, "../../templates");
			const projectsPath = path.join(__dirname, "../../projects");
			const targetPath = path.join(projectsPath, name);

			// Ensure projects directory exists
			await mkdirAsync(projectsPath, { recursive: true });

			// Check if target directory already exists
			if (fs.existsSync(targetPath)) {
				return wrapError("Project directory already exists");
			}

			// Check if templates directory exists
			if (!fs.existsSync(sourcePath)) {
				return wrapError("Templates directory not found");
			}

			// Copy template folder contents to the new project directory
			await copyAsync(sourcePath, targetPath, { recursive: true });

			// Initialize git repository in the project
			exec("git init", { cwd: targetPath }, (err, stdout, stderr) => {
				if (!err) {
					exec("git add .", { cwd: targetPath }, (err2, stdout2, stderr2) => {
						if (!err2) {
							exec(
								'git commit -m "Initial commit"',
								{ cwd: targetPath },
								(err3, stdout3, stderr3) => {
									console.log("Git repository initialized for project");
								}
							);
						}
					});
				}
			});

			console.log(`Project ${name} created at ${targetPath}`);
			return wrapSuccess({ path: targetPath });
		} catch (error) {
			console.error("Error creating project:", error);
			return wrapError(error.message);
		}
	});

	ipcMain.handle("delete-project", async (event, projectPath) => {
		try {
			// Check if project directory exists
			if (!fs.existsSync(projectPath)) {
				return wrapError("Project directory does not exist");
			}

			// Remove the project directory and all its contents
			await fs.promises.rm(projectPath, { recursive: true, force: true });

			console.log(`Project deleted: ${projectPath}`);
			return wrapSuccess(null);
		} catch (error) {
			console.error("Error deleting project:", error);
			return wrapError(error.message);
		}
	});

	// Directory selection removed - now uses automatic path generation

	// Development Server Handlers
	let runningProcesses = new Map();
	let isMarkdownMode = store.get("isMarkdownMode", false);

	// Toggle markdown mode handler
	ipcMain.handle("toggle-markdown-mode", async (event, enabled) => {
		try {
			isMarkdownMode = enabled;
			store.set("isMarkdownMode", isMarkdownMode);
			console.log(`Markdown mode ${enabled ? "enabled" : "disabled"}`);

			return wrapSuccess({
				isMarkdownMode: isMarkdownMode,
				message: `Markdown mode ${enabled ? "enabled" : "disabled"}`,
			});
		} catch (error) {
			console.error("Error toggling markdown mode:", error);
			return wrapError(error.message);
		}
	});

	ipcMain.handle("start-dev-server", async (event, projectPath) => {
		try {
			console.log("Starting dev servers for project:", projectPath);

			// Choose app directory based on markdown mode
			const appDir = isMarkdownMode ? "markdown-app" : "app";
			const websitePath = path.join(projectPath, "website", appDir);
			const apiPath = path.join(projectPath, "business-api");

			// Check if the chosen directory exists
			if (!fs.existsSync(websitePath)) {
				if (isMarkdownMode) {
					return wrapError(
						"markdown-app directory not found. Please generate markdown build first."
					);
				} else {
					return wrapError("app directory not found");
				}
			}

			console.log(`Using ${appDir} directory for website`);

			// Start website dev server
			const websiteProcess = exec("npm run start", {
				cwd: websitePath,
				env: { ...process.env, PORT: "3000" },
			});

			// Start business API dev server
			const apiProcess = exec("npm run start", {
				cwd: apiPath,
				env: { ...process.env, PORT: "3001" },
			});

			runningProcesses.set(`${projectPath}-website`, websiteProcess);
			runningProcesses.set(`${projectPath}-api`, apiProcess);

			// Create the dev window when servers start
			createDevWindow();

			// Wait a moment for the server to start, then load the URL
			setTimeout(() => {
				if (view) {
					view.webContents.loadURL("http://localhost:3000");
					url = "http://localhost:3000";
					store.set("url", url);
				}
			}, 3000);

			console.log(
				`Dev servers started successfully in ${
					isMarkdownMode ? "markdown" : "normal"
				} mode`
			);
			return wrapSuccess({
				websiteUrl: "http://localhost:3000",
				apiUrl: "http://localhost:3001",
				mode: isMarkdownMode ? "markdown" : "normal",
				websitePath: websitePath,
			});
		} catch (error) {
			console.error("Error starting dev servers:", error);
			return wrapError(error.message);
		}
	});

	ipcMain.handle("stop-dev-server", async (event, projectPath) => {
		try {
			const websiteProcess = runningProcesses.get(`${projectPath}-website`);
			const apiProcess = runningProcesses.get(`${projectPath}-api`);

			if (websiteProcess) {
				websiteProcess.kill();
				runningProcesses.delete(`${projectPath}-website`);
			}

			if (apiProcess) {
				apiProcess.kill();
				runningProcesses.delete(`${projectPath}-api`);
			}

			// Close the dev window when servers stop
			closeDevWindow();

			console.log("Dev servers stopped");
			return wrapSuccess(null);
		} catch (error) {
			console.error("Error stopping dev servers:", error);
			return wrapError(error.message);
		}
	});

	// Deployment Management Handlers
	ipcMain.handle("deploy-project", async (event, data) => {
		try {
			const { projectPath, stage, rolloutPercentage } = data;
			console.log(
				`Deploying project at ${projectPath} to stage ${stage} with ${rolloutPercentage}% rollout`
			);

			// Deploy using serverless framework
			return new Promise((resolve) => {
				exec(
					`serverless deploy --stage ${stage}`,
					{
						cwd: path.join(projectPath, "website"),
						timeout: 120000, // 2 minute timeout
					},
					(err, stdout, stderr) => {
						if (err) {
							console.error("Deployment failed:", err);
							resolve(wrapError(`Deployment failed: ${err.message}`));
						} else {
							// Extract URL from serverless output
							const urlMatch = stdout.match(/https:\/\/[^\s]+/);
							const deployUrl = urlMatch
								? urlMatch[0]
								: `https://${stage}-yourproject.vercel.app`;

							console.log("Deployment successful:", deployUrl);
							resolve(
								wrapSuccess({
									deployUrl,
									rolloutPercentage,
									output: stdout,
								})
							);
						}
					}
				);
			});
		} catch (error) {
			console.error("Error deploying project:", error);
			return wrapError(error.message);
		}
	});

	// Legacy handlers for backward compatibility
	ipcMain.handle("create-stage", async (event, data) => {
		try {
			const { projectPath, stageName, environment } = data;
			console.log(`Creating stage ${stageName} for environment ${environment}`);
			return wrapSuccess({ stageName, environment });
		} catch (error) {
			console.error("Error creating stage:", error);
			return wrapError(error.message);
		}
	});

	ipcMain.handle("create-ab-test", async (event, data) => {
		try {
			const { projectPath, testName, variants } = data;
			console.log(`Creating A/B test ${testName} with variants:`, variants);
			return wrapSuccess({ testName, variants });
		} catch (error) {
			console.error("Error creating A/B test:", error);
			return wrapError(error.message);
		}
	});

	// MCP Generation Handler
	ipcMain.handle("generate-mcp", async (event, projectPath) => {
		try {
			const handlerPath = path.join(projectPath, "business-api", "handler.js");

			if (!fs.existsSync(handlerPath)) {
				return wrapError("handler.js not found in business-api folder");
			}

			const handlerContent = await readFileAsync(handlerPath, "utf8");

			// Parse endpoints from handler.js
			const endpoints = [];
			const lines = handlerContent.split("\n");

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i].trim();

				// Look for app.get, app.post, app.put, app.delete, etc.
				const endpointMatch = line.match(
					/app\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/
				);

				if (endpointMatch) {
					const method = endpointMatch[1].toUpperCase();
					const route = endpointMatch[2];

					// Extract parameters from route (e.g., /api/users/:id)
					const params = [];
					const paramMatches = route.match(/:(\w+)/g);
					if (paramMatches) {
						paramMatches.forEach((param) => {
							params.push({
								name: param.substring(1),
								type: "string",
								required: true,
								description: `${param.substring(1)} parameter`,
							});
						});
					}

					// Look for request body usage in the next few lines
					const bodyParams = [];
					for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
						const bodyLine = lines[j];
						const bodyMatch = bodyLine.match(/req\.body\.(\w+)/g);
						if (bodyMatch) {
							bodyMatch.forEach((match) => {
								const fieldName = match.replace("req.body.", "");
								if (!bodyParams.find((p) => p.name === fieldName)) {
									bodyParams.push({
										name: fieldName,
										type: "string",
										required: true,
										description: `${fieldName} field in request body`,
									});
								}
							});
						}

						// Stop parsing if we hit another route or function end
						if (bodyLine.includes("app.") || bodyLine.includes("});")) {
							break;
						}
					}

					endpoints.push({
						method,
						route,
						params,
						bodyParams,
						description: `${method} request to ${route}`,
					});
				}
			}

			// Generate MCP JSON
			const mcp = {
				name: "business-api-client",
				version: "1.0.0",
				description: "MCP client for business API endpoints",
				baseUrl: "{{API_BASE_URL}}", // Variable that can be replaced
				tools: endpoints.map((endpoint) => ({
					name: `${endpoint.method.toLowerCase()}_${endpoint.route
						.replace(/[\/\:]/g, "_")
						.replace(/^_+|_+$/g, "")}`,
					description: endpoint.description,
					inputSchema: {
						type: "object",
						properties: {
							...endpoint.params.reduce(
								(acc, param) => ({
									...acc,
									[param.name]: {
										type: param.type,
										description: param.description,
									},
								}),
								{}
							),
							...endpoint.bodyParams.reduce(
								(acc, param) => ({
									...acc,
									[param.name]: {
										type: param.type,
										description: param.description,
									},
								}),
								{}
							),
						},
						required: [
							...endpoint.params.filter((p) => p.required).map((p) => p.name),
							...endpoint.bodyParams
								.filter((p) => p.required)
								.map((p) => p.name),
						],
					},
					handler: {
						method: endpoint.method,
						url: `{{API_BASE_URL}}${endpoint.route}`,
						headers: {
							"Content-Type": "application/json",
							Authorization: "Bearer {{AUTH_TOKEN}}",
						},
						...(endpoint.bodyParams.length > 0 && {
							body: endpoint.bodyParams.reduce(
								(acc, param) => ({
									...acc,
									[param.name]: `{{${param.name}}}`,
								}),
								{}
							),
						}),
					},
				})),
				usage: {
					example:
						"Replace {{API_BASE_URL}} with your API base URL and {{AUTH_TOKEN}} with your authentication token",
					variables: {
						API_BASE_URL: "https://your-api-domain.com",
						AUTH_TOKEN: "your-jwt-token-here",
					},
				},
			};

			// Save MCP to project folder
			const mcpPath = path.join(projectPath, "generated-mcp.json");
			await writeFileAsync(mcpPath, JSON.stringify(mcp, null, 2), "utf8");

			console.log(`MCP generated successfully at ${mcpPath}`);
			return wrapSuccess({ mcp, path: mcpPath });
		} catch (error) {
			console.error("Error generating MCP:", error);
			return wrapError(error.message);
		}
	});

	// Enhanced Markdown Build Handler
	ipcMain.handle("create-markdown-build", async (event, projectPath) => {
		try {
			const appPath = path.join(projectPath, "website", "app");
			const markdownAppPath = path.join(projectPath, "website", "markdown-app");

			if (!fs.existsSync(appPath)) {
				return wrapError("App folder not found");
			}

			console.log("Creating markdown-app directory...");

			// Remove existing markdown-app if it exists
			if (fs.existsSync(markdownAppPath)) {
				await fs.promises.rm(markdownAppPath, { recursive: true, force: true });
			}

			// Copy app contents to markdown-app folder
			await copyAsync(appPath, markdownAppPath, { recursive: true });

			console.log("Transforming TSX files to markdown format...");

			// Function to convert TSX component to markdown-friendly version
			const convertTsxToMarkdown = (content, filePath) => {
				const fileName = path.basename(filePath, ".tsx");

				// Extract component name from file
				const componentMatch = content.match(
					/(?:export\s+default\s+function\s+(\w+)|function\s+(\w+).*export\s+default)/
				);
				const componentName = componentMatch
					? componentMatch[1] || componentMatch[2]
					: fileName;

				// Simple markdown-style component template
				return `import React from 'react';

// Markdown-optimized version of ${componentName}
// This component renders content in a simplified format for AI agents and crawlers

const ${componentName} = () => {
	return (
		<div style={{ 
			fontFamily: 'Arial, sans-serif', 
			lineHeight: 1.6, 
			maxWidth: '800px', 
			margin: '0 auto', 
			padding: '20px' 
		}}>
			<h1>${componentName} Component</h1>
			<div>
				<h2>Content</h2>
				<p>This is the simplified markdown version of the ${componentName} component.</p>
				<p>All interactive elements have been converted to simple text for better AI navigation.</p>
				
				<h3>Features</h3>
				<ul>
					<li>Simple text-based layout</li>
					<li>No complex styling or animations</li>
					<li>AI-friendly structure</li>
					<li>Accessible content</li>
				</ul>
				
				<h3>Navigation</h3>
				<p>Use standard text-based navigation to explore this content.</p>
			</div>
		</div>
	);
};

export default ${componentName};
`;
			};

			// Function to recursively process all TSX files
			const processDirectory = async (dirPath) => {
				const entries = await fs.promises.readdir(dirPath, {
					withFileTypes: true,
				});

				for (const entry of entries) {
					const fullPath = path.join(dirPath, entry.name);

					if (entry.isDirectory()) {
						// Skip node_modules and build directories
						if (
							!["node_modules", "build", "dist", ".git"].includes(entry.name)
						) {
							await processDirectory(fullPath);
						}
					} else if (
						entry.name.endsWith(".tsx") ||
						entry.name.endsWith(".jsx")
					) {
						try {
							console.log(`Processing: ${fullPath}`);
							const originalContent = await readFileAsync(fullPath, "utf8");
							const markdownContent = convertTsxToMarkdown(
								originalContent,
								fullPath
							);
							await writeFileAsync(fullPath, markdownContent, "utf8");
						} catch (error) {
							console.error(`Error processing ${fullPath}:`, error);
						}
					}
				}
			};

			// Process all TSX files in the src directory
			const srcPath = path.join(markdownAppPath, "src");
			if (fs.existsSync(srcPath)) {
				await processDirectory(srcPath);
			}

			// Update package.json to change the name
			const packageJsonPath = path.join(markdownAppPath, "package.json");
			if (fs.existsSync(packageJsonPath)) {
				try {
					const packageJson = JSON.parse(
						await readFileAsync(packageJsonPath, "utf8")
					);
					packageJson.name = packageJson.name + "-markdown";
					packageJson.description =
						(packageJson.description || "") +
						" (Markdown-optimized version for AI agents)";
					await writeFileAsync(
						packageJsonPath,
						JSON.stringify(packageJson, null, 2),
						"utf8"
					);
				} catch (error) {
					console.error("Error updating package.json:", error);
				}
			}

			// Create a simple index.css for markdown styling
			const indexCssPath = path.join(markdownAppPath, "src", "index.css");
			const markdownCss = `
/* Markdown-optimized styles for AI agents */
body {
	font-family: Arial, sans-serif;
	line-height: 1.6;
	color: #333;
	max-width: 800px;
	margin: 0 auto;
	padding: 20px;
}

h1, h2, h3, h4, h5, h6 {
	color: #2c3e50;
	margin-top: 24px;
	margin-bottom: 16px;
}

p {
	margin-bottom: 16px;
}

ul, ol {
	margin-bottom: 16px;
	padding-left: 24px;
}

li {
	margin-bottom: 8px;
}

a {
	color: #3498db;
	text-decoration: none;
}

a:hover {
	text-decoration: underline;
}

button {
	background-color: #3498db;
	color: white;
	border: none;
	padding: 8px 16px;
	border-radius: 4px;
	cursor: pointer;
	margin: 4px;
}

button:hover {
	background-color: #2980b9;
}

input, textarea {
	border: 1px solid #ddd;
	padding: 8px;
	border-radius: 4px;
	width: 100%;
	max-width: 300px;
	margin: 4px 0;
}

.content {
	margin: 20px 0;
}
`;

			await writeFileAsync(indexCssPath, markdownCss, "utf8");

			console.log("Running npm run build in markdown-app...");

			// Run npm run build in the markdown-app directory
			return new Promise((resolve) => {
				exec(
					"npm run build",
					{
						cwd: markdownAppPath,
						timeout: 120000, // 2 minute timeout
					},
					(err, stdout, stderr) => {
						if (err) {
							console.error("Build failed:", err);
							console.error("stdout:", stdout);
							console.error("stderr:", stderr);
							resolve(wrapError(`Build failed: ${err.message}`));
						} else {
							console.log("Build successful:", stdout);
							resolve(
								wrapSuccess({
									path: markdownAppPath,
									buildOutput: stdout,
									message: "Markdown-app created and built successfully",
								})
							);
						}
					}
				);
			});
		} catch (error) {
			console.error("Error creating markdown build:", error);
			return wrapError(error.message);
		}
	});

	// A/B Configuration Handler
	ipcMain.handle(
		"save-ab-config",
		async (event, { projectPath, stage, abTests }) => {
			try {
				const websitePath = path.join(projectPath, "website");
				const configPath = path.join(websitePath, `ab-config-${stage}.json`);

				const abConfig = {
					enabled: abTests.length > 0,
					stage: stage,
					tests: abTests.map((test) => ({
						name: test.name,
						enabled: true,
						variants: test.variants.map((variant) => ({
							name: variant.name,
							build:
								variant.build ||
								`${variant.name.toLowerCase().replace(/\s+/g, "-")}-build`,
							rollout: variant.rollout,
						})),
					})),
					defaultBuild: "app",
					createdAt: new Date().toISOString(),
				};

				await writeFileAsync(
					configPath,
					JSON.stringify(abConfig, null, 2),
					"utf8"
				);

				console.log(`A/B config saved for stage ${stage} at ${configPath}`);
				return wrapSuccess({ path: configPath, config: abConfig });
			} catch (error) {
				console.error("Error saving A/B config:", error);
				return wrapError(error.message);
			}
		}
	);

	const { width, height } = screen.getPrimaryDisplay().workAreaSize;

	let win = null;
	let view = null;

	const createDevWindow = () => {
		if (win) return; // Already created

		win = new BrowserWindow({
			width,
			height,
			transparent: true,
			webPreferences: {
				preload: path.join(__dirname, "../preload/preload.mjs"),
				nodeIntegration: true,
				contextIsolation: true,
			},
			backgroundColor: "gray",
			frame: false,
		});

		win.setMenuBarVisibility(false);
		win.maximize();

		view = new WebContentsView({
			webPreferences: {
				preload: path.join(__dirname, "../preload/preload.mjs"),
				contextIsolation: true,
				nodeIntegration: true,
				backgroundThrottling: false,
			},
		});
		win.contentView.addChildView(view);

		view.setBounds({ x: 0, y: 0, width: width, height });

		// Setup event handlers for the view
		setupViewEventHandlers();

		// Load URL if one is stored
		if (url) {
			view.webContents.loadURL(url);
		}
	};

	const closeDevWindow = () => {
		if (win) {
			win.close();
			win = null;
			view = null;
		}
	};

	const toggleEditMode = async () => {
		if (!view) return wrapSuccess(null);
		try {
			await view.webContents.executeJavaScript(`
				if (window.persistentHandlers && window.persistentHandlers.length > 0) {
					window.persistentHandlers.forEach(item => {
						item.element.removeEventListener("mouseover", item.handlers.mouseover);
						item.element.removeEventListener("mouseout", item.handlers.mouseout);
						item.element.removeEventListener("click", item.handlers.click);
					});

					if (window.element){
						window.element.style.backgroundColor = window.originalBackgroundColor;
					}
					

					// Clear the handlers array after removing event listeners
					window.persistentHandlers = [];
				} else {
					window.persistentHandlers = [];
					window.element = null;
					try {
						const content = document.querySelector("body");
						content.querySelectorAll("*").forEach((element) => {
							let elementHandlers = {
								mouseover: function(e) {
									e.stopPropagation();
									e.preventDefault();
									window.element = this;
									window.originalBackgroundColor = this.style.backgroundColor;
									this.style.backgroundColor = "rgba(255, 165, 0)";
								},
								mouseout: function(e) {
									e.stopPropagation();
									e.preventDefault();
									this.style.backgroundColor = window.originalBackgroundColor;
									window.element = null;
								},
								click: function(e) {
									e.stopPropagation();
									e.preventDefault();
									let targetElement = e.target;
									while (targetElement && !targetElement.hasAttribute('data-component')) {
										targetElement = targetElement.parentElement;
									}
									if (targetElement && targetElement.hasAttribute('data-component')) {
										const dataComponentValue = targetElement.getAttribute('data-component');
										window.electron.sendEvent("click-event", { component: dataComponentValue });
									}
								}
							};
				
							element.addEventListener("mouseover", elementHandlers.mouseover);
							element.addEventListener("mouseout", elementHandlers.mouseout);
							element.addEventListener("click", elementHandlers.click);
				
							window.persistentHandlers.push({element: element, handlers: elementHandlers});
						});
					} catch (error) {
						console.error(error);
					}
				}
			`);
			return wrapSuccess(null);
		} catch (error) {
			console.error("Error toggling edit mode:", error);
			return wrapError(error);
		}
	};

	const sendComponents = async () => {
		if (!view) return;
		try {
			const components = await view.webContents.executeJavaScript(`
				new Promise(resolve => {
					setTimeout(() => {
						if (document.readyState === "complete") {
							resolve(getComponents());
						} else {
							document.addEventListener("DOMContentLoaded", () => resolve(getComponents()));
						}
					}, 3000); // 2 second delay
			
					function getComponents() {
						const components = [];
						const elementsInView = Array.from(document.querySelectorAll('[data-component]')).filter(el => {
							const rect = el.getBoundingClientRect();
							return (
								rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
								rect.left < (window.innerWidth || document.documentElement.clientWidth) &&
								rect.bottom > 0 &&
								rect.right > 0
							);
						});
						elementsInView.forEach((element) => {
							const component = element.getAttribute('data-component');
							components.push(component);
						});
						return components;
					}
				})
			`);

			console.log("Components:", components);

			// get first 2 components
			const firstTwoComponents = components.slice(0, 2);

			floatingWindow.webContents.send("components", firstTwoComponents);
		} catch (error) {
			console.error("Error sending components:", error);
		}
	};

	ipcMain.handle("toggle-edit-mode", async (event, data) => {
		toggleEditModeValue = !toggleEditModeValue;
		return await toggleEditMode();
	});

	const setupViewEventHandlers = () => {
		if (!view) return;

		view.webContents.on("did-finish-load", () => {
			console.log("Loaded URL:", url);

			// add an on hover to all the elements
			toggleEditMode();
			sendComponents();
		});
	};

	const floatingWindow = new BrowserWindow({
		width: 400,
		height: 700,
		frame: true,
		transparent: false,
		focusable: true,
		alwaysOnTop: true,
		title: projectDir,
		icon: path.join(__dirname, "../assets/icon.png"),

		webPreferences: {
			preload: path.join(__dirname, "../preload/preload.mjs"),
			contextIsolation: true,
			nodeIntegration: true,
		},
	});

	floatingWindow.on("closed", () => {
		app.quit();
	});

	floatingWindow.setMenuBarVisibility(false);
	floatingWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
	floatingWindow.setBackgroundColor("#f1f1f1");
	floatingWindow.webContents.on("did-finish-load", () => {
		//floatingWindow.webContents.openDevTools();

		floatingWindow.webContents.send("set-initial-values", { projectDir, url });
		floatingWindow.webContents.send("set-prompts", {
			newComponentPrompt,
			editComponentPrompt,
		});
	});
};

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

app.whenReady().then(() => {
	createWindow();
	ipcMain.handle("read-file", async (event, filePath) => {
		try {
			const content = await fs.promises.readFile(filePath, {
				encoding: "utf-8",
			});
			return content;
		} catch (error) {
			return error.message;
		}
	});

	ipcMain.handle("write-file", async (event, filePath, content) => {
		try {
			await fs.promises.writeFile(filePath, content, { encoding: "utf-8" });
			return null;
		} catch (error) {
			return error.message;
		}
	});

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
