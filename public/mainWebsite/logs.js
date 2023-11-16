document.addEventListener("DOMContentLoaded", function () {
    // Fetch door logs from the API endpoint
    fetch('/api/all-door-states')
      .then(response => response.json())
      .then(data => {
        // Check if the response contains doorStates
        if (data.doorStates) {
          // Call a function to update the Door Logs accordion with the fetched data
          updateAccordion('doorLogsTableBody', data.doorStates);
        }
      })
      .catch(error => console.error('Error fetching door states:', error));

    // Function to update the accordion with the fetched door states
    function updateAccordion(tableBodyId, doorStates) {
      const tableBody = document.getElementById(tableBodyId);

      // Clear existing content in the table body
      tableBody.innerHTML = '';

      // Iterate through the door states and append rows to the table
      doorStates.forEach(doorState => {
        const row = document.createElement('tr');
        const timestampCell = document.createElement('td');
        const stateCell = document.createElement('td');

        // Format timestamp for readability
        const formattedTimestamp = new Date(doorState.doorTimestamp).toLocaleString();

        // Set the content of each cell
        timestampCell.textContent = formattedTimestamp;
        stateCell.textContent = doorState.doorState === 0 ? 'Close' : 'Open';

        // Append cells to the row
        row.appendChild(timestampCell);
        row.appendChild(stateCell);

        // Append the row to the table body
        tableBody.appendChild(row);
      });
    }
  });