import {
	sendEventAndHandleResponse,
	handleError,
	displayPage,
} from "./utils.js";

let path = "";
let editMode = true;


async function submitProjectDir() {
	const input = document.getElementById("project-dir-input");
	const projectDir = input.value.trim(); // Get the trimmed input value

	if (projectDir) {
		await sendEventAndHandleResponse(
			"Setting project directory...",
			"set-project-dir",
			projectDir,
			(response) => {
				//document.getElementById("current-project-dir").textContent = projectDir;
				displayPage("main");
			}
		);
	} else {
		// Handle empty input or validation errors
		handleError(
			"set-project-dir",
			"Please enter a valid project directory path."
		);
	}
}


async function editComponent() {
	if (!path) {
		handleError("edit-code", "Please select a component first.");
		return;
	}

	const inputElem = document.getElementById("text-input");

	// set readonly
	inputElem.readOnly = true;


	await sendEventAndHandleResponse(
		"Editing component...",
		"edit-code",
		{ input: inputElem.value, path },
		(response) => {
			// Do something
			inputElem.value = ""; // Clear the input field
			inputElem.readOnly = false;
		}
	);
}

async function makeNewComponent() {
	if (!path) {
		handleError("new-component", "Please select a component first.");
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

async function toggleEditMode() {
	await sendEventAndHandleResponse(
		"Toggling edit mode...",
		"toggle-edit-mode",
		null,
		(response) => {
			// Do something
			
			const elem = document.getElementById("toggle-edit-mode-btn");
			editMode = !editMode;
			if (editMode) {
				document.getElementById("edit-mode-text").textContent = "Select Mode: On";
				elem.style.borderColor = "#2df071";
				elem.style.color = "#2df071";
			} else {
				document.getElementById("edit-mode-text").textContent = "Select Mode: Off";
				elem.style.borderColor = "#e94560";
				elem.style.color = "#e94560";
			}
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

function undo() {
	handleError("undo", "Not implemented");
}

function redo() {
	handleError("redo", "Not implemented");
}

document.addEventListener("DOMContentLoaded", () => {
	// Function to set up input focus
	function setupInputFocus(inputId) {
		document.getElementById(inputId).addEventListener("click", () => {
			document.getElementById(inputId).focus();
		});
	}

	setupInputFocus("project-dir-input");
	setupInputFocus("text-input");
	setupInputFocus("url-input");

	// Setup button event listeners
	document
		.getElementById("project-dir-submit-btn")
		.addEventListener("click", submitProjectDir);
	document
		.getElementById("edit-component-btn")
		.addEventListener("click", editComponent);
	document
		.getElementById("new-component-btn")
		.addEventListener("click", makeNewComponent);
	document
		.getElementById("toggle-edit-mode-btn")
		.addEventListener("click", toggleEditMode);
	document
		.getElementById("open-component-btn")
		.addEventListener("click", openVSCode);

	document.getElementById("undo-btn").addEventListener("click", undo);
	document.getElementById("redo-btn").addEventListener("click", redo);

	
	

	// Electron event listeners
	window.electron.receiveEvent("set-initial-values", (event, data) => {
		if (data.projectDir) {
			displayPage("main");
		} 
		
		if (data.url){
			document.getElementById("url-input").value = data.url;
		}

		console.log("Received set-initial-values:", data);
	});

	window.electron.receiveEvent("component-selected", (event, data) => {
		console.log("Received component-selected:", data);
		updateComponentDisplay(data);
	});

	window.electron.receiveEvent("status-update", (event, data) => {
		console.log("Received status:", data);
		handleOperation(data);
	});
});

function updateComponentDisplay(data) {
	if (data.exists === false || data.error) {
		console.error("Error selecting component:", data.error);
		document.getElementById("current-component").textContent = "None";
		return;
	}

	const name = data.path.split("\\").pop();
	path = data.path;
	document.getElementById("current-component").textContent = name;
}
