let siteConfig = {};

let socket = io();

socket.on('content-change-notification', function(data) {
    if (currentPage === data) {
        displayPage(data);
    }
});

let currentPage = "";

function displayPage(pageName) {
    currentPage = pageName;

    let buttons = document.getElementsByClassName("nav-item");
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('active');
    }
    document.getElementById('menu-item-' + pageName).classList.add('active');

    const request = new XMLHttpRequest();
    request.open('POST', `/${pageName}`);
    request.setRequestHeader("Content-Type", "application/json");
    request.onload = () => {
        document.getElementById("content-container").innerHTML = request.responseText;
        window.history.replaceState(pageName, pageName, `/${pageName}`);
    };
    request.send(JSON.stringify(siteConfig));
}

function addDevice() {
    const request = new XMLHttpRequest();
    const data = new FormData(document.getElementById('add_device_form'));
    request.onload = () => {
        hideDialog();
    };
    request.open('POST', '/add_new_device');
    request.send(data)
}

function editDevice(deviceId) {
    const request = new XMLHttpRequest();
    const data = new FormData(document.getElementById('edit_device_form'));
    request.onload = () => {
        hideDialog();
    };
    request.open('POST', `/edit_device/${deviceId}`);
    request.send(data)
}

function deleteDevice(deviceId) {
    const request = new XMLHttpRequest();
    request.onload = () => {
        hideDialog();
    };
    request.open('POST', `/delete_device/${deviceId}`);
    request.send();
}

function editJsonAttributesToStore(deviceId) {
    const request = new XMLHttpRequest();
    const data = new FormData(document.getElementById('json_attributes_to_store'));
    request.onload = () => {
        hideDialog();
    };
    request.open('POST', `/edit_json_attributes_to_store/${deviceId}`);
    request.send(data);
}

function showDialog(dialogName) {
    const request = new XMLHttpRequest();
    request.open('POST', `/dialog/${dialogName}`);
    request.onload = () => {
        document.getElementById("dialog-container").firstChild.innerHTML = request.responseText;
        document.getElementById("dialog-container").classList.remove('dialog-hidden');
    };
    request.send();
}

function hideDialog() {
    document.getElementById("dialog-container").classList.add('dialog-hidden');
}

function setSiteConfigArgument(argument, value) {
    siteConfig[argument] = value;
}

function stopPropagation(e) {
    e.stopPropagation();
}

document.getElementById("dialog-container").firstChild.addEventListener("click", stopPropagation);
