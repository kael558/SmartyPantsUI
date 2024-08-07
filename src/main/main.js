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
	};

	ipcMain.handle("edit-code", async (event, data) => {
		try {
			const requested_change = data.input;
			const filepath = data.path;
			const csspath = data.path.replace(".tsx", ".css").replace(".jsx", ".css");

			await makeEdits(requested_change, filepath, csspath);
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

	// Listen for events from development view
	ipcMain.on("click-event", async (event, data) => {
		console.log("Component selected:", data.component);

		if (!projectDir) {
			console.error("Project directory not set");
			event.reply("component-selected", { error: "Project directory not set" });
			return;
		}

		// Use fs to locate the file
		const filePath = data.component;

		// Check if the file exists
		try {
			// Check if the file exists
			await statAsync(filePath);
			console.log("File exists:", filePath);

			// Read the file content
			const data = await readFileAsync(filePath, "utf8");
			console.log("Filepath:", filePath);

			// Send back that the file exists, its path, and its content
			floatingWindow.webContents.send("component-selected", {
				exists: true,
				path: filePath,
				content: data,
			});
		} catch (err) {
			console.error("Error accessing file:", err);

			floatingWindow.webContents.send("component-selected", {
				exists: false,
				path: filePath,
				error: err.message,
			});
		}
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
		view.webContents.openDevTools();
		return wrapSuccess(null);
	});

	ipcMain.handle("load-url", (event, data) => {
		try {
			view.webContents.loadURL(data.url);
			url = data.url;
			store.set("url", url);
			return wrapSuccess(null);
		} catch (error) {
			return wrapError(error);
		}
	});

	ipcMain.handle("reload-page", (event, data) => {
		view.webContents.reload();
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

	const { width, height } = screen.getPrimaryDisplay().workAreaSize;

	const win = new BrowserWindow({
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

	const view = new WebContentsView({
		webPreferences: {
			preload: path.join(__dirname, "../preload/preload.mjs"),
			contextIsolation: true,
			nodeIntegration: true,
			backgroundThrottling: false,
		},
	});
	win.contentView.addChildView(view);

	if (url) {
		view.webContents.loadURL(url);
	}

	view.setBounds({ x: 0, y: 0, width: width, height });

	const toggleEditMode = async () => {
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

	ipcMain.handle("toggle-edit-mode", async (event, data) => {
		return await toggleEditMode();
	});

	view.webContents.on("did-finish-load", () => {
		// add an on hover to all the elements
		toggleEditMode();
	});

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
		floatingWindow.webContents.openDevTools();

		floatingWindow.webContents.send("set-initial-values", { projectDir, url });
		floatingWindow.webContents.send("set-prompts", {
			newComponentPrompt,
			editComponentPrompt,
		});
		// send event to renderer
		/*if (projectDir) {
			floatingWindow.setTitle(
				`${projectDir.substr(projectDir.lastIndexOf("\\") + 1)}`
			);
		}*/
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
