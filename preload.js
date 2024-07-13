const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
	readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
	writeFile: (filePath, content) =>
		ipcRenderer.invoke("write-file", filePath, content),
	sendEvent: (channel, data) => {
		ipcRenderer.send(channel, data);
	},
    receiveEvent: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(event, ...args));
    }
});
