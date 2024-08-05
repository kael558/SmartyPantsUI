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
	try {

        cb && cb();
        handleSuccess(channel);
        return;

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
	} catch (error) {
		console.error("Error:", error);
		handleError(channel, error);
	}
}

function displayPage(page) {
	document.getElementById("url-input-page").style.display =
		page === "url-input" ? "flex" : "none";
	document.getElementById("main-page").style.display =
		page === "main" ? "block" : "none";
	document.getElementById("project-dir-page").style.display =
		page === "project-dir" ? "flex" : "none";
	document.getElementById("prompt-page").style.display =
		page === "prompt" ? "block" : "none";
}
