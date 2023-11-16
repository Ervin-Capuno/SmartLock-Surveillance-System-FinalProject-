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

document.addEventListener('DOMContentLoaded', () => {
    fetchAndCreateLineChart();
    setInterval(fetchAndCreateLineChart, 10000);
});

async function fetchAndCreateLineChart() {
try {
    const canvas = document.getElementById('doorGraphCanvas'); // Corrected canvas ID

    // Check if there's a previous chart instance
    if (window.myLine) {
        window.myLine.destroy();
    }

    // Fetch data from your server endpoint
    const response = await fetch('/api/latest-door-states');
    const data = await response.json();

    // Use the fetched data for your chart
    const timestamps = data.doorStates.map(entry => new Date(entry.doorTimestamp));
    const doorStates = data.doorStates.map(entry => entry.doorState);

    // Update doorStatus and door-time based on the latest data
    const latestDoorState = doorStates.length > 0 ? (doorStates[doorStates.length - 1] === 1 ? 'Open' : 'Closed') : 'Unknown';
    const latestTimestamp = timestamps.length > 0 ? timestamps[timestamps.length - 1].toLocaleString() : 'Unknown';

    document.getElementById('doorStatus').innerText = `Status: ${latestDoorState}`;
    document.getElementById('door-time').innerText = `Last: ${latestTimestamp}`;

    // Create a new chart on the canvas
    var ctx = canvas.getContext('2d'); // Use the correct canvas ID here

    // Create the line chart
    var doorStateChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [{
                label: 'Door State',
                borderColor: 'rgb(75, 192, 192)',
                data: doorStates,
                fill: false,
                stepped: 'before' // Use step-type interpolation
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
                        stepSize: 1,
                        callback: function (value) {
                            return value === 0 ? 'Closed' : 'Open';
                        }
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
    console.error('Error fetching and creating line chart:', error);
}
}