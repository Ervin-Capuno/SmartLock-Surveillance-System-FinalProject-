// Fetch the camera data for the authenticated user from the server
fetch('/api/camera')
.then(response => {
    if (!response.ok) {
        throw new Error('Failed to fetch camera data');
    }
    return response.json();
})
.then(data => {
    try {
        const inCameraUrl = data[0].cameraIn;
        const outCameraUrl = data[0].cameraOut;

        document.getElementById('inCameraIframe').src = inCameraUrl;
        document.getElementById('outCameraIframe').src = outCameraUrl;

        document.getElementById('inCameraIframe').style.display = 'block';
        document.getElementById('inCameraLoader').style.display = 'none';
    } catch (error) {
        console.error('Error parsing camera data:', error);
    }
})
.catch(error => {
    console.error('Error fetching camera data:', error);
});

async function handleDoorControl(doorState) {
    try {
        const response = await fetch('/api/door-control', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ doorState }),
        });
        console.log(doorState);

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error handling door control:', errorData);
        } else {
            const data = await response.json();
            console.log(data);
        }
    } catch (error) {
        console.error('Error handling door control:', error);
    }
}

// Add event listeners to the buttons
const openButton = document.getElementById('openButton');
const closeButton = document.getElementById('closeButton');
openButton.addEventListener('click', async () => {
    const doorState = parseInt(openButton.getAttribute('data-door-state'), 10);
    await handleDoorControl(doorState);
});

closeButton.addEventListener('click', async () => {
    const doorState = parseInt(closeButton.getAttribute('data-door-state'), 10);
    await handleDoorControl(doorState);
});


