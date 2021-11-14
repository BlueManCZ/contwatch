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

let viewId = -1;

function saveOrEditChartView() {
    let data = {};

    data["view_id"] = viewId;
    data["label"] = document.getElementById("view-label").value;

    let settings = {};
    let checkboxes = document.getElementsByClassName("inspector-data-checkbox");

    for (let i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) {
            if (settings[checkboxes[i].dataset.device] === undefined) {
                settings[checkboxes[i].dataset.device] = [checkboxes[i].dataset.attribute];
            } else {
                settings[checkboxes[i].dataset.device].push(checkboxes[i].dataset.attribute);
            }
        }
    }

    data["settings"] = settings;

    const request = new XMLHttpRequest();
    request.open("POST", `/save_or_edit_chart_view`);
    request.setRequestHeader("Content-Type", "application/json");
    request.onload = () => {
        console.log(request.responseText);
        let data = JSON.parse(request.responseText);

        console.log(data);

        if (data.status) {
            viewId = data.view_id;
        } else {
            alert(data.error);
        }
    };

    console.log(viewId);
    console.log(data);

    request.send(JSON.stringify(data));
}

function deleteChartView() {
    if (viewId >= 0) {
        const request = new XMLHttpRequest();
        request.onload = () => {
            let data = JSON.parse(request.responseText);
            if (!data.status) {
                alert(data.error);
            }
        };
        request.open("POST", `/delete_chart_view/${viewId}`);
        request.send();
    } else {
        clearChartInspector();
        hideChartInspector();
    }
}

function editJsonAttributesToStore(deviceId) {
    const request = new XMLHttpRequest();
    const data = new FormData(document.getElementById("json-attributes-to-store"));
    request.onload = () => {
        hideDialog();
    };
    request.open("POST", `/edit_json_attributes_to_store/${deviceId}`);
    request.send(data);
}

function showDialog(dialogName) {
    const request = new XMLHttpRequest();
    request.open("POST", `/dialog/${dialogName}`);
    request.onload = () => {
        document.getElementById("dialog-container").firstChild.innerHTML = request.responseText;
        document.getElementById("dialog-container").classList.remove("dialog-hidden");
    };
    request.send();
}

function hideDialog() {
    document.getElementById("dialog-container").classList.add('dialog-hidden');
}

let inspectorChart = null;

function initializeInspectorChart() {
    let ctx = document.getElementById("inspector-chart");

    inspectorChart = new Chart(ctx, {
        type: "line",
        options: {
            animation: false,
            interaction: {
                mode: "nearest",
                intersect: false,
                axis: "x"
            },
            layout: {
                padding: 20
            },
            scales: {
                x: {
                    type: "time",
                    time: {
                        unit: "hour"
                    },
                    beginAtZero: true
                },
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: "x"
                    },
                    pan: {
                        enabled: true,
                        mode: "x"
                    },
                    limits: {
                        x: {min: "original", max: "original"}
                    }
                },
                tooltip: {
                    position: "nearest"
                }
            },
            pointRadius: 0,
            borderWidth: 1,
            spanGaps: 30000000,
            responsive: true,
            maintainAspectRatio: false
        }
    });

    ctx.addEventListener("mouseup", function (event) {
        console.log(event.button)
        if (event.button === 1 || event.button === 2) {
            inspectorChart.resetZoom();
        }
    })
}

function showChartInspector(currentViewId=-1, label="") {
    viewId = currentViewId;
    if (!inspectorChart) {
        initializeInspectorChart();
    }
    document.getElementById("view-label").value = label;
    document.getElementById("inspector-chart-view").classList.remove('inspector-chart-view-hidden');
}

function hideChartInspector() {
    document.getElementById("inspector-chart-view").classList.add('inspector-chart-view-hidden');
}

function clearChartInspector() {
    viewId = -1;

    if (inspectorChart) {
        inspectorChart.destroy();
        inspectorChart = null;
    }

    let checkboxes = document.getElementsByClassName("inspector-data-checkbox");

    for (let i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = false;
    }
}

let colors = ["#7233ff", "#299bec", "#65c44c", "#fd8f64", "#ffcd41"];

function addChartToInspector(device, attribute) {
    const d = new Date();
    let query;
    if (attribute) {
        query = `${device}-${attribute}`
    } else {
        query = device
    }

    console.log(query);

    let url = `/api/charts?query=${query}&date_from=${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
        let request = new XMLHttpRequest();
        request.open("GET", url);
        request.setRequestHeader("Accept", "application/json");
        request.onreadystatechange = function () {
            if (request.readyState === 4) {
                let data = JSON.parse(request.responseText);

                for (let device in data) {
                    for (let line in data[device]) {
                        let datasetData = [];

                        for (let j = 0; j < data[device][line]["timestamps"].length; j++) {
                            datasetData.push({
                                x: data[device][line]["timestamps"][j] * 1000,
                                y: data[device][line]["values"][j]
                            })
                        }
                        let dataset = {
                            device: device,
                            label: line,
                            borderColor: colors[(inspectorChart.data.datasets.length) % 5],
                            data: datasetData
                        }

                        inspectorChart.data.datasets.push(dataset);

                        document.getElementById(`${device}-${line}`).checked = true;

                        recolorCharts();
                        inspectorChart.update();
                    }
                }
            }
        };
        request.send();
}

function removeChartFromInspector(device, attribute) {
    for (let dataset in inspectorChart.data.datasets) {
        dataset = inspectorChart.data.datasets[dataset];
        console.log(`${dataset.device} === ${device} && ${dataset.label} === ${attribute}`)

        if (dataset.device === device && dataset.label === attribute) {
            console.log("True");

            let index = inspectorChart.data.datasets.indexOf(dataset);

            console.log(index);

            inspectorChart.data.datasets.splice(index, 1);

            recolorCharts();
            inspectorChart.update();
            return;
        }
    }
}

function toggleChartInInspector(device, attribute) {
    let status = document.getElementById(`${device}-${attribute}`).checked;

    if (status) {
        addChartToInspector(device, attribute);
    } else {
        removeChartFromInspector(device, attribute);
    }
}

function recolorCharts() {
    for (let id in inspectorChart.data.datasets) {
        let dataset = inspectorChart.data.datasets[id];
        dataset.borderColor = colors[id % 5];
    }
}

function setSiteConfigArgument(argument, value) {
    siteConfig[argument] = value;
}

let saved_charts = []

function displayCharts(smartround) {

    for (let i = 0; i < saved_charts.length; i++) {
        saved_charts[i].destroy();
    }

    let charts = document.getElementsByClassName("chart");

    const d = new Date();

    for (let i = 0; i < charts.length; i++) {
        let ctx = charts[i];

        let myChart = new Chart(ctx, {
            type: "line",
            data: {
            },
            options: {
                animation: false,
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
                        display: false,
                        beginAtZero: true
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
                        position: "nearest"
                    }
                },
                pointRadius: 0,
                borderWidth: 2,
                spanGaps: 30000000,
                responsive: true,
                maintainAspectRatio: false
                // aspectRatio: 8
            }
        });

        saved_charts.push(myChart);

        if (ctx.dataset.query.slice(-1) === ",") {
            ctx.dataset.query = ctx.dataset.query.slice(0, -1);
        }

        let url = `/api/charts?query=${ctx.dataset.query}&date_from=${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}&smartround=${smartround}`;
        let request = new XMLHttpRequest();
        request.open("GET", url);
        request.setRequestHeader("Accept", "application/json");
        request.onreadystatechange = function () {
            if (request.readyState === 4) {
                let data = JSON.parse(request.responseText);

                let colors = ["#7233ff", "#299bec", "#65c44c", "#fd8f64", "#ffcd41"];
                let colorIndex = 0

                for (let device in data) {
                    for (let line in data[device]) {
                        let datasetData = [];

                        for (let j = 0; j < data[device][line]["timestamps"].length; j++) {
                            datasetData.push({
                                x: data[device][line]["timestamps"][j] * 1000,
                                y: data[device][line]["values"][j]
                            })
                        }

                        myChart.data.datasets.push({
                            label: line,
                            borderColor: colors[colorIndex],
                            data: datasetData
                        });

                        myChart.update();

                        colorIndex = (colorIndex + 1) % 5;
                    }
                }
            }
        };
        request.send();
    }
}

function stopPropagation(e) {
    e.stopPropagation();
}

document.getElementById("dialog-container").firstChild.addEventListener("click", stopPropagation);
