// Load the navbar and expose the logout button
async function loadNavbar() {
  try {
    const response = await fetch('/mainWebsite/navbar.html');
    const data = await response.text();
    document.getElementById('navbar-container').innerHTML = data;

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

// Expose the logout button
function getLogoutButton() {
  return document.getElementById('logout-button');
}

async function fetchDataAndHandleAlert(endpoint) {
  try {
    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.alert) {
      // Display an alert if the server indicates that an alert should be shown
      alert("There is a person at the door. Please go to cameras to confirm this!");
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

// Call the functions in a sequential manner when your page loads
document.addEventListener('DOMContentLoaded', async function () {
  try {
    // Load the navbar first
    await loadNavbar();

    // After the navbar is loaded, fetch data and handle alerts
    await fetchDataAndHandleAlert('/api/proximity-sensor-out');
    await fetchDataAndHandleAlert('/api/proximity-sensor-in');
  } catch (error) {
    // Handle errors that might occur during the process
    console.error('Error during page initialization:', error);
  }
});
