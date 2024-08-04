// For handling undo/redo
let history = [];
let currentHistoryIndex = -1;
let path = "";

const status_bar = document.getElementById("status-message");
const status_bar_icon = document.getElementById("status-icon");

function handleOperation(operation) {
	status_bar.innerText = operation;
	status_bar.style.color = "orange";

	status_bar_icon.src = `../assets/${operation}.png`;
}

function handleSuccess(operation) {
	status_bar.innerText = `${operation} successful`;
	status_bar.style.color = "green";

	status_bar_icon.src = "../assets/success.png";
}

function handleError(operation, error) {
	status_bar.innerText = `${operation} failed: ${error}`;
	status_bar.style.color = "red";

	status_bar_icon.src = "../assets/error.png";
}

async function sendEventAndHandleResponse(operation, channel, data, cb) {
	handleOperation(operation);

	// the response is always wrapped in success & data or error
	const response = await window.electron.sendEventAsync(channel, data);

	if ("success" in response) {
		// Do something
		cb && cb(response.data);
		handleSuccess(channel);
	} else {
		// display error
		console.error("Error:", response.error);
		handleError(channel, response.error);
	}
}

async function saveEdit() {
	const content = document.getElementById("code-area").value;
	console.log("Saving edit:", path, content);

	await sendEventAndHandleResponse(
		"Saving...",
		"save-edit",
		{ path, content },
		(response) => {
			// Do something
			console.log("Edit saved successfully:", path);
		}
	);
}

async function openVSCode() {
	await sendEventAndHandleResponse(
		"Opening...",
		"open-vscode-editor",
		{ path },
		(response) => {
			// Do something
			console.log("Opening VS Code:", path);
		}
	);
}

async function toggleEditMode() {
	await sendEventAndHandleResponse(
		"Toggling edit mode...",
		"toggle-edit-mode",
		null,
		(response) => {
			// Do something
			const elem = document.getElementById("edit-btn");
			elem.style.backgroundColor =
				elem.style.backgroundColor === "red" ? "green" : "red";
		}
	);
}

async function simulateSize(device) {
	await sendEventAndHandleResponse(
		"Changing size...",
		"change-size",
		{ device },
		(response) => {
			// Do something
			console.log("Size changed:", device);
		}
	);
}

async function submitProjectDir() {
	const input = document.getElementById("project-dir-input");
	const projectDir = input.value.trim(); // Get the trimmed input value

	if (projectDir) {
		await sendEventAndHandleResponse(
			"Setting project directory...",
			"set-project-dir",
			{ projectDir },
			(response) => {
				document.getElementById(
					"project-display"
				).textContent = `Project Directory: ${projectDir}`;
			}
		);
	} else {
		// Handle empty input or validation errors
		alert("Please enter a valid project directory path.");
	}
}

async function editComponent() {
	if (!path) {
		alert("Please select a component first.");
		return;
	}

	const input = document.getElementById("text-input").value;

	await sendEventAndHandleResponse(
		"Editing component...",
		"edit-code",
		{ input, path },
		(response) => {
			// Do something
			input.value = ""; // Clear the input field
		}
	);
}

async function makeNewComponent() {
	if (!path) {
		alert("Please select a component first.");
		return;
	}

	const input = document.getElementById("text-input").value;

	await sendEventAndHandleResponse(
		"Making new component...",
		"new-component",
		{ input, path },
		(response) => {
			// Do something
			input.value = ""; // Clear the input field
		}
	);
}

async function setPromptInstructions() {
	const prompt = document.getElementById("prompt-instructions");

	if (!prompt.value) {
		alert("Please enter a prompt.");
		return;
	}

	await sendEventAndHandleResponse(
		"Updating prompt...",
		"set-prompt",
		{ prompt: prompt.value },
		(response) => {
			// Do something
			console.log("Prompt set:", prompt);
		}
	);
}

function togglePromptInstructions() {
	const prompt = document.getElementById("fullscreen-edit");
	prompt.style.display = prompt.style.display === "none" ? "block" : "none";
}

async function openDevTools() {
	await sendEventAndHandleResponse(
		"Opening DevTools...",
		"open-devtools",
		null,
		(response) => {
			// Do something
			console.log("DevTools opened");
		}
	);
}

async function reloadPage() {
	await sendEventAndHandleResponse(
		"Reloading...",
		"reload-page",
		null,
		(response) => {
			// Do something
			console.log("Page reloaded");
		}
	);
}

async function loadURL() {
	const url = document.getElementById("url-input").value;

	if (url) {
		await sendEventAndHandleResponse(
			"Loading URL...",
			"load-url",
			{ url },
			(response) => {
				// Do something
				console.log("URL loaded:", url);
			}
		);
	} else {
		// Handle empty input or validation errors
		alert("Please enter a valid URL.");
	}
}

function undoAction() {
	if (currentHistoryIndex > 0) {
		currentHistoryIndex--;
		// Restore state based on new currentHistoryIndex
	}
}

function redoAction() {
	if (currentHistoryIndex < history.length - 1) {
		currentHistoryIndex++;
		// Restore state based on new currentHistoryIndex
	}
}

document.addEventListener("DOMContentLoaded", () => {
	document.getElementById("project-dir-input").addEventListener("click", () => {
		document.getElementById("project-dir-input").focus();
	});

	document.getElementById("text-input").addEventListener("click", () => {
		document.getElementById("text-input").focus();
	});

	document.getElementById("url-input").addEventListener("click", () => {
		document.getElementById("url-input").focus();
	});

	const dropdownToggle = document.querySelector(".dropdown-toggle");
	const dropdownMenu = document.querySelector(".dropdown-menu");
	const dropdownItems = document.querySelectorAll(".dropdown-item");

	dropdownToggle.addEventListener("click", function () {
		dropdownMenu.classList.toggle("show");
	});

	dropdownItems.forEach((item) => {
		item.addEventListener("click", function (e) {
			e.preventDefault();
			const selectedIcon = this.querySelector("i").cloneNode(true);
			dropdownToggle.innerHTML = "";
			dropdownToggle.appendChild(selectedIcon);
			dropdownMenu.classList.remove("show");

			const device = this.getAttribute("data-device");
			simulateSize(device);
		});
	});

	// Close the dropdown when clicking outside
	window.addEventListener("click", function (e) {
		if (!e.target.matches(".dropdown-toggle")) {
			dropdownMenu.classList.remove("show");
		}
	});

    // Set onclick handlers for all buttons
	document
		.getElementById("project-dir-submit-btn")
		.addEventListener("click", submitProjectDir);
	document
		.getElementById("open-dev-tools")
		.addEventListener("click", openDevTools);
	document
		.getElementById("toggle-fullscreen")
		.addEventListener("click", togglePromptInstructions);
	document.getElementById("reload-btn").addEventListener("click", reloadPage);
	document.getElementById("undo-btn").addEventListener("click", undoAction);
	document.getElementById("redo-btn").addEventListener("click", redoAction);
	document.getElementById("edit-btn").addEventListener("click", toggleEditMode);
	document
		.getElementById("update-btn")
		.addEventListener("click", setPromptInstructions);
	document
		.getElementById("back-btn")
		.addEventListener("click", togglePromptInstructions);
	document
		.getElementById("edit-component-btn")
		.addEventListener("click", editComponent);
	document
		.getElementById("new-component-btn")
		.addEventListener("click", makeNewComponent);
	document.getElementById("set-url-submit-btn").addEventListener("click", loadURL);

    // Electron event listeners
    window.electron.receiveEvent("component-selected", (event, data) => {
        console.log("Received component-selected:", data);
        updateComponentDisplay(data);
    });

    window.electron.receiveEvent("set-value", (event, data) => {
        console.log("Received set-value:", data);
        updateProjectDisplay(data);
    });

    window.electron.receiveEvent("status-update", (event, data) => {
        console.log("Received status:", data);
        handleOperation(data);
    });
});

function updateComponentDisplay(data) {
    if (data.exists === false || data.error) {
        console.error("Error selecting component:", data.error);
        document.getElementById("component-display").textContent = "Component: No component selected";
        return;
    }

    const name = data.path.split("\\").pop();
    path = data.path;
    document.getElementById("component-display").textContent = "Component: " + name;
}

function updateProjectDisplay(data) {
    if (data.key === "project-dir") {
        document.getElementById("project-display").textContent = `Project Directory: ${data.value}`;
    }
}