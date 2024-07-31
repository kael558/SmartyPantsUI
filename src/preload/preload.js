const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
	readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
	writeFile: (filePath, content) => ipcRenderer.invoke("write-file", filePath, content),

	sendEvent: (channel, data) => {
		// Sends an async event from renderer to main and waits for a response to say it was successful
		ipcRenderer.invoke(channel, data);
	},

	receiveEvent: (channel, func) => {
		// Receives an event from main to renderer
		ipcRenderer.on(channel, (event, ...args) => func(event, ...args));
	},
});
