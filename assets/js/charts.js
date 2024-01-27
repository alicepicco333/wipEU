// Declare global variables for traces, layout, and jsonData
let traces1;
let traces2;
let traces3;
let layout1;
let layout2;
let layout3;
let jsonData1;
let jsonData2;
let jsonData3;

// Function to get color based on sex
function getColorForSex(sex) {
  switch (sex) {
    case 'Men':
      return 'blue';
    case 'Women':
      return 'pink';
    case 'Total':
      return 'orange';
    default:
      return 'gray'; // Default color if the sex is not matched
  }
}

// Function to update the graph based on the selected position and entity
function updateGraph(selectedPosition, selectedEntity) {
  console.log('Selected Position:', selectedPosition);
  console.log('Selected Entity:', selectedEntity);

  const updatedTraces = [];

  traces1.forEach((trace, index) => {
    const sex = ['Men', 'Women', 'Total'][index];
    const filteredData = jsonData1
      .filter(entry => entry.sex === sex && entry._POSITION === selectedPosition && entry.ENTITY === selectedEntity && entry._UNIT === 'NR')
      .sort((a, b) => a.time - b.time); // Sort based on the 'time' values

    // Log the filtered data for debugging
    console.log(`Data for ${sex} - ${selectedPosition} - ${selectedEntity} - _UNIT: "NR":`, filteredData);

    // Update trace data
    const updatedTrace = {
      x: filteredData.map(entry => entry.time),
      y: filteredData.map(entry => entry.value),
      type: 'scatter',
      mode: 'lines',
      name: `${sex}`,
      line: {
        color: getColorForSex(sex),
      },
    };

    updatedTraces.push(updatedTrace);
  });

  // Use Plotly.newPlot to cleanly update the graph
  Plotly.newPlot('line-graph', updatedTraces, layout1);
}

// Fetch the JSON data
fetch('http://localhost:8000/databar/2024-01-26-wmidm_adm_eur__wmid_euadmin_eurag.json')
  .then(response => response.json())
  .then(data => {
    jsonData1 = data.elements;
    const positions = [...new Set(jsonData1.map(entry => entry._POSITION))];
    const entities = [...new Set(jsonData1.map(entry => entry.ENTITY))];

    // Create traces for different lines (Men, Women, Total)
    traces1 = ['Men', 'Women', 'Total'].map(sex => ({
      x: [],
      y: [],
      type: 'scatter',
      mode: 'lines',
      name: sex,
      line: {
        color: getColorForSex(sex),
      },
    }));

    // Set up the layout
    layout1 = {
      title: `European agencies: presidents, members and executive heads`,
      xaxis: {
        title: 'Year',
        type: 'linear',
      },
      yaxis: {
        title: 'Headcount',
        range: [0, 100],
      },
    };

    // Add change event listener to the external dropdown for positions
    const positionDropdown = document.getElementById('position-dropdown');
    if (positionDropdown) {
      positions.forEach(position => {
        const option = document.createElement('option');
        option.value = position;
        option.text = position;
        positionDropdown.add(option);
      });

      positionDropdown.addEventListener('change', function () {
        const selectedPosition = this.value;
        const selectedEntity = document.getElementById('entity-dropdown').value;
        updateGraph(selectedPosition, selectedEntity);
      });
    } else {
      console.error('Position dropdown not found.');
    }

    // Add change event listener to the external dropdown for entities
    const entityDropdown = document.getElementById('entity-dropdown');
    if (entityDropdown) {
      entities.forEach(entity => {
        const option = document.createElement('option');
        option.value = entity;
        option.text = entity;
        entityDropdown.add(option);
      });

      entityDropdown.addEventListener('change', function () {
        const selectedEntity = this.value;
        const selectedPosition = document.getElementById('position-dropdown').value;
        updateGraph(selectedPosition, selectedEntity);
      });
    } else {
      console.error('Entity dropdown not found.');
    }

    // Set default values for dropdowns
    const defaultPosition = positions[0];
    const defaultEntity = entities[0];
    positionDropdown.value = defaultPosition;
    entityDropdown.value = defaultEntity;

    // Initial graph rendering with default values
    updateGraph(defaultPosition, defaultEntity);
  })
  .catch(error => console.error('Error fetching data:', error));


  //chart finance

  document.addEventListener('DOMContentLoaded', function() {
    // Your Plotly code for the second graph here
  

// Function to get color based on sex
function getColorForSex(sex) {
  switch (sex) {
    case 'Men':
      return 'blue';
    case 'Women':
      return 'pink';
    case 'Total':
      return 'orange';
    default:
      return 'gray'; // Default color if the sex is not matched
  }
}

// Function to update the graph based on the selected position and entity
function updateGraph(selectedPosition, selectedEntity) {
  console.log('Selected Position:', selectedPosition);
  console.log('Selected Entity:', selectedEntity);

  const updatedTraces = [];

  traces2.forEach((trace, index) => {
    const sex = ['Men', 'Women', 'Total'][index];
    const filteredData = jsonData2
      .filter(entry => entry.sex === sex && entry._POSITION === selectedPosition && entry.ENTITY === selectedEntity && entry._UNIT === 'NR')
      .sort((a, b) => a.time - b.time); // Sort based on the 'time' values

    // Log the filtered data for debugging
    console.log(`Data for ${sex} - ${selectedPosition} - ${selectedEntity} - _UNIT: "NR":`, filteredData);

    // Update trace data
    const updatedTrace = {
      x: filteredData.map(entry => entry.time),
      y: filteredData.map(entry => entry.value),
      type: 'scatter',
      mode: 'lines',
      name: `${sex}`,
      line: {
        color: getColorForSex(sex),
      },
    };

    updatedTraces.push(updatedTrace);
  });

  // Use Plotly.newPlot to cleanly update the graph
  Plotly.newPlot('line-graph-fin', updatedTraces, layout2);
}

// Fetch the JSON data
fetch('http://localhost:8000/databar/2024-01-26-wmidm_bus_fin__wmid_fineur.json')
  .then(response => response.json())
  .then(data => {
    jsonData2 = data.elements;
    const positions = [...new Set(jsonData2.map(entry => entry._POSITION))];
    const entities = [...new Set(jsonData2.map(entry => entry.ENTITY))];

    // Create traces for different lines (Men, Women, Total)
    traces2 = ['Men', 'Women', 'Total'].map(sex => ({
      x: [],
      y: [],
      type: 'scatter',
      mode: 'lines',
      name: sex,
      line: {
        color: getColorForSex(sex),
      },
    }));

    // Set up the layout
    layout2 = {
      title: `European financial institutions: presidents and members`,
      xaxis: {
        title: 'Year',
        type: 'linear',
      },
      yaxis: {
        title: 'Headcount',
        range: [0, 100],
      },
    };

    // Add change event listener to the external dropdown for positions
    const positionDropdown = document.getElementById('position-dropdown2');
    if (positionDropdown) {
      positions.forEach(position => {
        const option = document.createElement('option');
        option.value = position;
        option.text = position;
        positionDropdown.add(option);
      });

      positionDropdown.addEventListener('change', function () {
        const selectedPosition = this.value;
        const selectedEntity = document.getElementById('entity-dropdown2').value;
        updateGraph(selectedPosition, selectedEntity);
      });
    } else {
      console.error('Position dropdown not found.');
    }

    // Add change event listener to the external dropdown for entities
    const entityDropdown = document.getElementById('entity-dropdown2');
    if (entityDropdown) {
      entities.forEach(entity => {
        const option = document.createElement('option');
        option.value = entity;
        option.text = entity;
        entityDropdown.add(option);
      });

      entityDropdown.addEventListener('change', function () {
        const selectedEntity = this.value;
        const selectedPosition = document.getElementById('position-dropdown2').value;
        updateGraph(selectedPosition, selectedEntity);
      });
    } else {
      console.error('Entity dropdown not found.');
    }

    // Set default values for dropdowns
    const defaultPosition = positions[0];
    const defaultEntity = entities[0];
    positionDropdown.value = defaultPosition;
    entityDropdown.value = defaultEntity;

    // Initial graph rendering with default values
    updateGraph(defaultPosition, defaultEntity);
  })
  .catch(error => console.error('Error fetching data:', error));});

/////justice courts graph

  document.addEventListener('DOMContentLoaded', function() {
    // Your Plotly code for the second graph here
  

// Function to get color based on sex
function getColorForSex(sex) {
  switch (sex) {
    case 'Men':
      return 'blue';
    case 'Women':
      return 'pink';
    case 'Total':
      return 'orange';
    default:
      return 'gray'; // Default color if the sex is not matched
  }
}

// Function to update the graph based on the selected position and entity
function updateGraph(selectedPosition, selectedEntity) {
  console.log('Selected Position:', selectedPosition);
  console.log('Selected Entity:', selectedEntity);

  const updatedTraces = [];

  traces2.forEach((trace, index) => {
    const sex = ['Men', 'Women', 'Total'][index];
    const filteredData = jsonData3
      .filter(entry => entry.sex === sex && entry._POSITION === selectedPosition && entry.ENTITY === selectedEntity && entry._UNIT === 'NR')
      .sort((a, b) => a.time - b.time); // Sort based on the 'time' values

    // Log the filtered data for debugging
    console.log(`Data for ${sex} - ${selectedPosition} - ${selectedEntity} - _UNIT: "NR":`, filteredData);

    // Update trace data
    const updatedTrace = {
      x: filteredData.map(entry => entry.time),
      y: filteredData.map(entry => entry.value),
      type: 'scatter',
      mode: 'lines',
      name: `${sex}`,
      line: {
        color: getColorForSex(sex),
      },
    };

    updatedTraces.push(updatedTrace);
  });

  // Use Plotly.newPlot to cleanly update the graph
  Plotly.newPlot('line-graph-courts', updatedTraces, layout3);
}



// Fetch the JSON data
fetch('http://localhost:8000/databar/2024-01-26-wmidm_jud_eucrt__wmid_eucrt (2).json')
  .then(response => response.json())
  .then(data => {
    jsonData3 = data.elements;
    const positions = [...new Set(jsonData3.map(entry => entry._POSITION))];
    const entities = [...new Set(jsonData3.map(entry => entry.ENTITY))];

    // Create traces for different lines (Men, Women, Total)
    traces3 = ['Men', 'Women', 'Total'].map(sex => ({
      x: [],
      y: [],
      type: 'scatter',
      mode: 'lines',
      name: sex,
      line: {
        color: getColorForSex(sex),
      },
    }));

    // Set up the layout
    layout3 = {
      title: `European courts: presidents and members`,
      xaxis: {
        title: 'Year',
        type: 'linear',
      },
      yaxis: {
        title: 'Headcount',
        range: [0, 100],
      },
    };

    // Add change event listener to the external dropdown for positions
    const positionDropdown = document.getElementById('position-dropdown3');
    if (positionDropdown) {
      positions.forEach(position => {
        const option = document.createElement('option');
        option.value = position;
        option.text = position;
        positionDropdown.add(option);
      });

      positionDropdown.addEventListener('change', function () {
        const selectedPosition = this.value;
        const selectedEntity = document.getElementById('entity-dropdown3').value;
        updateGraph(selectedPosition, selectedEntity);
      });
    } else {
      console.error('Position dropdown not found.');
    }

    // Add change event listener to the external dropdown for entities
    const entityDropdown = document.getElementById('entity-dropdown3');
    if (entityDropdown) {
      entities.forEach(entity => {
        const option = document.createElement('option');
        option.value = entity;
        option.text = entity;
        entityDropdown.add(option);
      });

      entityDropdown.addEventListener('change', function () {
        const selectedEntity = this.value;
        const selectedPosition = document.getElementById('position-dropdown3').value;
        updateGraph(selectedPosition, selectedEntity);
      });
    } else {
      console.error('Entity dropdown not found.');
    }

    // Set default values for dropdowns
    const defaultPosition = positions[0];
    const defaultEntity = entities[0];
    positionDropdown.value = defaultPosition;
    entityDropdown.value = defaultEntity;

    // Initial graph rendering with default values
    updateGraph(defaultPosition, defaultEntity);
  })

  
  .catch(error => console.error('Error fetching data:', error));});