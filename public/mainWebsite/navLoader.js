// Load the navbar and expose the logout button
async function loadNavbar() {
  try {
    const response = await fetch('/mainWebsite/navbar.html');
    const data = await response.text();
    document.getElementById('navbar-container').innerHTML = data;

    // Check proximity sensor values and update content of div elements
    const { alert: alertOut } = await getProximitySensorAlert('/api/proximity-sensor-out');
    const { alert: alertIn } = await getProximitySensorAlert('/api/proximity-sensor-in');

    // Show modal if needed
    if (alertOut) {
      showModal('/mainWebsite/notifications/personOut.html');
    } else if (alertIn) {
      showModal('/mainWebsite/notifications/personIn.html');
    }

    // Add event listener to the logout button
    const logoutButton = getLogoutButton();
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        // Redirect to the logout route
        window.location.href = '/logout';
      });
    }
  } catch (error) {
    console.error('Error loading navbar:', error);
    throw error;
  }
}

// Function to get proximity sensor alert
async function getProximitySensorAlert(apiEndpoint) {
  try {
    const response = await fetch(apiEndpoint);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error getting proximity sensor alert:`, error);
    throw error;
  }
}

// Function to show modal
function showModal(notificationUrl) {
  // Implement your modal display logic here
  console.log(`Show modal for ${notificationUrl}`);
  // You can use a library like Bootstrap or create your custom modal display logic
}

// Call the functions in a sequential manner when your page loads
document.addEventListener('DOMContentLoaded', async function () {
  try {
    // Load the navbar first
    await loadNavbar();
  } catch (error) {
    // Handle errors that might occur during the process
    console.error('Error during page initialization:', error);
  }
});
