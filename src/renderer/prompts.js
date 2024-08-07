import { sendEventAndHandleResponse, displayPage, handleError } from "./utils.js";

let currentPrompt = "new-prompt"; // Default to new-prompt, otherwise edit-prompt

function showEditPrompt(){
    if (currentPrompt === "edit-prompt") return;
    currentPrompt = "edit-prompt";
    document.getElementById("new-component-prompt-instructions").style.display = "none";
    document.getElementById("edit-component-prompt-instructions").style.display = "block";
    document.getElementById("edit-component-tab").classList.add("active");
    document.getElementById("new-component-tab").classList.remove("active");
}

function showNewPrompt(){
    if (currentPrompt === "new-prompt") return;
    currentPrompt = "new-prompt";
    document.getElementById("edit-component-prompt-instructions").style.display = "none";
    document.getElementById("new-component-prompt-instructions").style.display = "block";
    document.getElementById("new-component-tab").classList.add("active");
    document.getElementById("edit-component-tab").classList.remove("active");
}


async function setPromptInstructions() {
    const prompt =  document.getElementById(currentPrompt === "new-prompt" ? "new-component-prompt-instructions" : "edit-component-prompt-instructions").value;

	if (!prompt) {
		handleError("set-prompt", "Please enter prompt instructions.");
		return;
	}

	await sendEventAndHandleResponse(
		"Setting prompt instructions...",
		"set-prompt",
		{ prompt, type: currentPrompt },
		(response) => {
			// Do something
			console.log("Prompt instructions set successfully");
		}
	);
}

document.addEventListener("DOMContentLoaded", () => {
	// Setup prompt buttons
	document
		.getElementById("new-component-tab")
		.addEventListener("click", showNewPrompt);

	document
		.getElementById("edit-component-tab")
		.addEventListener("click", showEditPrompt);

    document.getElementById("set-prompt-btn").addEventListener("click", setPromptInstructions);

    // Setup up electron event listeners
    window.electron.receiveEvent("set-prompts", (event, data) => {
         if (data.newComponentPrompt) {
            document.getElementById("new-component-prompt-instructions").value = data.newComponentPrompt;
        } 
        
        if (data.editComponentPrompt) {
            document.getElementById("edit-component-prompt-instructions").value = data.editComponentPrompt;
        } 

        console.log("Received set-prompt-values:", data);
    });
});
