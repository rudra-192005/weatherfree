// No API key needed for Open-Meteo! It's completely free [citation:4]
const BASE_URL = 'https://api.open-meteo.com/v1';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const currentLocationBtn = document.getElementById('currentLocationBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const currentWeather = document.getElementById('currentWeather');
const forecastSection = document.getElementById('forecastSection');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');

// Weather display elements
const cityName = document.getElementById('cityName');
const dateTime = document.getElementById('dateTime');
const weatherIcon = document.getElementById('weatherIcon');
const temperature = document.getElementById('temperature');
const feelsLike = document.getElementById('feelsLike');
const weatherDesc = document.getElementById('weatherDesc');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const pressure = document.getElementById('pressure');
const visibility = document.getElementById('visibility');
const forecastContainer = document.getElementById('forecastContainer');

// Weather condition mapping (Open-Meteo uses WMO codes)
const weatherCodes = {
    0: { description: 'Clear sky', icon: '01d' },
    1: { description: 'Mainly clear', icon: '02d' },
    2: { description: 'Partly cloudy', icon: '03d' },
    3: { description: 'Overcast', icon: '04d' },
    45: { description: 'Fog', icon: '50d' },
    48: { description: 'Depositing rime fog', icon: '50d' },
    51: { description: 'Light drizzle', icon: '09d' },
    53: { description: 'Moderate drizzle', icon: '09d' },
    55: { description: 'Dense drizzle', icon: '09d' },
    56: { description: 'Light freezing drizzle', icon: '09d' },
    57: { description: 'Dense freezing drizzle', icon: '09d' },
    61: { description: 'Slight rain', icon: '10d' },
    63: { description: 'Moderate rain', icon: '10d' },
    65: { description: 'Heavy rain', icon: '10d' },
    66: { description: 'Light freezing rain', icon: '13d' },
    67: { description: 'Heavy freezing rain', icon: '13d' },
    71: { description: 'Slight snow fall', icon: '13d' },
    73: { description: 'Moderate snow fall', icon: '13d' },
    75: { description: 'Heavy snow fall', icon: '13d' },
    77: { description: 'Snow grains', icon: '13d' },
    80: { description: 'Slight rain showers', icon: '09d' },
    81: { description: 'Moderate rain showers', icon: '09d' },
    82: { description: 'Violent rain showers', icon: '09d' },
    85: { description: 'Slight snow showers', icon: '13d' },
    86: { description: 'Heavy snow showers', icon: '13d' },
    95: { description: 'Thunderstorm', icon: '11d' },
    96: { description: 'Thunderstorm with slight hail', icon: '11d' },
    99: { description: 'Thunderstorm with heavy hail', icon: '11d' }
};

// Event Listeners
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getCoordinatesFromCity(city);
    } else {
        showError('Please enter a city name');
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            getCoordinatesFromCity(city);
        } else {
            showError('Please enter a city name');
        }
    }
});

currentLocationBtn.addEventListener('click', getCurrentLocation);

// Get coordinates from city name using geocoding API
async function getCoordinatesFromCity(city) {
    try {
        showLoading();
        hideError();
        
        console.log('Searching for city:', city);
        
        const response = await fetch(
            `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
        );
        
        if (!response.ok) {
            throw new Error('Geocoding service error');
        }
        
        const data = await response.json();
        console.log('Geocoding data:', data);
        
        if (!data.results || data.results.length === 0) {
            throw new Error(`City "${city}" not found`);
        }
        
        const { latitude, longitude, name, country } = data.results[0];
        
        // Store city info for display
        window.currentCityInfo = { name, country };
        
        // Get weather data using coordinates
        getWeatherByCoordinates(latitude, longitude);
        
    } catch (error) {
        console.error('Geocoding error:', error);
        hideLoading();
        showError(error.message);
    }
}

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                window.currentCityInfo = { name: 'Your Location', country: '' };
                getWeatherByCoordinates(latitude, longitude);
            },
            (error) => {
                hideLoading();
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        showError('Please allow location access to use this feature');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        showError('Location information is unavailable');
                        break;
                    case error.TIMEOUT:
                        showError('Location request timed out');
                        break;
                    default:
                        showError('An unknown error occurred');
                }
            }
        );
    } else {
        showError('Geolocation is not supported by your browser');
    }
}

// Get weather by coordinates (Open-Meteo doesn't need an API key!) [citation:4]
async function getWeatherByCoordinates(lat, lon) {
    try {
        showLoading();
        hideError();
        
        console.log('Fetching weather for coordinates:', lat, lon);
        
        // Fetch current weather and forecast in one call
        const response = await fetch(
            `${BASE_URL}/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m,visibility` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max` +
            `&timezone=auto&forecast_days=5`
        );
        
        if (!response.ok) {
            throw new Error('Weather service error');
        }
        
        const data = await response.json();
        console.log('Weather data:', data);
        
        displayWeather(data);
        displayForecast(data);
        hideLoading();
        
    } catch (error) {
        console.error('Weather fetch error:', error);
        hideLoading();
        showError(error.message);
        currentWeather.style.display = 'none';
        forecastSection.style.display = 'none';
    }
}

// Display current weather
function displayWeather(data) {
    // Display city name if available
    if (window.currentCityInfo) {
        cityName.textContent = window.currentCityInfo.country 
            ? `${window.currentCityInfo.name}, ${window.currentCityInfo.country}`
            : window.currentCityInfo.name;
    } else {
        cityName.textContent = 'Current Location';
    }
    
    const now = new Date();
    dateTime.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const current = data.current;
    const weatherCode = current.weather_code;
    const weatherInfo = weatherCodes[weatherCode] || { description: 'Unknown', icon: '01d' };
    
    // Use OpenWeatherMap icons (they're freely available)
    weatherIcon.src = `https://openweathermap.org/img/wn/${weatherInfo.icon}@4x.png`;
    weatherIcon.alt = weatherInfo.description;
    
    temperature.textContent = `${Math.round(current.temperature_2m)}°C`;
    feelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)}°C`;
    weatherDesc.textContent = weatherInfo.description;
    
    humidity.textContent = `${current.relative_humidity_2m}%`;
    windSpeed.textContent = `${current.wind_speed_10m} km/h`;
    pressure.textContent = `${Math.round(current.pressure_msl)} hPa`;
    visibility.textContent = current.visibility ? `${(current.visibility / 1000).toFixed(1)} km` : 'N/A';
    
    currentWeather.style.display = 'block';
}

// Display 5-day forecast
function displayForecast(data) {
    const daily = data.daily;
    
    forecastContainer.innerHTML = '';
    
    for (let i = 0; i < daily.time.length; i++) {
        const date = new Date(daily.time[i]);
        const weatherCode = daily.weather_code[i];
        const weatherInfo = weatherCodes[weatherCode] || { description: 'Unknown', icon: '01d' };
        
        const card = document.createElement('div');
        card.className = 'forecast-card';
        
        card.innerHTML = `
            <div class="date">${date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            })}</div>
            <img src="https://openweathermap.org/img/wn/${weatherInfo.icon}.png" 
                 alt="${weatherInfo.description}">
            <div class="temp">${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°</div>
            <div class="desc">${weatherInfo.description}</div>
            <div class="humidity">💨 ${Math.round(daily.wind_speed_10m_max[i])} km/h</div>
        `;
        
        forecastContainer.appendChild(card);
    }
    
    forecastSection.style.display = 'block';
}

// Utility functions
function showLoading() {
    loadingSpinner.style.display = 'block';
    currentWeather.style.display = 'none';
    forecastSection.style.display = 'none';
    errorMessage.style.display = 'none';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'flex';
    currentWeather.style.display = 'none';
    forecastSection.style.display = 'none';
}

function hideError() {
    errorMessage.style.display = 'none';
}

// Initial load - show weather for a default city
window.addEventListener('load', () => {
    getCoordinatesFromCity('London');
});
