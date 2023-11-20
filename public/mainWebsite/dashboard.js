
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
    async function fetchAndCreateLineChart(type, chartConfig, endpoint, statusElementId, timeElementId) {
        try {
            const canvas = document.getElementById(chartConfig.canvasId);

            // Destroy existing chart instance if it exists
            if (window[chartConfig.chartInstance]) {
                window[chartConfig.chartInstance].destroy();
            }

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
                latestValue = chartValues.length > 0 ? (chartValues[0] >= 70 ? 'Danger' : 'Normal') : 'Unkown';
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
                                unit: 'minute', // Set the unit to 'minute'
                                stepSize: 5,     // Set the step size to 5 minutes
                                displayFormats: {
                                    minute: 'HH:mm', // Format for the x-axis labels
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
    const intervalInSeconds = 4;
    const intervalInMilliseconds = intervalInSeconds * 1000;
    setInterval(() => fetchAndCreateLineChart('door',doorChartConfig, 'latest-door-states', 'doorStatus', 'door-time'), intervalInMilliseconds);
    setInterval(() => fetchAndCreateLineChart('vibrations',vibrationChartConfig, 'latest-vibrations', 'vibrationStatus', 'vibration-time'), intervalInMilliseconds);
});


async function fetchAndCreateComparisonChart(endpoint, inElementId, inTimeElementId, outElementId, outTimeElementId) {
    try {
        const canvas = document.getElementById('customerGraphCanvas');

        // Fetch data from your server endpoint
        const response = await fetch(`/api/${endpoint}`);
        const data = await response.json();

        console.log(data);

        const latestCustomerIn = data.latestCustomerIn || [];
        const latestCustomerOut = data.latestCustomerOut || [];

        // Update content of the "Proximity" flip card
        document.getElementById(inElementId).innerText = `In: ${latestCustomerIn.length > 0 ? latestCustomerIn[0].customerIn : 'Unknown'}`;
        document.getElementById(inTimeElementId).innerText = `In Time: ${latestCustomerIn.length > 0 ? new Date(latestCustomerIn[0].customerTimeStampIn).toLocaleString() : 'Unknown'}`;
        document.getElementById(outElementId).innerText = `Out: ${latestCustomerOut.length > 0 ? latestCustomerOut[0].customerOut : 'Unknown'}`;
        document.getElementById(outTimeElementId).innerText = `Out Time: ${latestCustomerOut.length > 0 ? new Date(latestCustomerOut[0].customerTimeStampOut).toLocaleString() : 'Unknown'}`;

        // Extract time labels for customerIn and customerOut separately
        const labelsIn = latestCustomerIn.map(entry => new Date(entry.customerTimeStampIn));
        const labelsOut = latestCustomerOut.map(entry => new Date(entry.customerTimeStampOut));

        // Create a new chart on the canvas
        const ctx = canvas.getContext('2d');

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Customer In',
                        borderColor: 'green',
                        data: latestCustomerIn.map(entry => ({ x: new Date(entry.customerTimeStampIn), y: entry.customerIn })),
                        fill: false,
                        cubicInterpolationMode: 'monotone',
                    },
                    {
                        label: 'Customer Out',
                        borderColor: 'red',
                        data: latestCustomerOut.map(entry => ({ x: new Date(entry.customerTimeStampOut), y: entry.customerOut })),
                        fill: false,
                        cubicInterpolationMode: 'monotone',
                    },
                ],
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            stepSize: 5,
                            displayFormats: {
                                minute: 'HH:mm',
                            },
                        },
                    },
                    y: {
                        beginAtZero: true,
                    },
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                },
            },
        });

    } catch (error) {
        console.error(`Error fetching and creating comparison chart:`, error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const intervalInSeconds = 4;
    const intervalInMilliseconds = intervalInSeconds * 1000;

    setInterval(() => fetchAndCreateComparisonChart('check-latest-customer-data', 'proximityIn', 'proximityInTime', 'proximityOut', 'proximityOutTime'), intervalInMilliseconds);
});

