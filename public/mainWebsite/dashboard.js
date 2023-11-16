
//for flippings cards
function toggleFlip(card) {
    card.classList.toggle('flipped');
}

function toggleCards() {
    const flipCards = document.querySelectorAll('.flip-card');
    const toggleSwitch = document.getElementById('toggle-switch');

    flipCards.forEach(card => {
        if (toggleSwitch.checked) {
            card.classList.add('flipped');
        } else {
            card.classList.remove('flipped');
        }
    });
}

// Add an event listener for each flip card to detect clicks
document.querySelectorAll('.flip-card').forEach(card => {
    card.addEventListener('click', () => toggleFlip(card));

    // Add an event listener for each front content div to allow clicks even when the card is not flipped
    const frontContent = card.querySelector('.flip-card-front .front-content');
    frontContent.addEventListener('click', () => {
        // Toggle the flipped class when clicking on the front content
        toggleFlip(card);
        console.log('Front content clicked');
    });

    // Add an event listener for each back content div to allow clicks and prevent propagation
    const backContent = card.querySelector('.flip-card-back .back-content');
    backContent.addEventListener('click', () => {
        // Toggle the flipped class when clicking on the back content, regardless of the toggle switch state
        toggleFlip(card);
        console.log('Back content clicked');
    });
});

async function fetchAndCreateLineChart(type, chartConfig, endpoint, statusElementId, timeElementId) {
    try {
        const canvas = document.getElementById(chartConfig.canvasId);

        // Fetch data from your server endpoint
        const response = await fetch(`/api/${endpoint}`);
        const data = await response.json();

        console.log(data);

        // Use the fetched data for your chart
        const timestamps = data[chartConfig.dataKey].map(entry => new Date(entry[chartConfig.timestampKey]));
        const chartValues = data[chartConfig.dataKey].map(entry => entry[chartConfig.valueKey]);

        // Update status and time based on the latest data
        let latestValue;

        if (type === 'door') {
            latestValue = chartValues.length > 0 ? (chartValues[0] === 1 ? 'Open' : 'Closed') : 'Unknown';
        } else if (type === 'vibrations') {
            latestValue = chartValues.length > 0 ? (chartValues[0] >= 60 ? 'Danger' : 'Normal') : 'Unkown';
        }
        const latestTimestamp = timestamps.length > 0 ? timestamps[0].toLocaleString() : 'Unknown';

        document.getElementById(statusElementId).innerText = `Status: ${latestValue}`;
        document.getElementById(timeElementId).innerText = `Last: ${latestTimestamp}`;

        // Create a new chart on the canvas
        const ctx = canvas.getContext('2d');

        // Create the line chart
        window[chartConfig.chartInstance] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timestamps,
                datasets: [{
                    label: chartConfig.label,
                    borderColor: chartConfig.borderColor,
                    data: chartValues,
                    fill: false,
                    cubicInterpolationMode: 'monotone' // Use 'monotone' for a smooth curve
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'hour',
                            displayFormats: {
                                hour: 'yyyy-MM-dd HH:mm'
                            }
                        }
                    },
                    y: {
                        ticks: {
                            stepSize: chartConfig.yStepSize,
                            callback: chartConfig.yCallback
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });

    } catch (error) {
        console.error(`Error fetching and creating line chart for ${chartConfig.label}:`, error);
    }
}

// Door section
const doorChartConfig = {
    canvasId: 'doorGraphCanvas',
    chartInstance: 'doorStateChart',
    dataKey: 'doorStates',
    timestampKey: 'doorTimestamp',
    valueKey: 'doorState',
    label: 'Door State',
    borderColor: 'rgb(75, 192, 192)',
    yStepSize: 1,
    stepped: 'middle',
    yCallback: value => (value === 0 ? 'Closed' : 'Open')
};

// Vibration section
const vibrationChartConfig = {
    canvasId: 'vibrationGraphContainer',
    chartInstance: 'vibrationChart',
    dataKey: 'vibrations',
    timestampKey: 'vibrationTimestamp',
    valueKey: 'vibrationValue',
    label: 'Vibration Value',
    borderColor: 'rgb(75, 192, 192)',
    stepped: 'middle',
    yStepSize: 1,
    yCallback: value => value
};

document.addEventListener('DOMContentLoaded', () => {
    const intervalInSeconds = 10;
    const intervalInMilliseconds = intervalInSeconds * 1000;
    setInterval(() => fetchAndCreateLineChart('door',doorChartConfig, 'latest-door-states', 'doorStatus', 'door-time'), intervalInMilliseconds);
    setInterval(() => fetchAndCreateLineChart('vibrations',vibrationChartConfig, 'latest-vibrations', 'vibrationStatus', 'vibration-time'), intervalInMilliseconds);
});