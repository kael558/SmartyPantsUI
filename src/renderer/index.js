let path = "";

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
		handleError("set-project-dir", "Please enter a valid project directory path.");
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

async function editComponent() {
	if (!path) {
		handleError("edit-code", "Please select a component first.");
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
			const elem = document.getElementById("edit-btn");
			elem.style.backgroundColor =
				elem.style.backgroundColor === "red" ? "green" : "red";
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
    document.getElementById("project-dir-submit-btn").addEventListener("click", submitProjectDir);
    document.getElementById("edit-component-btn").addEventListener("click", editComponent);
    document.getElementById("new-component-btn").addEventListener("click", makeNewComponent);
    document.getElementById("toggle-edit-mode-btn").addEventListener("click", toggleEditMode);

    // Electron event listeners
    /*window.electron.receiveEvent("component-selected", (event, data) => {
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
    });*/
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