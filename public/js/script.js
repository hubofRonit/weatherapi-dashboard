// public/js/script.js

const API_BASE_URL = '/api'; // Using relative path for same-origin requests

// DOM Elements
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const userInfo = document.getElementById('user-info');
const userNameSpan = document.getElementById('user-name');
const dashboardElement = document.getElementById('dashboard');
const loginPromptElement = document.getElementById('login-prompt');
const errorMessageElements = document.querySelectorAll('.error'); // Common class for error messages

const addLocationForm = document.getElementById('add-location-form');
const locationsList = document.getElementById('locations-list');
const locationError = document.getElementById('location-error');
const weatherDisplay = document.getElementById('weather-display');
const currentWeatherDiv = document.getElementById('current-weather');
const weatherLocationName = document.getElementById('weather-location-name');
const refreshWeatherBtn = document.getElementById('refresh-weather-btn');

const alertManager = document.getElementById('alert-manager');
const alertLocationName = document.getElementById('alert-location-name');
const addAlertForm = document.getElementById('add-alert-form');
const alertLocationIdInput = document.getElementById('alert-location-id');
const alertsList = document.getElementById('alerts-list');
const alertError = document.getElementById('alert-error');

const historicalWeatherDiv = document.getElementById('historical-weather');
const historyForm = document.getElementById('history-form');
const historyResultsDiv = document.getElementById('history-results');
const historyError = document.getElementById('history-error');

let currentToken = null;
let selectedLocationId = null; // Keep track of the location being viewed

// --- Utility Functions ---

// Function to get JWT token from localStorage
const getToken = () => localStorage.getItem('authToken');

// Function to set JWT token in localStorage
const setToken = (token) => {
    localStorage.setItem('authToken', token);
    currentToken = token; // Update global state
};

// Function to remove JWT token from localStorage
const removeToken = () => {
    localStorage.removeItem('authToken');
    currentToken = null; // Update global state
    selectedLocationId = null; // Reset selected location on logout
};

// Centralized API request function
const apiRequest = async (endpoint, method = 'GET', body = null, requiresAuth = true) => {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (requiresAuth) {
        const token = getToken();
        if (!token) {
            console.error('Authentication token missing for protected request.');
            showLogin(); // Redirect or show login if token is missing for protected route
            return null; // Indicate failure
        }
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method: method,
        headers: headers,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json(); // Always try to parse JSON

        if (!response.ok) {
            // Use the error message from the backend response if available
            const errorMsg = data?.message || `HTTP error! Status: ${response.status}`;
            console.error(`API Error (${method} ${endpoint}):`, errorMsg);
            throw new Error(errorMsg); // Throw an error with the backend message
        }
        return data; // Return parsed JSON data on success
    } catch (error) {
        console.error(`Network or parsing error (${method} ${endpoint}):`, error);
        // Re-throw the error (which might now include the backend message)
        // Or handle it specifically (e.g., show a generic error message)
        throw error;
    }
};

// Function to clear all error messages
const clearErrors = () => {
    errorMessageElements.forEach(el => {
        if (el) { 
            el.textContent = '';
        }
    });
    if (locationError) {
        locationError.textContent = '';
    }
    if (alertError) {
        alertError.textContent = '';
    }
    if (historyError) {
        historyError.textContent = '';
    }
};

// Function to display error messages
const displayError = (elementId, message) => {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
    } else {
        console.error(`Error element with ID ${elementId} not found.`);
        // Fallback: alert the message
        alert(`Error: ${message}`);
    }
};

// --- Authentication ---

const handleSignup = async (event) => {
    event.preventDefault();
    clearErrors();
    const name = signupForm.name.value;
    const email = signupForm.email.value;
    const password = signupForm.password.value;

    try {
        const data = await apiRequest('/auth/signup', 'POST', { name, email, password }, false);
        if (data && data.token) {
            setToken(data.token);
            // Redirect to dashboard or login page after successful signup
            window.location.href = '/index.html'; // Go to main dashboard page
        }
    } catch (error) {
        displayError('error-message', error.message); // Display error from backend
    }
};

const handleLogin = async (event) => {
    event.preventDefault();
    clearErrors();
    const email = loginForm.email.value;
    const password = loginForm.password.value;

    try {
        const data = await apiRequest('/auth/login', 'POST', { email, password }, false);
        if (data && data.token) {
            setToken(data.token);
            window.location.href = '/index.html'; // Redirect to dashboard
        }
    } catch (error) {
        displayError('error-message', error.message); // Display error from backend
    }
};

const handleLogout = () => {
    removeToken();
    showLogin(); // Update UI to show login prompt
};

// --- UI Updates ---

const showDashboard = (user) => {
    if (dashboardElement) dashboardElement.classList.remove('hidden');
    if (loginPromptElement) loginPromptElement.classList.add('hidden');
    if (userInfo) userInfo.classList.remove('hidden');
    if (userNameSpan) userNameSpan.textContent = `Welcome, ${user.name}!`;

    // loadSavedLocations already has its own checks for locationsList existence
    // but it's good practice to ensure the primary elements for this view are present.
    if (dashboardElement) { // Or specifically if (locationsList)
        loadSavedLocations(); // Load locations when dashboard is shown
    }
};

const showLogin = () => {
    if (dashboardElement) dashboardElement.classList.add('hidden');
    if (weatherDisplay) weatherDisplay.classList.add('hidden');
    if (alertManager) alertManager.classList.add('hidden');
    if (historicalWeatherDiv) historicalWeatherDiv.classList.add('hidden');
    if (loginPromptElement) loginPromptElement.classList.remove('hidden');
    if (userInfo) userInfo.classList.add('hidden');
    if (userNameSpan) userNameSpan.textContent = '';

    // These elements are specific to the dashboard, so check them
    if (locationsList) locationsList.innerHTML = ''; // Clear locations list
    if (alertsList) alertsList.innerHTML = ''; // Clear alerts list
    if (currentWeatherDiv) currentWeatherDiv.innerHTML = '<p>Select a location to see the weather.</p>';
};

// --- Location Management ---

const handleAddLocation = async (event) => {
    event.preventDefault();
    clearErrors();
    const name = document.getElementById('location-name').value;
    const city = document.getElementById('location-city').value;

    if (!name || !city) {
        displayError('location-error', 'Both location label and city name are required.');
        return;
    }

    try {
        await apiRequest('/weather/locations', 'POST', { name, city });
        addLocationForm.reset(); // Clear the form
        loadSavedLocations(); // Refresh the list
    } catch (error) {
        displayError('location-error', error.message);
    }
};

const loadSavedLocations = async () => {
    locationsList.innerHTML = '<li>Loading...</li>'; // Show loading indicator
    try {
        const locations = await apiRequest('/weather/locations');
        renderLocations(locations);
         // If no location is selected yet, or selected one was deleted, select the first one if available
        if ((!selectedLocationId || !locations.some(loc => loc._id === selectedLocationId)) && locations.length > 0) {
             handleLocationSelect(locations[0]._id, locations[0].city, locations[0].name);
        } else if (locations.length === 0) {
            // Handle case where there are no locations
            weatherDisplay.classList.add('hidden');
            alertManager.classList.add('hidden');
            historicalWeatherDiv.classList.add('hidden');
            currentWeatherDiv.innerHTML = '<p>Add a location to see weather information.</p>';
            selectedLocationId = null;
        } else if (selectedLocationId) {
            // Refresh data for the currently selected location if it still exists
            const currentLoc = locations.find(loc => loc._id === selectedLocationId);
            if (currentLoc) {
                handleLocationSelect(currentLoc._id, currentLoc.city, currentLoc.name);
            }
        }
    } catch (error) {
        console.error('Error loading locations:', error);
        locationsList.innerHTML = '<li>Error loading locations.</li>';
        // Maybe show login if it's an auth error
        if (error.message.includes('401') || error.message.includes('Not authorized')) {
            showLogin();
        }
    }
};

const renderLocations = (locations) => {
    locationsList.innerHTML = ''; // Clear existing list
    if (locations.length === 0) {
        locationsList.innerHTML = '<li>No locations saved yet.</li>';
        return;
    }
    locations.forEach(location => {
        const li = document.createElement('li');
        li.dataset.id = location._id;
        li.dataset.city = location.city;
        li.dataset.name = location.name; // Store name for display
        li.textContent = `${location.name} (${location.city})`;
        li.addEventListener('click', () => handleLocationSelect(location._id, location.city, location.name));

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent li click event when button is clicked
            handleDeleteLocation(location._id, location.name);
        });

        li.appendChild(deleteButton);
        locationsList.appendChild(li);
    });
};

const handleDeleteLocation = async (locationId, locationName) => {
    if (confirm(`Are you sure you want to delete location "${locationName}"? This will also delete associated alerts.`)) {
        clearErrors();
        try {
            await apiRequest(`/weather/locations/${locationId}`, 'DELETE');
            loadSavedLocations(); // Refresh list after deletion

            // If the deleted location was the selected one, clear the weather/alert display
            if (selectedLocationId === locationId) {
                selectedLocationId = null;
                weatherDisplay.classList.add('hidden');
                alertManager.classList.add('hidden');
                 historicalWeatherDiv.classList.add('hidden');
                currentWeatherDiv.innerHTML = '<p>Select a location to see the weather.</p>';
            }
        } catch (error) {
            displayError('location-error', `Failed to delete location: ${error.message}`);
        }
    }
};

// --- Weather Display ---

const handleLocationSelect = (locationId, city, name) => {
    console.log(`Location selected: ID=${locationId}, City=${city}, Name=${name}`);
    selectedLocationId = locationId; // Set the globally tracked selected location

    // Highlight selected location in the list (optional)
    document.querySelectorAll('#locations-list li').forEach(li => {
        li.style.fontWeight = (li.dataset.id === locationId) ? 'bold' : 'normal';
         li.style.backgroundColor = (li.dataset.id === locationId) ? '#ddf' : '#eef';
    });

    // Show weather and alert sections
    weatherDisplay.classList.remove('hidden');
    alertManager.classList.remove('hidden');
    historicalWeatherDiv.classList.remove('hidden'); // Show history section

    // Update titles and form fields
    weatherLocationName.textContent = `Weather for ${name} (${city})`;
    alertLocationName.textContent = `${name} (${city})`;
    alertLocationIdInput.value = locationId; // Set hidden input for alert form

    // Clear previous results and errors
    currentWeatherDiv.innerHTML = '<p>Loading weather...</p>';
    alertsList.innerHTML = '<li>Loading alerts...</li>';
     historyResultsDiv.innerHTML = '';
     historyError.textContent = '';
     alertError.textContent = '';

    // Fetch current weather and alerts for the selected location
    fetchAndDisplayWeather(city);
    loadAlertsForLocation(locationId);

    // Reset history form for the new location
    historyForm.reset();
    // Set default dates for history (e.g., last 7 days)
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    document.getElementById('end-date').valueAsDate = today;
    document.getElementById('start-date').valueAsDate = weekAgo;

    // Show refresh button
     refreshWeatherBtn.classList.remove('hidden');
};

const fetchAndDisplayWeather = async (city) => {
    if (!city) return;
    try {
        // Use the public endpoint as it includes caching/persistence logic already
        // We don't strictly need auth here, but sending it doesn't hurt
        const weather = await apiRequest(`/weather/current?city=${city}`, 'GET', null, false); // Use public endpoint
        renderCurrentWeather(weather);
    } catch (error) {
        console.error(`Error fetching weather for ${city}:`, error);
        currentWeatherDiv.innerHTML = `<p class="error">Could not load weather for ${city}. ${error.message}</p>`;
    }
};

const renderCurrentWeather = (weather) => {
    if (!weather || !weather.temperature) {
         currentWeatherDiv.innerHTML = `<p class="error">Weather data unavailable.</p>`;
         return;
    }
    // Map weather icon code to URL (OpenWeatherMap example)
    const iconUrl = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;

    currentWeatherDiv.innerHTML = `
        <p class="temp">${weather.temperature?.toFixed(1)}°C <img src="${iconUrl}" alt="${weather.description}" class="weather-icon"></p>
        <p class="desc">${weather.description}</p>
        <p><strong>Feels Like:</strong> ${weather.feelsLike?.toFixed(1)}°C</p>
        <p><strong>Humidity:</strong> ${weather.humidity}%</p>
        <p><strong>Wind:</strong> ${weather.windSpeed?.toFixed(1)} m/s</p>
        <p><strong>Pressure:</strong> ${weather.pressure} hPa</p>
        ${weather.minTemp ? `<p><strong>Min Temp:</strong> ${weather.minTemp.toFixed(1)}°C</p>` : ''}
        ${weather.maxTemp ? `<p><strong>Max Temp:</strong> ${weather.maxTemp.toFixed(1)}°C</p>` : ''}
        ${weather.rainVolume ? `<p><strong>Rain (last hour):</strong> ${weather.rainVolume} mm</p>` : ''}
        ${weather.sunrise ? `<p><strong>Sunrise:</strong> ${new Date(weather.sunrise * 1000).toLocaleTimeString()}</p>` : ''}
        ${weather.sunset ? `<p><strong>Sunset:</strong> ${new Date(weather.sunset * 1000).toLocaleTimeString()}</p>` : ''}
        <p><small>Data timestamp: ${new Date(weather.apiTimestamp * 1000).toLocaleString()}</small></p>
        ${weather.cityNameFromApi ? `<p><small>Location detected by API: ${weather.cityNameFromApi}</small></p>`: ''}

    `;
};

// --- Alert Management ---

const handleAddAlert = async (event) => {
    event.preventDefault();
    clearErrors();
    const locationId = alertLocationIdInput.value;
    const condition = document.getElementById('alert-condition').value;
    const threshold = document.getElementById('alert-threshold').value;

    if (!locationId || !condition || threshold.trim() === '') {
        displayError('alert-error', 'Please select a location, condition, and enter a threshold.');
        return;
    }

    try {
        await apiRequest('/alerts', 'POST', { locationId, condition, threshold });
        addAlertForm.reset(); // Clear form
        alertLocationIdInput.value = locationId; // Restore hidden location ID
        loadAlertsForLocation(locationId); // Refresh list
    } catch (error) {
        displayError('alert-error', error.message);
    }
};

const loadAlertsForLocation = async (locationId) => {
    if (!locationId) {
        alertsList.innerHTML = '';
        return;
    }
    alertsList.innerHTML = '<li>Loading alerts...</li>';
    try {
        // We need all alerts for the user, then filter client-side,
        // OR have a dedicated endpoint /api/alerts?locationId=...
        // Let's assume we fetch all and filter here for simplicity,
        // but a backend filter is more efficient.
        // --> Let's modify backend controller/routes first for efficiency.

        // *** Backend Modification Required ***
        // Modify `server/controllers/alertController.js -> getAlerts`
        // Modify `server/routes/alertRoutes.js`
        // To accept an optional query param like `?locationId=...`

        // **Assuming backend is modified:**
        // const alerts = await apiRequest(`/alerts?locationId=${locationId}`);

        // **Current Implementation (Fetch all, filter client-side):**
         const allAlerts = await apiRequest(`/alerts`);
         const locationAlerts = allAlerts.filter(alert => alert.location._id === locationId);
         renderAlerts(locationAlerts);

    } catch (error) {
        console.error('Error loading alerts:', error);
        alertsList.innerHTML = '<li>Error loading alerts.</li>';
         if (error.message.includes('401') || error.message.includes('Not authorized')) {
            showLogin();
        }
    }
};

const renderAlerts = (alerts) => {
    alertsList.innerHTML = ''; // Clear existing list
    if (!alerts || alerts.length === 0) {
        alertsList.innerHTML = '<li>No alerts set for this location.</li>';
        return;
    }
    alerts.forEach(alert => {
        const li = document.createElement('li');
        li.dataset.id = alert._id;
        const conditionText = formatAlertCondition(alert.condition, alert.threshold);
        li.textContent = `${conditionText} (${alert.isEnabled ? 'Enabled' : 'Disabled'})`;

        // Toggle Enable/Disable Button
        const toggleButton = document.createElement('button');
        toggleButton.textContent = alert.isEnabled ? 'Disable' : 'Enable';
        toggleButton.classList.add('toggle-btn');
        if (!alert.isEnabled) toggleButton.classList.add('disabled');
        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            handleToggleAlert(alert._id, !alert.isEnabled);
        });

        // Delete Button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeleteAlert(alert._id);
        });

        const buttonDiv = document.createElement('div');
        buttonDiv.appendChild(toggleButton);
        buttonDiv.appendChild(deleteButton);

        li.appendChild(buttonDiv);
        alertsList.appendChild(li);
    });
};

// Helper to format alert condition for display
const formatAlertCondition = (condition, threshold) => {
    switch (condition) {
        case 'temp_gt': return `Temp > ${threshold}°C`;
        case 'temp_lt': return `Temp < ${threshold}°C`;
        case 'humidity_gt': return `Humidity > ${threshold}%`;
        case 'wind_gt': return `Wind > ${threshold} m/s`;
        case 'rain_likely': return `Rain Likely`; // Threshold might not be displayed simply
        case 'desc_contains': return `Desc. contains "${threshold}"`;
        default: return `${condition} ${threshold}`;
    }
};

const handleToggleAlert = async (alertId, newIsEnabledState) => {
     clearErrors();
     try {
        await apiRequest(`/alerts/${alertId}`, 'PUT', { isEnabled: newIsEnabledState });
        loadAlertsForLocation(selectedLocationId); // Refresh list
     } catch (error) {
          displayError('alert-error', `Failed to update alert status: ${error.message}`);
     }
};


const handleDeleteAlert = async (alertId) => {
    if (confirm('Are you sure you want to delete this alert?')) {
        clearErrors();
        try {
            await apiRequest(`/alerts/${alertId}`, 'DELETE');
            loadAlertsForLocation(selectedLocationId); // Refresh list
        } catch (error) {
             displayError('alert-error', `Failed to delete alert: ${error.message}`);
        }
    }
};

// --- Historical Data ---
const handleGetHistory = async (event) => {
    event.preventDefault();
    clearErrors();
    historyResultsDiv.innerHTML = '<p>Loading history...</p>';

    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!selectedLocationId || !startDate || !endDate) {
        displayError('history-error', 'Please select a location and specify start/end dates.');
         historyResultsDiv.innerHTML = '';
        return;
    }

    try {
        const historyData = await apiRequest(`/weather/history/${selectedLocationId}?startDate=${startDate}&endDate=${endDate}`);
        renderHistory(historyData);
    } catch (error) {
         displayError('history-error', `Failed to load history: ${error.message}`);
         historyResultsDiv.innerHTML = '';
    }
}

const renderHistory = (historyData) => {
     historyResultsDiv.innerHTML = ''; // Clear previous
     if (!historyData || historyData.length === 0) {
         historyResultsDiv.innerHTML = '<p>No historical data found for the selected period.</p>';
         return;
     }

     const table = document.createElement('table');
     table.innerHTML = `
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>Temp (°C)</th>
                <th>Feels Like (°C)</th>
                <th>Humidity (%)</th>
                <th>Wind (m/s)</th>
                <th>Description</th>
                <th>Source</th>
            </tr>
        </thead>
        <tbody>
            ${historyData.map(entry => `
                <tr>
                    <td>${new Date(entry.timestamp).toLocaleString()}</td>
                    <td>${entry.data.temperature?.toFixed(1) ?? 'N/A'}</td>
                    <td>${entry.data.feelsLike?.toFixed(1) ?? 'N/A'}</td>
                    <td>${entry.data.humidity ?? 'N/A'}</td>
                    <td>${entry.data.windSpeed?.toFixed(1) ?? 'N/A'}</td>
                    <td>${entry.data.description ?? 'N/A'}</td>
                    <td>${entry.source}</td>
                </tr>
            `).join('')}
        </tbody>
     `;
     historyResultsDiv.appendChild(table);
};


// --- Initialization and Event Listeners ---

const init = async () => {
    clearErrors();
    currentToken = getToken();

    if (currentToken) {
        // Verify token by fetching user profile
        try {
            const user = await apiRequest('/users/profile');
            if (user) {
                showDashboard(user);
            } else {
                // Token might be invalid or expired
                removeToken();
                showLogin();
            }
        } catch (error) {
            // Handle errors during profile fetch (e.g., token expired)
            console.error("Profile fetch failed:", error);
            removeToken();
            showLogin();
        }
    } else {
        showLogin();
    }

    // Add event listeners based on the current page or elements present
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    if (addLocationForm) {
        addLocationForm.addEventListener('submit', handleAddLocation);
    }
    if (addAlertForm) {
         addAlertForm.addEventListener('submit', handleAddAlert);
    }
    if (historyForm) {
        historyForm.addEventListener('submit', handleGetHistory);
    }
    if (refreshWeatherBtn) {
         refreshWeatherBtn.addEventListener('click', () => {
             if(selectedLocationId) {
                 const selectedLi = document.querySelector(`#locations-list li[data-id='${selectedLocationId}']`);
                 if (selectedLi) {
                     fetchAndDisplayWeather(selectedLi.dataset.city);
                     // Optionally, reload alerts too?
                     // loadAlertsForLocation(selectedLocationId);
                 }
             }
         });
    }
};

// Run initialization when the script loads
document.addEventListener('DOMContentLoaded', init);