import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
	readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
	writeFile: (filePath, content) =>
		ipcRenderer.invoke("write-file", filePath, content),

	sendEvent: (channel, data) => {
		// Change this to use send for one-way communication
		ipcRenderer.send(channel, data);
	},

	sendEventAsync: (channel, data) => {
		// Sends an async event from renderer to main and waits for a response to say it was successful
		return ipcRenderer.invoke(channel, data);
	},

	receiveEvent: (channel, func) => {
		// Receives an event from main to renderer
		ipcRenderer.on(channel, (event, ...args) => func(event, ...args));
	},
});

contextBridge.exposeInMainWorld("electronAPI", {
	// Project Management
	invoke: (channel, data) => ipcRenderer.invoke(channel, data),

	// Specific project methods for better type safety
	loadProjects: () => ipcRenderer.invoke("load-projects"),
	saveProjects: (projects) => ipcRenderer.invoke("save-projects", projects),
	createProject: (data) => ipcRenderer.invoke("create-project", data),
	selectDirectory: () => ipcRenderer.invoke("select-directory"),

	// Development Server
	startDevServer: (projectPath) =>
		ipcRenderer.invoke("start-dev-server", projectPath),
	stopDevServer: (projectPath) =>
		ipcRenderer.invoke("stop-dev-server", projectPath),

	// Deployment
	createStage: (data) => ipcRenderer.invoke("create-stage", data),
	createABTest: (data) => ipcRenderer.invoke("create-ab-test", data),
	deployProject: (data) => ipcRenderer.invoke("deploy-project", data),

	// Event listeners for main to renderer communication
	on: (channel, callback) => {
		ipcRenderer.on(channel, callback);
	},

	removeAllListeners: (channel) => {
		ipcRenderer.removeAllListeners(channel);
	},
});
