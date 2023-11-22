
document.addEventListener('DOMContentLoaded', function () {
  setInterval(function () {
    fetchDataAndRender('/api/all-door-states', 'doorLogsTableBody', formatDoorState);
  }, 10000);

  setInterval(function () {
    fetchDataAndRender('/api/latest-vibrations', 'doorVibrationTableBody', formatVibration);
  }, 10000);
  
  setInterval(() => {
    fetchAndRenderCustomerOut();
    fetchAndRenderCustomerIn();
  }, 10000);


  function fetchDataAndRender(apiEndpoint, tableBodyId, formatFunction) {
    fetch(apiEndpoint)
      .then(response => response.json())
      .then(data => {
        const dataArray = Array.isArray(data)
          ? data
          : Array.isArray(data.doorStates)
          ? data.doorStates
          : Array.isArray(data.vibrations)
          ? data.vibrations
          : Array.isArray(data.customerOutData)
          ? data.customerOutData
          : Array.isArray(data.customerInData)
          ? data.customerInData
          : [];

        if (dataArray.length > 0) {
          updateTable(tableBodyId, dataArray, formatFunction);
        } else {
          console.log(`No data received from ${apiEndpoint}`);
        }
      })
      .catch(error => console.error(`Error fetching data from ${apiEndpoint}:`, error));
  }


  function updateTable(tableBodyId, data, formatFunction) {
    const tableBody = document.getElementById(tableBodyId);
    tableBody.innerHTML = '';

    data.forEach(item => {
      const row = document.createElement('tr');
      const formattedData = formatFunction(item);

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

  function formatDoorState(doorState) {
    return {
      type: 'Door',
      timestamp: new Date(doorState.doorTimestamp).toLocaleString(),
      state: doorState.doorState === 0 ? 'Close' : 'Open',
    };
  }

  function formatVibration(vibration) {
    return {
      type: 'Vibration',
      timestamp: new Date(vibration.vibrationTimestamp).toLocaleString(),
      state: vibration.vibrationValue >= 60 ? 'Danger' : 'Normal',
    };
  }
});

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString();
}

async function fetchAndRenderCustomerOut() {
  const response = await fetch('/api/all-customer-out');
  const data = await response.json();

  const customerOutTableBody = document.getElementById('customerOutTableBody');
  customerOutTableBody.innerHTML = '';

  if (data.customerOutData) {
    data.customerOutData.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.customerId}</td>
        <td>${formatTimestamp(record.customerTimeStamp)}</td>
        <td>${record.customerOut}</td>
        <td>
          <button onclick="editCustomer('Customer Out', ${record.customerId})">Edit</button>
        </td>
      `;
      customerOutTableBody.appendChild(row);
    });
  } else {
    console.error('Invalid data received for customer out');
  }
}

// Function to fetch and render customer in data
async function fetchAndRenderCustomerIn() {
  const response = await fetch('/api/all-customer-in');
  const data = await response.json();

  const customerInTableBody = document.getElementById('customerInTableBody');
  customerInTableBody.innerHTML = '';

  if (data.customerInData) {
    data.customerInData.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.customerId}</td>
        <td>${formatTimestamp(record.customerTimeStamp)}</td>
        <td>${record.customerIn}</td>
        <td>
          <button onclick="editCustomer('Customer In', ${record.customerId})">Edit</button>
        </td>
      `;
      customerInTableBody.appendChild(row);
    });
  } else {
    console.error('Invalid data received for customer in');
  }
}

function editCustomer(type, customerId) {
  console.log('Editing customer:', type, 'ID:', customerId);
  const newValue = prompt(`Enter new value for ${type}:`);
  if (newValue !== null) {
    // Make a POST request to the server endpoint
    fetch('/api/update-customer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: type === 'Customer Out ID' ? 'Customer Out' : type,
        customerId,
        newValue,
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          console.error(data.error);
        }
      })
      .catch(error => console.error('Error updating customer:', error));
  }
}