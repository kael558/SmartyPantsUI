const {
	app,
	BrowserWindow,
	ipcMain,
	WebContentsView,
	screen,
} = require("electron");
const path = require("node:path");
const fs = require("fs");

let projectDir = ""; // Variable to store the project directory path
let translatedX = 0;
let translatedY = 0;

const createWindow = () => {
	const { width, height } = screen.getPrimaryDisplay().workAreaSize;

	const win = new BrowserWindow({
		width,
		height,
		transparent: true,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: true,
			contextIsolation: true,
		},
		backgroundColor: "gray",
	});

	win.maximize();

	const view = new WebContentsView({
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			backgroundThrottling: false,
		},
	});
	win.contentView.addChildView(view);
	view.webContents.loadURL("http://localhost:3000");
	view.setBounds({ x: 0, y: 0, width: width, height });

    const toggleEditMode = () => {
        view.webContents.executeJavaScript(`
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
    };


	view.webContents.on("did-finish-load", () => {
		// add an on hover to all the elements
        toggleEditMode();
	});

	/*const floatingWindow = new BrowserWindow({
        width: 300,
        height: 400,
        frame: true,
        transparent: false,
        focusable: true,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    floatingWindow.loadFile(path.join(__dirname, "index.html"));
    floatingWindow.setBackgroundColor("#f1f1f1");*/

	const floatingView = new WebContentsView({
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});
	floatingView.webContents.setIgn;
	win.contentView.addChildView(floatingView);
	floatingView.setBounds({
		x: 0,
		y: 0,
		width: width,
		height: height,
	});
	floatingView.webContents.loadFile(path.join(__dirname, "index.html"));
	floatingView.setBackgroundColor("#00000000");

	floatingView.webContents.on("did-finish-load", () => {
		floatingView.webContents.openDevTools();

		// send event to renderer

		floatingView.webContents.executeJavaScript(`
            document.addEventListener('mousemove', function(event) {
                const target = event.target;
                const style = window.getComputedStyle(target);
                const isTransparent = style.opacity === '0' || style.backgroundColor === 'rgba(0, 0, 0, 0)';
        
                if (isTransparent) {
                    const {clientX, clientY} = event;
                    window.electron.sendEvent('forward-event', {type: 'mousemove', x: clientX, y: clientY});
                } else {
                    return;
                }
            });
        
            document.addEventListener('click', function(event) {
                console.log("CLICKED");
                const target = event.target;
                const style = window.getComputedStyle(target);
                const isTransparent = style.opacity === '0' || style.backgroundColor === 'rgba(0, 0, 0, 0)';
        
                if (isTransparent) {
                    window.electron.sendEvent('forward-event', {type: 'click', x: event.clientX, y: event.clientY});
                } else {
                 return;
                }
            });
        `);
	});

	view.webContents.debugger.attach("1.3");

	ipcMain.on("change-size", (event, data) => {
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

		translatedX = x;
		translatedY = y;

		view.setBounds({ x: 0, y: 0, width: viewWidth, height: viewHeight });
	});

	// In the main process or appropriate preload script
	ipcMain.on("forward-event", (event, data) => {
		if (data.type === "mousemove") {
			view.webContents.sendInputEvent({
				type: "mouseMove",
				x: data.x,
				y: data.y,
			});
		} else if (data.type === "click") {
			view.webContents.debugger.sendCommand("Input.dispatchMouseEvent", {
				type: "mousePressed",
				x: data.x,
				y: data.y,
				button: "left",
				clickCount: 1,
			});

			setTimeout(() => {
				view.webContents.debugger.sendCommand("Input.dispatchMouseEvent", {
					type: "mouseReleased",
					x: data.x,
					y: data.y,
					button: "left",
					clickCount: 1,
				});
			}, 100);
		}
	});

    ipcMain.on("save-edit", (event, data) => {
        const { path, content } = data;
        fs.writeFile(path, content, 
            (err) => {
                if (err) {
                    console.error("Error writing file:", err);
                } else {
                    console.log("File saved successfully:", path);
                }
            }
        );
    });





    ipcMain.on("toggle-edit-mode", (event, data) => {
        toggleEditMode();
    });

	// Listen for
	ipcMain.on("click-event", (event, data) => {
		if (!projectDir) {
			console.error("Project directory not set");
			event.reply("component-selected", { error: "Project directory not set" });
			return;
		}

		// Use fs to locate the file
		const filePath = path.join(projectDir, data.component);

		// Check if the file exists
		fs.stat(filePath, (err, stats) => {
			if (err) {
				// Handle errors (e.g., file does not exist)
				console.error("File does not exist:", err);

				floatingView.webContents.send("component-selected", {
					exists: false,
					path: filePath,
					error: err.message,
				});
			} else {
				console.log("File exists:", filePath);
				// File exists, now read the file content
				fs.readFile(filePath, "utf8", (err, data) => {
					if (err) {
						console.error("Error reading file:", err);
						floatingView.webContents.send("component-selected", {
							exists: true,
							path: filePath,
							error: err.message,
						});
					} else {

                        console.log("Filepath:", filePath);

						// Send back that the file exists, its path, and its content
						floatingView.webContents.send("component-selected", {
							exists: true,
							path: filePath,
							content: data,
						});
					}
				});
			}
		});
	});

	ipcMain.on("set-project-dir", (event, path) => {
		console.log("Project directory set to:", projectDir);

		projectDir = path; // Set the project directory
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
