export const options = {
    pointRadius: 0,
    borderWidth: 1,
    responsive: true,
    animation: false,
    maintainAspectRatio: false,
    interaction: {
        mode: "nearest",
        intersect: false,
        axis: "xy",
    },
    scales: {
        x: {
            type: "time",
            time: {
                unit: "hour",
            },
            beginAtZero: true,
        },
        y: {
            beginAtZero: true,
            stack: "main",
        },
    },
    plugins: {
        zoom: {
            zoom: {
                wheel: {
                    enabled: true,
                },
                pinch: {
                    enabled: true,
                },
                mode: "x",
            },
            pan: {
                enabled: true,
                mode: "x",
            },
            limits: {
                x: {
                    min: "original",
                    max: "original",
                },
            },
        },
    },
};
