// Function to fetch data from the server and show a modal
async function fetchDataAndShowModal(endpoint, targetElementId, modalFilePath) {
  try {
    const response = await fetch(endpoint);
    const data = await response.json();

    console.log('Data received from server:', data);

    if (data.alert) {
      console.log('Vibration alert! Showing modal...');

      const modalResponse = await fetch(modalFilePath);
      const modalHtml = await modalResponse.text();

      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHtml;

      document.body.appendChild(modalContainer);

      const modal = document.querySelector(".modal");
      modal.style.display = "block";

      const closeModalBtn = modal.querySelector("#closeModal");
      const okBtn = modal.querySelector("#okBtn");

      closeModalBtn.onclick = function () {
        console.log('Closing modal...');
        modal.style.display = "none";
        document.body.removeChild(modalContainer);
      };

      okBtn.onclick = function () {
        console.log('Redirecting to cameraVideos.html...');
        window.location.href = "/mainWebsite/cameraVideos.html";
        document.body.removeChild(modalContainer);
      };

      window.onclick = function (event) {
        if (event.target == modal) {
          console.log('Clicked outside modal. Closing modal...');
          modal.style.display = "none";
          document.body.removeChild(modalContainer);
        }
      };
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Set up an interval to fetch data every 6 seconds
setInterval(function() {
  fetchDataAndShowModal('/api/check-latest-vibration', 'vibrations', '/mainWebsite/notifications/vibration.html');
}, 6000);

// Initial fetch for proximity sensor out
fetchDataAndShowModal('/api/proximity-sensor-out', 'noOfCustomerOut', '/mainWebsite/notifications/personOut.html');

// Initial fetch for proximity sensor in
fetchDataAndShowModal('/api/proximity-sensor-in', 'noOfCustomerIn', '/mainWebsite/notifications/personIn.html');

// Initial fetch for vibration
fetchDataAndShowModal('/api/check-latest-vibration', 'vibrations', '/mainWebsite/notifications/vibration.html');
