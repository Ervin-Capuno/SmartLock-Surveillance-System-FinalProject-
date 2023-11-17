document.addEventListener('DOMContentLoaded', function () {
  // Set up intervals to fetch and render door states and vibrations every 10 seconds
  setInterval(function () {
    fetchDataAndRender('/api/all-door-states', 'doorLogsTableBody', formatDoorState);
  }, 4000);

  setInterval(function () {
    fetchDataAndRender('/api/all-vibrations', 'doorVibrationTableBody', formatVibration);
  }, 4000);

  // Function to fetch and update data for door states and vibrations
  function fetchDataAndRender(apiEndpoint, tableBodyId, formatFunction) {
    // Fetch data from the API endpoint
    fetch(apiEndpoint)
      .then(response => response.json())
      .then(data => {
        // Log the data to the console for debugging
        console.log(`Data from ${apiEndpoint}:`, data);

        // Check if the data is an object with a property
        const dataArray = Array.isArray(data)
          ? data
          : Array.isArray(data.doorStates) // Check for doorStates property in case of door states
          ? data.doorStates
          : Array.isArray(data.vibrations) // Check for vibrations property in case of vibrations
          ? data.vibrations
          : [];

        // Check if the data array exists and has elements
        if (dataArray.length > 0) {
          // Call a function to update the table with the fetched data
          updateTable(tableBodyId, dataArray, formatFunction);
        } else {
          console.log(`No data received from ${apiEndpoint}`);
        }
      })
      .catch(error => console.error(`Error fetching data from ${apiEndpoint}:`, error));
  }

  // Function to update the table with the fetched data
  function updateTable(tableBodyId, data, formatFunction) {
    const tableBody = document.getElementById(tableBodyId);

    // Clear existing content in the table body
    tableBody.innerHTML = '';

    // Iterate through the data and append rows to the table
    data.forEach(item => {
      const row = document.createElement('tr');

      // Call the provided formatting function to format the data
      const formattedData = formatFunction(item);

      // Create cells based on the formatted data
      const timestampCell = document.createElement('td');
      timestampCell.textContent = formattedData.timestamp;
      row.appendChild(timestampCell);

      const stateCell = document.createElement('td');
      stateCell.textContent = formattedData.state;
      row.appendChild(stateCell);

      // Append the row to the table body
      tableBody.appendChild(row);
    });
  }

  // Function to format door state data
  function formatDoorState(doorState) {
    return {
      timestamp: new Date(doorState.doorTimestamp).toLocaleString(),
      state: doorState.doorState === 0 ? 'Close' : 'Open'
    };
  }

  // Function to format vibration data
  function formatVibration(vibration) {
    return {
      timestamp: new Date(vibration.vibrationTimestamp).toLocaleString(),
      state: vibration.vibrationValue >= 60 ? 'Danger' : 'Normal'
    };
  }
});