import { sendEventAndHandleResponse, displayPage } from "./utils.js";

// Edit dropdown options
function undoAction() {
	console.log("undo");
}

function redoAction() {
	console.log("redo");
}


// Layout dropdown options
async function handleDeviceSelection(device) {
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



// Options dropdown options
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





async function setPromptInstructionsForEdit() {
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


async function reloadPage() {
    handleError("reload-page", "Not implemented");
	/*await sendEventAndHandleResponse(
		"Reloading...",
		"reload-page",
		null,
		(response) => {
			// Do something
			console.log("Page reloaded");
		}
	);*/
}



document.addEventListener("DOMContentLoaded", () => {
	function setupDropdown(dropdownId) {
		const dropdown = document.getElementById(dropdownId);
		const dropdownBtns = dropdown.querySelectorAll(".toolbar-btn");
		const dropdownContent = dropdown.querySelector(".dropdown-content");

        // Show the dropdown content when clicking the button
        dropdownBtns.forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                dropdownContent.style.display = dropdownContent.style.display === "block" ? "none" : "block";
            });
        });


		// Close the dropdown when clicking outside
		window.addEventListener("click", (e) => {
			if (!dropdown.contains(e.target)) {
				dropdownContent.style.display = "none";
			}
		});
	}

	setupDropdown("edit-dropdown"); // undo, redo
	setupDropdown("layout-dropdown"); // device selection
	setupDropdown("options-dropdown"); // devtools, reload, url input

	// Setup device selection handlers
	document
		.querySelectorAll("#layout-dropdown .dropdown-content a")
		.forEach((item) => {
			item.addEventListener("click", (e) => {
				e.preventDefault();
				const device = e.target.getAttribute("data-device");
				if (device) {
					handleDeviceSelection(device);
				} else if (e.target.id === "rotate-btn") {
					// Implement rotation logic here
					console.log("Rotate device");
				}
			});
		});

    // Setup undo/redo handlers
    document.querySelectorAll("#edit-dropdown .dropdown-content a").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            if (e.target.id === "undo-btn") {
                undoAction();
            } else if (e.target.id === "redo-btn") {
                redoAction();
            }
        });
    });

    // Setup options handlers
    document.querySelectorAll("#options-dropdown .dropdown-content a").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            if (e.target.id === "open-dev-tools") {
                openDevTools();
            } else if (e.target.id === "open-prompt-page") {
                displayPage("prompt");
            } else if (e.target.id === "enter-url") {
                displayPage("url-input");
            } else if (e.target.id === "reload-btn") {
                reloadPage();
            } else if (e.target.id === "set-project-dir") {
                displayPage("project-dir");
            }
        });
    });

    // Setup URL input handlers
    document.getElementById("submit-url-btn").addEventListener("click", loadURL);


	// Set up back buttons
    document.querySelectorAll(".back-to-main-btn").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            displayPage("main");
        });
    });
});
