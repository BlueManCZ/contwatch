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
        if (document.getElementById("content-container").firstChild.onload) {
            document.getElementById("content-container").firstChild.onload();
        }
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

let saved_charts = []

function display_charts() {
    let charts = document.getElementsByClassName("chart");

    const d = new Date();

    for (let i = 0; i < charts.length; i++) {
        let ctx = charts[i];

        let myChart = new Chart(ctx, {
            type: "line",
            data: {
            },
            options: {
                interaction: {
                    mode: "index",
                    intersect: false
                },
                scales: {
                    x: {
                        type: "time",
                        time: {
                            unit: "hour"
                        },
                        display: false
                    },
                    y: {
                        display: false
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        // enabled: false
                    }
                },
                // aspectRatio: 8
            }
        });

        saved_charts.push(myChart);

        let url = `/api/charts?query=${ctx.dataset.query}&date_from=${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}&smartround=50`;
        console.log(url);
        let request = new XMLHttpRequest();
        request.open("GET", url);
        request.setRequestHeader("Accept", "application/json");
        request.onreadystatechange = function () {
            if (request.readyState === 4) {
                let data = JSON.parse(request.responseText);

                console.log(data);

                for (let device in data) {
                    console.log(device);

                    for (let line in data[device]) {
                        console.log(line);

                        let datasetData = [];

                        for (let j = 0; j < data[device][line]["timestamps"].length; j++) {
                            datasetData.push({
                                x: data[device][line]["timestamps"][j] * 1000,
                                y: data[device][line]["values"][j]
                            })
                        }

                        console.log(datasetData);

                        myChart.data.datasets.push({
                            label: line,
                            borderColor: "blue",
                            data: datasetData,
                            pointRadius: 0,
                            borderWidth: 1
                        });

                        myChart.update();
                    }
                }
            }};
        request.send();
    }
}

function stopPropagation(e) {
    e.stopPropagation();
}

document.getElementById("dialog-container").firstChild.addEventListener("click", stopPropagation);
