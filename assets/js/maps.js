// Declare map and datasetUrl globally
let map;
let datasetUrl;

document.addEventListener('DOMContentLoaded', function () {
    // Function to create and initialize a Leaflet map
    const initializeMap = (containerId) => {
        // Check if the map is already initialized on the container
        const existingMap = L.DomUtil.get(containerId);
        if (existingMap) {
            // If map already exists, remove it and create a new one
            existingMap._leaflet_id = null;
        }

        const mapInstance = L.map(containerId).setView([50, 10], 3, {
            maxZoom: 4,
            minZoom: 4,
            zoomControl: false
        });

        const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(mapInstance);

        return mapInstance;
    };

    // Function to fetch GeoJSON data
    const fetchGeoJSON = () => {
        return fetch('https://raw.githubusercontent.com/alicepicco333/wipEU/main/europe.geojson')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch GeoJSON');
                }
                return response.json();
            });
    };

    // Function to fetch values data
    const fetchValuesData = (dataset, year, gender) => {
        switch (dataset) {
            case 'dataset1':
                datasetUrl = 'https://raw.githubusercontent.com/alicepicco333/wipEU/main/datav/2024-01-25-wmidm_pol_part__wmid_polpart.json';
                break;
            case 'dataset2':
                datasetUrl = 'https://raw.githubusercontent.com/alicepicco333/wipEU/main/datav/2024-01-26-wmidm_educ__wmid_resfund.json';
                break;
            case 'dataset3':
                datasetUrl = 'https://raw.githubusercontent.com/alicepicco333/wipEU/main/datav/2024-01-26-wmidm_env_nat__wmid_env_natmin_envmin.json';
                break;
            default:
                throw new Error('Invalid dataset selection');
        }

        // Fetch data using the determined URL
        return fetch(datasetUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch values data. Status: ${response.status}`);
                }
                return response.json();
            });
    };

    // Function to render GeoJSON data on the map
    const renderMapWithData = (map, geojsonData, filteredValues) => {
        L.geoJSON(geojsonData, {
            style: function (feature) {
                const countryValue = filteredValues.find(entry => entry.geo === feature.properties.NAME)?.value;

                return {
                    fillColor: getColor(countryValue),
                    weight: 2,
                    opacity: 1,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.7
                };
            },
            onEachFeature: function (feature, layer) {
                const countryName = feature.properties.NAME;
                const countryValue = filteredValues.find(entry => entry.geo === countryName)?.value;

                // Bind popup with name and value
                layer.bindPopup(`<strong>${countryName}</strong><br>Value: ${countryValue}`);

                // Bind tooltip with numerical value
                layer.bindTooltip(countryValue ? countryValue.toString() : 'N/A', {
                    permanent: false,
                    direction: 'auto',
                    opacity: 0.7
                });

                // Example: Add custom behavior on feature click
                layer.on('click', function (event) {
                    console.log(`Clicked on ${countryName}`);
                    // Add your custom click behavior here
                });
            }
        }).addTo(map);
    };

    function getColor(value) {
        if (value === undefined || isNaN(value)) {
            return 'rgba(0, 0, 0, 0)';  // Transparent color
        }

        return value > 10 ? '#801259' :
            value > 8 ? '#B80E4B' :
                value > 5 ? '#D91FD5' :
                    value > 4 ? '#E844E8' :
                        value > 3 ? '#E853B1' :
                            value > 2 ? '#E377C2' :
                                value > 1 ? '#E28EBF' :
                                    '#E3A492'; 
    }

    // Function to update maps based on selected year and sex
    const updateMaps = () => {
        const selectedYear = document.getElementById('yearDropdown').value;
        const selectedSex = document.getElementById('genderDropdown').value;
        const selectedDataset = document.getElementById('datasetDropdown').value;

        // Initialize a map with the ID 'mapf2017'
        map = initializeMap('mapf2017');

        // Fetch GeoJSON data and values data sequentially
        fetchGeoJSON()
            .then(geojsonData => {
                return fetchValuesData(selectedDataset, selectedYear, selectedSex)
                    .then(valuesData => {
                        const filteredValues = valuesData.elements.filter(entry =>
                            entry.sex === selectedSex && entry.time === parseInt(selectedYear));

                        // Render GeoJSON data on the map
                        renderMapWithData(map, geojsonData, filteredValues);
                    });
            })
            .catch(error => console.error('Error fetching data:', error));
    };

    // Event listeners for dropdown changes
    const yearDropdown = document.getElementById('yearDropdown');
    const sexDropdown = document.getElementById('genderDropdown');
    const datasetDropdown = document.getElementById('datasetDropdown');

    yearDropdown.addEventListener('change', updateMaps);
    sexDropdown.addEventListener('change', updateMaps);
    datasetDropdown.addEventListener('change', updateMaps);

    // Initial map update
    updateMaps();
});
