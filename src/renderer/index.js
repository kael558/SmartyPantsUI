// For handling undo/redo
let history = [];
let currentHistoryIndex = -1;
let path = '';

const status_bar = document.getElementById('status-message');
const status_bar_icon = document.getElementById('status-icon');

function handleOperation(operation) {
    status_bar.innerText = operation;
    status_bar.style.color = 'orange';

    status_bar_icon.src = `../assets/${operation}.png`;
}

function handleSuccess(operation) {
    status_bar.innerText = `${operation} successful`;
    status_bar.style.color = 'green';

    status_bar_icon.src = '../assets/success.png';
}

function handleError(operation, error) {
    status_bar.innerText = `${operation} failed: ${error}`;
    status_bar.style.color = 'red';

    status_bar_icon.src = '../assets/error.png';
}
    

async function sendEventAndHandleResponse(operation, channel, data, cb) {
    handleOperation(operation);

    // the response is always wrapped in success & data or error
    const response = await window.electron.sendEvent(channel, data);

    if ('success' in response) {
        // Do something
        cb && cb(response.data);
        handleSuccess(channel);
    } else {
        // display error
        console.error('Error:', response.error);
        handleError(channel, response.error);
    }
}

async function saveEdit(){
    const content = document.getElementById('code-area').value;
    console.log('Saving edit:', path, content);

    await sendEventAndHandleResponse("Saving...", 'save-edit', {path, content}, (response) => {
        // Do something
        console.log('Edit saved successfully:', path);
    });
}

async function openVSCode() {
    await sendEventAndHandleResponse("Opening...", 'open-vscode-editor', { path }, (response) => {
        // Do something
        console.log('Opening VS Code:', path);
    });
}

async function toggleEditMode() {
    await sendEventAndHandleResponse("Toggling edit mode...", 'toggle-edit-mode', null, (response) => {
        // Do something
        const elem = document.getElementById('edit-btn');
        elem.style.backgroundColor = elem.style.backgroundColor === 'red' ? 'green' : 'red';
    });
}

async function simulateSize(device){
    await sendEventAndHandleResponse("Changing size...", 'change-size', { device }, (response) => {
        // Do something
        console.log('Size changed:', device);
    });
}

async function submitProjectDir() {
    const input = document.getElementById('project-dir-input');
    const projectDir = input.value.trim();  // Get the trimmed input value

    if (projectDir) {
        await sendEventAndHandleResponse("Setting project directory...", 'set-project-dir', { projectDir }, (response) => {
            document.getElementById('project-display').textContent = `Project Directory: ${projectDir}`;
        });
    } else {
        // Handle empty input or validation errors
        alert("Please enter a valid project directory path.");
    }
}

async function editComponent(){
    if (!path) {
        alert('Please select a component first.');
        return;
    }

    const input = document.getElementById('text-input').value;

    await sendEventAndHandleResponse("Editing component...", 'edit-code', { input, path }, (response) => {
        // Do something 
        input.value = '';  // Clear the input field
    });

}

async function makeNewComponent() {
    if (!path) {
        alert('Please select a component first.');
        return;
    }

    const input = document.getElementById('text-input').value;

    await sendEventAndHandleResponse("Making new component...", 'new-component', {  input, path }, (response) => {
        // Do something 
        input.value = '';  // Clear the input field
    });
}

function toggleFloatingWindow() {
    const elem = document.getElementById('floating-window');
    elem.style.display = elem.style.display === 'none' ? 'block' : 'none';
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

document.addEventListener('DOMContentLoaded', () => {
    window.electron.receiveEvent('component-selected', (event, data) => {
        console.log('Received component-selected:', data);

        if (data.exists === false || data.error) {
            console.error('Error selecting component:', data);
            document.getElementById('component-display').textContent = 'Component: No component selected';
            document.getElementById('toggle-code-btn').style.display = 'none';
            document.getElementById('code-area').style.display = 'none';
            return;
        }

        const name = data.path.split('\\').pop();
        const content = data.content || 'No content';
        path = data.path;

        document.getElementById('component-display').textContent = 'Component: ' + name;
        document.getElementById('toggle-code-btn').style.display = 'block';
        document.getElementById('code-area').style.display = 'block';
        document.getElementById('code-area').textContent = content;
    });

    window.electron.receiveEvent('set-value', (event, data) => {
        console.log('Received set-value:', data);

        if (data.key === "project-dir") {
            document.getElementById('project-display').textContent = `Project Directory: ${data.value}`;
        }
    });

    window.electron.receiveEvent('status-update', (event, data) => {
        console.log('Received status:', data);
        handleOperation(data);
    });

    document.getElementById('project-dir-input').addEventListener('click', () => {
        document.getElementById('project-dir-input').focus();
    });

    document.getElementById('text-input').addEventListener('click', () => {
        document.getElementById('text-input').focus();
    });
});
