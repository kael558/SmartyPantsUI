// For handling undo/redo
let history = [];
let currentHistoryIndex = -1;
let path = '';

function saveEdit(){
    const content = document.getElementById('code-area').value;
    console.log('Saving edit:', path, content);

    window.electron.sendEvent('save-edit', {path, content });
}

function toggleCodeEditor() {
    const elem = document.getElementById('code-editor');
    elem.style.display = elem.style.display === 'none' ? 'block' : 'none';
}

function toggleEditMode() {
    const elem = document.getElementById('edit-btn');
    elem.style.backgroundColor = elem.style.backgroundColor === 'red' ? 'green' : 'red';
    window.electron.sendEvent('toggle-edit-mode');
}

function simulateSize(device){
    console.log('Changing size renderer:', device);
    window.electron.sendEvent('change-size', { device });
}


function submitProjectDir() {
    const input = document.getElementById('project-dir-input');
    const projectDir = input.value.trim();  // Get the trimmed input value

    if (projectDir) {
        // Update the UI to show the selected project directory
        document.getElementById('project-display').textContent = `Project Directory: ${projectDir}`;

        // Optional: Send the project directory to the main process if needed
        window.electron.sendEvent('set-project-dir', projectDir);
    } else {
        // Handle empty input or validation errors
        alert("Please enter a valid project directory path.");
    }
}


function sendInput(operation) {
    if (!path) {
        alert('Please select a component first.');
        return;
    }

    const input = document.getElementById('text-input').value;
    document.getElementById('text-input').value = '';  // Clear the input field

    console.log('Sending input:', operation, input, path);

    window.electron.sendEvent('input-event', { operation, input, path });
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

function publishEdit() {
    console.log('Publishing edit:', path);
    window.electron.sendEvent('publish', {path });
}

document.addEventListener('DOMContentLoaded', () => {
    window.electron.receiveEvent('component-selected', (event, data) => {
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


    window.electron.receiveEvent('components', (event, data) => {
        console.log('Received components:', data);
        const nameListContainer = document.getElementById('name-list');
        nameListContainer.innerHTML = ''; // Clear existing buttons

        data.forEach(item => {
            const button = document.createElement('button');
            button.textContent = item.name;
            button.className = 'name-btn';
            button.onclick = function() {
                console.log('Selected component:', item.path);
                window.electron.sendEvent('select-component', {path: item.path });
            };
            nameListContainer.appendChild(button);
        });
    });




    document.getElementById('project-dir-input').addEventListener('click', () => {
        document.getElementById('project-dir-input').focus();
    });

    document.getElementById('text-input').addEventListener('click', () => {
        document.getElementById('text-input').focus();
    });
});
