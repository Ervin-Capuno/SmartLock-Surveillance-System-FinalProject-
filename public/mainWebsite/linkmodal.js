fetch('/api/camera')
  .then(response => response.json())
  .then(data => {
    if (Object.keys(data).length === 0) {
      // Data exists, fetch the "linkmodal.html"
      fetch('linkmodal.html')
        .then(response => response.text())
        .then(html => {
          // Append the HTML content to a container element on your page
          document.getElementById('linkModal').innerHTML = html;
        });
    }
  })
  .catch(error => {
    console.error('Error fetching camera data:', error);
  });