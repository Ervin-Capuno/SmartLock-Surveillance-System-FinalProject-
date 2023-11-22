async function loadNavbar() {
  try {
    const response = await fetch('/mainWebsite/navbar.html');
    const data = await response.text();
    document.getElementById('navbar-container').innerHTML = data;

    return document.getElementById('logout-button');
  } catch (error) {
    console.error('Error loading navbar:', error);
    throw error;
  }
}


document.addEventListener('DOMContentLoaded', async function () {
  try {
    const logoutButton = await loadNavbar();
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        window.location.href = '/logout';
      });
    } else {
      console.error('Logout button not found in the loaded navbar.');
    }
  } catch (error) {
    console.error('Error during page initialization:', error);
  }
});
