document.addEventListener('DOMContentLoaded', () => {
    const elem = document.getElementById('floating-window');
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    const dragMouseDown = e => {
        e = e || window.event;
        e.preventDefault();
        // Get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // Call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    };

    const elementDrag = e => {
        e = e || window.event;
        e.preventDefault();
        // Calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // Set the element's new position:
        elem.style.top = (elem.offsetTop - pos2) + "px";
        elem.style.left = (elem.offsetLeft - pos1) + "px";
    };

    const closeDragElement = () => {
        // Stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    };

    if (elem) {
        elem.onmousedown = dragMouseDown;
    }
});
