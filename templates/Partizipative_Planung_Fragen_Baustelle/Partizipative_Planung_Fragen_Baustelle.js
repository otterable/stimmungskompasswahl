var map = L.map('map', {
    minZoom: 17
}).setView([48.40875, 15.61142], 18);  // Updated center coordinates

var currentDrawnLayer = null;
var selectedToolButton = null;
var currentBaseLayer = 'Standardkarte'; // Default layer

var horizontalOffset = 1000; // 1.0225 km on each side, total 2.25 km
var verticalOffset = 1000; // 0.59375 km on each side, total 1.02875 km

var centerPoint = map.project([48.40875, 15.61142], map.getZoom()); // Updated coordinates
var southWest = map.unproject(centerPoint.subtract([horizontalOffset, verticalOffset]), map.getZoom());
var northEast = map.unproject(centerPoint.add([horizontalOffset, verticalOffset]), map.getZoom());
var bounds = L.latLngBounds(southWest, northEast);

var extendedHorizontalOffset = horizontalOffset + 200; // Add 10 km
var extendedVerticalOffset = verticalOffset + 200; // Add 10 km
var extendedSouthWest = map.unproject(centerPoint.subtract([extendedHorizontalOffset, extendedVerticalOffset]), map.getZoom());
var extendedNorthEast = map.unproject(centerPoint.add([extendedHorizontalOffset, extendedVerticalOffset]), map.getZoom());
var extendedBounds = L.latLngBounds(extendedSouthWest, extendedNorthEast);

map.setMaxBounds(extendedBounds);

map.on('drag', function() {
    if (!extendedBounds.contains(map.getCenter())) {
        // Additional logic if needed
    }
});

var outerBounds = [
    L.latLng(-90, -180),
    L.latLng(90, -180),
    L.latLng(90, 180),
    L.latLng(-90, 180),
    L.latLng(-90, -180)
];

var innerBounds = [
    bounds.getSouthWest(),
    bounds.getNorthWest(),
    bounds.getNorthEast(),
    bounds.getSouthEast(),
    bounds.getSouthWest()
];

var boundary = L.latLngBounds(innerBounds);

var invertedPolygon = L.polygon([outerBounds, innerBounds], {
    color: 'grey',
    fillColor: 'grey',
    fillOpacity: 0.5
}).addTo(map);

L.rectangle(bounds, {
    color: "#808080",
    weight: 2,
    fill: false
}).addTo(map);



var mapboxAccessToken = 'pk.eyJ1Ijoib3R0ZXJhYmxlIiwiYSI6ImNscmhueWFtcjAxMmEybHMwc3V4dnBpdGQifQ.9lMt-_1Pv7IKtdnlM7GQIw';

var mapboxLayers = {
    "Freiluft": L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/tiles/{z}/{x}/{y}?access_token=${mapboxAccessToken}`, {
        minZoom: 15,
        attribution: '&copy; Mapbox'
    }),
    "Licht": L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/{z}/{x}/{y}?access_token=${mapboxAccessToken}`, {
        minZoom: 15,
        attribution: '&copy; Mapbox'
    }),
    "Dunkel": L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/{z}/{x}/{y}?access_token=${mapboxAccessToken}`, {
        minZoom: 15,
        attribution: '&copy; Mapbox'
    })
};

var thunderforestLayers = {
    "Transport": L.tileLayer('https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=5c57f95ca93348f1a37f6572742a5b48', {
        minZoom: 15,
        attribution: 'Tiles © Thunderforest, ....'
    }),
    "Cycle": L.tileLayer('https://tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=5c57f95ca93348f1a37f6572742a5b48', {
        minZoom: 15,
        attribution: 'Tiles © Thunderforest, ....'
    }),
    "Mobile_Atlas": L.tileLayer('https://tile.thunderforest.com/mobile-atlas/{z}/{x}/{y}.png?apikey=5c57f95ca93348f1a37f6572742a5b48', {
        minZoom: 15,
        attribution: 'Tiles © Thunderforest, ....'
    })
};

var esriSatelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    minZoom: 15,
    attribution: '&copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var baseLayers = {
    "Standardkarte": mapboxLayers.Freiluft,
    "Satellit": esriSatelliteLayer,
    "Öffi": thunderforestLayers.Transport,
    "Radwege": thunderforestLayers.Cycle,
    "Hell": mapboxLayers.Licht,
    "Dunkel": mapboxLayers.Dunkel,
    "Kontrast": thunderforestLayers.Mobile_Atlas
};


baseLayers["Standardkarte"].addTo(map);

map.on('baselayerchange', function(e) {
    currentBaseLayer = e.name;
});

L.control.layers(baseLayers).addTo(map);

function createIcon(fillColor) {
    var svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="10" fill="${fillColor}" />
        </svg>`;
    return L.divIcon({
        className: "custom-icon",
        html: svgIcon,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
}

var markersById = {};

function bindPopups(feature, layer) {
    if (feature.properties && feature.properties.customDescription) {
        var popupContent = `<div class='popup-content'>${feature.properties.customDescription}</div>`;
    } else if (feature.properties) {
        var popupContent = "";
        for (var key in feature.properties) {
            popupContent += `<div class='popup-row'><strong>${key}:</strong> ${feature.properties[key]}</div>`;
        }
    }
    layer.bindPopup(popupContent, {
        className: 'custom-popup'
    });
}

var gisData = {{ baustelle.gis_data | tojson | safe }};

L.geoJSON(gisData, {
    pointToLayer: pointToLayer,
    onEachFeature: bindPopups
}).addTo(map);


function pointToLayer(feature, latlng) {
    var fillColor = feature.properties.color || "#ff7800";
    return L.marker(latlng, {
        icon: createIcon(fillColor)
    });
}

function defaultStyle(feature) {
    return {
        fillColor: feature.properties.color || "#ff7800",
        weight: 2,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7
    };
}

if (gisData) {
    L.geoJSON(gisData, {
        pointToLayer: pointToLayer,
        style: defaultStyle,
        onEachFeature: bindPopups
    }).addTo(map);
    console.log("Map loaded with GeoJSON files:", gisData.features.length);
} else {
    console.log("No GeoJSON data to load.");
}

var geojsonLayers = {};

function loadGeoJSONToMap(data, fileName) {
    var geojsonLayer = L.geoJSON(data, {
        pointToLayer: pointToLayer,
        onEachFeature: bindPopups
    }).addTo(map);
    var layerId = L.stamp(geojsonLayer);
    geojsonLayers[layerId] = geojsonLayer;
    addGeoJSONToList(fileName, layerId);
}

function addGeoJSONToList(fileName, layerId) {
    var list = document.getElementById('loadedFiles');
    var listItem = document.createElement('li');
    listItem.innerHTML = `${fileName} 
        <input type="color" onchange="changeLayerColor('${layerId}', this.value)">
        <button onclick="toggleLayerVisibility('${layerId}')">&#128065;</button>`;
    list.appendChild(listItem);
    console.log("GeoJSON file loaded: " + fileName);
    var fileNameSpan = document.createElement('span');
    fileNameSpan.textContent = fileName + " ";
    var colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.onchange = function() {
        var layer = geojsonLayers[layerId];
        if (layer) {
            layer.setStyle({
                color: this.value,
                fillColor: this.value
            });
        }
    };
    var visibilityButton = document.createElement('button');
    visibilityButton.innerHTML = '&#128065;';
    visibilityButton.onclick = function() {
        var layer = geojsonLayers[layerId];
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
            visibilityButton.innerHTML = '&#128065;';
        } else {
            map.addLayer(layer);
            visibilityButton.innerHTML = '&#128065;';
        }
    };
    listItem.appendChild(fileNameSpan);
    listItem.appendChild(colorInput);
    listItem.appendChild(visibilityButton);
    list.appendChild(listItem);
}

function changeLayerColor(layerId, color) {
    var layer = geojsonLayers[layerId];
    if (layer) {
        layer.setStyle({
            color: color,
            fillColor: color
        });
    }
}

function toggleLayerVisibility(layerId) {
    var layer = geojsonLayers[layerId];
    if (map.hasLayer(layer)) {
        map.removeLayer(layer);
    } else {
        map.addLayer(layer);
    }
}

window.closePopup = function() {
    map.closePopup();
};

window.submitQuestion = function(lat, lng) {
    const questionText = document.getElementById('question-text').value;
    const baustelleId = window.location.pathname.split("/").pop();
    if (questionText.trim() === '') {
        alert('Bitte geben Sie eine Frage ein.');
        return;
    }
    const payload = {
        text: questionText,
        author: 'Anonymous',
        baustelle_id: baustelleId,
        latitude: lat,
        longitude: lng,
    };
    fetch('/submit_question', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
    }).then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    }).then(data => {
        console.log(`Question ID ${data.id} by author ${data.author} posted at ${data.date}.`);
        map.closePopup();
        fetchQuestions();
    }).catch(error => console.error('Error:', error));
};

window.submitAnswer = function(questionId, lat, lng) {
    const answerText = document.getElementById(`answer-text-${questionId}`).value;
    if (!answerText.trim()) {
        alert('Please enter an answer.');
        return;
    }
    const payload = {
        answer_text: answerText,
        answered: true,
    };
    fetch(`/answer_question/${questionId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
    }).then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    }).then(data => {
        console.log(`Answer posted for question ID ${questionId}.`);
        map.closePopup();
        fetchQuestions();
    }).catch(error => console.error('Error:', error));
};

function createCustomIcon(answered) {
    const iconUrl = answered ? '/static/baustelle_questionanswered.png' : '/static/baustelle_questionpending.png';
    return L.icon({
        iconUrl: iconUrl,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
}

var isAdmin = JSON.parse('{{ is_admin | tojson }}');
var userId = JSON.parse('{{ user_id | tojson }}');
console.log(`User with ID ${userId} entered the page. User is_admin=${isAdmin}.`);

function generatePopupContent(question) {
    const questionDate = new Date(question.date);
    const formattedQuestionDate = formatDate(questionDate);
    let popupContent = `<strong>Frage:</strong> ${question.text}<br><small>Gefragt am: ${formattedQuestionDate}</small>`;
    if (question.answered && question.answer_text) {
        const answerDate = new Date(question.answer_date);
        const formattedAnswerDate = formatDate(answerDate);
        popupContent += `<br><strong>Antwort:</strong> ${question.answer_text}<br><small>Geantwortet am: ${formattedAnswerDate}</small>`;
    }
    if (isAdmin && !question.answered) {
        popupContent += `
            <hr>
            <div style="text-align: center;">
                <p style="font-size: 16px; font-family: 'Roboto', sans-serif; font-weight: bold;">Beantworten Sie diese Frage und markieren Sie sie als beantwortet!</p>
                <textarea id="answer-text-${question.id}" rows="7" style="width: 100%; box-sizing: border-box; text-align: left; border: 1px solid black; font-size: 16px; font-family: 'Roboto', sans-serif;" placeholder="Ihre Antwort hier..."></textarea>
                <br>
                <button onclick="submitAnswer(${question.id}, ${question.latitude}, ${question.longitude})" class="button" style="background-color: #003056; color: white; margin-right: 5px; font-weight: bold; font-size: 18px;">Antworten</button>
                <button onclick="map.closePopup();" class="button" style="background-color: #9a031e; color: white; margin-left: 5px; font-weight: bold; font-size: 18px;">Abbrechen</button>
            </div>`;
    }
    return popupContent;
}

function fetchQuestions() {
    return new Promise((resolve, reject) => {
        const baustelleId = window.location.pathname.split("/").pop();
        fetch(`/get_questions/${baustelleId}`).then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        }).then(questions => {
            questions.forEach(question => {
                const icon = createCustomIcon(question.answered);
                const marker = L.marker([question.latitude, question.longitude], {
                    icon: icon
                }).addTo(map);
                const questionDate = new Date(question.date);
                const formattedQuestionDate = formatDate(questionDate);
                let popupContent = `<strong>Frage:</strong> ${question.text}<br><small>Gefragt am: ${formattedQuestionDate}</small>`;
                if (question.answered && question.answer_text) {
                    const answerDate = new Date(question.answer_date);
                    const formattedAnswerDate = formatDate(answerDate);
                    popupContent += `<br><strong>Antwort:</strong> ${question.answer_text}<br><small>Geantwortet am: ${formattedAnswerDate}</small>`;
                }
                if (isAdmin && !question.answered) {
                    popupContent += `
                        <hr>
                        <div style="text-align: center;">
                            <p style="font-size: 16px; font-family: 'Roboto', sans-serif; font-weight: bold;">Beantworten Sie diese Frage und markieren Sie sie als beantwortet!</p>
                            <textarea id="answer-text-${question.id}" rows="7" style="width: 100%; box-sizing: border-box; text-align: left; border: 1px solid black; font-size: 16px; font-family: 'Roboto', sans-serif;" placeholder="Ihre Antwort hier..."></textarea>
                            <br>
                            <button onclick="submitAnswer(${question.id}, ${question.latitude}, ${question.longitude})" class="button" style="background-color: #003056; color: white; margin-right: 5px;">Antworten</button>
                            <button onclick="map.closePopup();" class="button" style="background-color: #9a031e; color: white; margin-left: 5px; font-weight: bold; font-size: 18px;">Abbrechen</button>
                        </div>`;
                }
                marker.bindPopup(popupContent);
                marker.on('popupopen', function() {
                    console.log(`Popup for question marker id ${question.id} opened`);
                });
                markersById[question.id.toString()] = marker;
            });
            resolve();
        }).catch(error => {
            console.error('Error fetching questions:', error);
            reject(error);
        });
    });
}

function centerMapOnMarker(markerId) {
    const marker = markersById[markerId];
    if (marker) {
        map.setView(marker.getLatLng(), map.getZoom());
        marker.openPopup();
    } else {
        console.error(`Marker with ID ${markerId} not found.`);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const centerOnMarkerId = urlParams.get('centerOnMarker');
    fetchQuestions().then(() => {
        if (centerOnMarkerId) {
            centerMapOnMarker(centerOnMarkerId);
        }
    });
});

map.on('click', function(e) {
    console.log("Map clicked at:", e.latlng);
    if (bounds.contains(e.latlng)) {
        console.log("Click within bounds");
        if (window.innerWidth <= 768) {
            console.log("Mobile device detected");
            document.getElementById('sidebar').style.display = 'none';
            document.getElementById('map').style.bottom = '15px';
        }
        const popupContent = `
            <div id="question-form" style="text-align: center;">
                <h3>Schreiben Sie eine Frage oder ein Feedback. Es wird für alle anderen sichtbar sein.</h3>
                <textarea id="question-text" class="textarea" rows="7" style="width: 100%; box-sizing: border-box; text-align: left; border: 1px solid black; font-size: 18px; font-weight: bold; font-family: 'Roboto', sans-serif; resize: none;" placeholder="Ihre Frage hier..."></textarea>
                <div style="display: flex; justify-content: center; margin-top: 10px;">
                    <button onclick="submitQuestion(${e.latlng.lat}, ${e.latlng.lng})" class="button" style="background-color: #003056; color: white; margin-right: 5px; font-weight: bold; font-size: 18px;">Posten</button>
                    <button onclick="handleAbbrechenClick()" class="button" style="background-color: #9a031e; color: white; margin-left: 5px; font-weight: bold; font-size: 18px;">Abbrechen</button>
                </div>
            </div>`;
        const popup = L.popup().setLatLng(e.latlng).setContent(popupContent).openOn(map);
        map.on('popupclose', function() {
            if (window.innerWidth <= 768) {
                console.log("Restoring sidebar and map dimensions for mobile");
                document.getElementById('sidebar').style.display = 'block';
                document.getElementById('map').style.bottom = '165px';
                document.getElementById('map').style.right = '';
                document.getElementById('map').style.left = '';
            }
            console.log("Popup closed event triggered");
            closePopup();
        });
    } else {
        console.log("Click outside the designated area: No popup created.");
    }
});

function closePopup() {
    console.log("Closing popup");
    if (window.innerWidth <= 768) {
        console.log("Restoring sidebar and map dimensions for mobile");
        document.getElementById('sidebar').style.display = 'block';
        document.getElementById('map').style.width = '';
        document.getElementById('map').style.right = '';
        document.getElementById('map').style.left = '';
    }
    map.closePopup();
}

function handleAbbrechenClick() {
    console.log("Abbrechen button clicked");
    closePopup();
}

function submitQuestion(lat, lng) {
    console.log("Submitting question at:", lat, lng);
    const questionText = document.getElementById('question-text').value;
    const baustelleId = window.location.pathname.split("/").pop();
    if (questionText.trim() === '') {
        alert('Bitte geben Sie eine Frage ein.');
        return;
    }
    const payload = {
        text: questionText,
        author: 'Anonymous',
        baustelle_id: baustelleId,
        latitude: lat,
        longitude: lng,
    };
    fetch('/submit_question', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    }).then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    }).then(data => {
        console.log(`Question ID ${data.id} by author ${data.author} has been posted on ${data.date} with text ${data.text}, on baustelle_id ${data.baustelle_id}, at ${lat},${lng} coordinates. Question ID has not been answered yet, setting icon to static/baustelle_questionpending.png.`);
        const icon = createCustomIcon(data.answered);
        L.marker([lat, lng], {
            icon: icon
        }).addTo(map).bindPopup(`
            <strong>Frage:</strong> ${data.text}
            <br>
            <small>${data.date}</small>
        `);
        closePopup();
    }).catch(error => console.error('Error:', error));
}

document.addEventListener("DOMContentLoaded", function() {
    console.log("Title Loaded:", document.getElementById("baustelle-title").textContent);
    console.log("Quill Description Loaded:", document.getElementById("baustelle-description").innerHTML);
    const image = document.getElementById("baustelle-image");
    if (image) {
        image.addEventListener("load", function() {
            console.log("Image loaded successfully");
        });
        image.addEventListener("error", function() {
            console.error("Error loading image");
        });
    } else {
        console.log("No image found");
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const editButton = document.querySelector('#edit-baustelle-button');
    const editForm = document.querySelector('#edit-baustelle-form');
    if (editButton) {
        editButton.addEventListener('click', function() {
            editForm.style.display = editForm.style.display === 'none' ? 'block' : 'none';
        });
    }
});

document.addEventListener("DOMContentLoaded", function() {
    const showMarkersBtnMobile = document.getElementById('show-markers-btn-mobile');
    const showMarkersBtnDesktop = document.getElementById('show-markers-btn-desktop');
    const markersListOverlay = document.getElementById('markers-list-overlay');
    const closeOverlayButton = document.getElementById('close-overlay-button');


    closeOverlayButton.addEventListener('click', function() {
        markersListOverlay.style.display = 'none';
      
    });

    function toggleMarkersListOverlay() {
        if (markersListOverlay.style.display === 'block') {
            markersListOverlay.style.display = 'none';
           
        } else {
            markersListOverlay.style.display = 'block';
        
        }
    }
});

document.addEventListener("DOMContentLoaded", function() {
    const showMarkersBtns = document.querySelectorAll('#show-markers-btn');
    showMarkersBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            toggleMarkersListOverlay();
        });
    });
    document.getElementById('close-overlay-button').addEventListener('click', function() {
        document.getElementById('markers-list-overlay').style.display = 'none';
    });
    document.getElementById('question-status-filter').addEventListener('change', function() {
        loadQuestions();
    });
    document.getElementById('question-time-sort').addEventListener('change', function() {
        loadQuestions();
    });
});

function toggleMarkersListOverlay() {
    var markersListOverlay = document.getElementById('markers-list-overlay');
    var isDisplayed = markersListOverlay.style.display === 'block';
    markersListOverlay.style.display = isDisplayed ? 'none' : 'block';
    if (!isDisplayed) {
        loadQuestions();
    }
}

function loadQuestions() {
    const baustelleId = window.location.pathname.split('/').pop();
    fetch(`/get_questions/${baustelleId}`).then(response => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
    }).then(data => {
        const statusFilter = document.getElementById('question-status-filter').value;
        const timeSort = document.getElementById('question-time-sort').value;
        let filteredData = data;
        if (statusFilter === 'answered') {
            filteredData = data.filter(question => question.answered);
        } else if (statusFilter === 'unanswered') {
            filteredData = data.filter(question => !question.answered);
        }
        if (timeSort === 'newest') {
            filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else if (timeSort === 'oldest') {
            filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));
        }
        renderQuestions(filteredData);
    }).catch(error => console.error('Error fetching questions:', error));
}

function renderQuestions(questions) {
    const markersList = document.getElementById('markers-list');
    markersList.innerHTML = '';
    questions.forEach(question => {
        const item = document.createElement('li');
        item.innerHTML = formatQuestionListItem(question);
        item.dataset.markerId = question.id.toString();
        item.addEventListener('click', function() {
            console.log(`Question marker ID ${this.dataset.markerId} clicked inside markers-overlay, centering the map on question marker ID ${this.dataset.markerId} and opening its popup`);
            const marker = markersById[this.dataset.markerId];
            if(marker) {
                map.setView(marker.getLatLng(), map.getZoom());
                marker.setPopupContent(generatePopupContent(question));
                marker.openPopup();
            }
            if (window.innerWidth < 1080) {
                toggleMarkersListOverlay();
            }
        });
        markersList.appendChild(item);
    });
}

function formatQuestionListItem(question) {
    return `
        <div style="border-bottom: 1px solid #ccc; padding: 10px;">
            <p>
                <strong>Frage:</strong>
                <span class="question-text">${question.text}</span>
            </p>
            <p>Gefragt am: 
                <span class="question-date">${formatDate(new Date(question.date))}</span>
            </p>
            ${question.answered ? `
            <p>
                <strong>Antwort:</strong>
                <span class="answer-text">${question.answer_text}</span>
            </p>
            <p>Geantwortet am: 
                <span class="answer-date">${formatDate(new Date(question.answer_date))}</span>
            </p>` : ''}
        </div>`;
}

function formatDate(utcDateString) {
    let utcDate = new Date(utcDateString);
    let localDate = new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000);
    let targetDate = new Date(localDate.getTime() + (1 * 60 * 60000));
    if (isDST(targetDate)) {
        targetDate = new Date(targetDate.getTime() + (1 * 60 * 60000));
    }
    let day = targetDate.getDate().toString().padStart(2, '0');
    let month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
    let year = targetDate.getFullYear();
    return `${day}.${month}.${year}`;
}

function isDST(date) {
    let jan = new Date(date.getFullYear(), 0, 1);
    let jul = new Date(date.getFullYear(), 6, 1);
    return date.getTimezoneOffset() < Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

Date.prototype.stdTimezoneOffset = function() {
    const jan = new Date(this.getFullYear(), 0, 1);
    const jul = new Date(this.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

document.getElementById('close-overlay-button').addEventListener('click', function() {
    document.getElementById('markers-list-overlay').style.display = 'none';
});




document.getElementById('close-overlay-button').addEventListener('click', function() {
    var markersListOverlay = document.getElementById('markers-list-overlay');
    var showMarkersBtn = document.getElementById('show-markers-btn');
    markersListOverlay.style.display = 'none';
    showMarkersBtn.innerText = 'Liste anzeigen';
    console.debug("Close overlay button clicked");
});

function adjustOverlayDisplayForDevice() {
    const navOverlay = document.getElementById('nav-overlay');
    const screenWidth = window.innerWidth;
    if (screenWidth > 1080) {
        navOverlay.style.display = 'block';
    } else {
        navOverlay.style.display = 'none';
    }
}

const closeOverlayButton = document.getElementById('close-overlay-button');
if (closeOverlayButton) {
    closeOverlayButton.addEventListener('click', function() {
        document.getElementById('markers-list-overlay').style.display = 'none';
    });
}

const closeOverlayBtn = document.getElementById('close-overlay-btn');
if (closeOverlayBtn) {
    closeOverlayBtn.addEventListener('click', function() {
        document.getElementById('nav-overlay').style.display = 'none';
    });
}

adjustOverlayDisplayForDevice();
window.addEventListener('resize', adjustOverlayDisplayForDevice);

function toggleNavOverlay() {
    var navOverlay = document.getElementById('nav-overlay');
    if (navOverlay.style.display === 'block') {
        navOverlay.style.display = 'none';
    } else {
        navOverlay.style.display = 'block';
    }
}

document.getElementById('nav-overlay').addEventListener('click', function(event) {
    if (window.innerWidth <= 1080 && !event.target.closest('button, a')) {
        toggleNavOverlay();
    }
});

document.getElementById('hamburger-button').addEventListener('click', toggleNavOverlay);

window.addEventListener('resize', function() {
    var navOverlay = document.getElementById('nav-overlay');
    if (window.innerWidth > 1080) {
        navOverlay.style.display = 'block';
    } else {
        navOverlay.style.display = 'none';
    }
});

window.onload = function() {
    var navOverlay = document.getElementById('nav-overlay');
    if (window.innerWidth > 1080) {
        navOverlay.style.display = 'block';
    } else {
        navOverlay.style.display = 'none';
    }
};

document.getElementById('close-overlay-btn').addEventListener('click', function() {
    document.getElementById('nav-overlay').classList.remove('nav-overlay-active');
});
