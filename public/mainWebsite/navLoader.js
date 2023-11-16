// Load the navbar and expose the logout button
async function loadNavbar() {
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
}

// Expose the logout button
function getLogoutButton() {
  return document.getElementById('logout-button');
}

loadNavbar();
