// Ensure isSpam function is defined
if (typeof isSpam === 'undefined') {
    window.isSpam = function() {
        return false;
    };
}

let questionCategoryColors = {};

function fetchQuestionCategoryColors() {
    console.debug("Fetching question category colors");
    fetch('/get_all_question_category_colors')
        .then(response => response.json())
        .then(data => {
            questionCategoryColors = data;
            console.debug("Fetched question category colors", questionCategoryColors);
            updateCategoryButtonColors();
        })
        .catch(error => console.error('Error fetching question category colors:', error));
}

document.addEventListener('DOMContentLoaded', fetchQuestionCategoryColors);

var swearWords = {
    "de": [],
    "en": []
};

// Function to load swear words from filter.json
function loadSwearWords() {
    console.debug("Loading swear words from filter.json");
    fetch('/static/filter.json').then(response => response.json()).then(data => {
        swearWords = data;
        console.debug("Loaded swear words", swearWords);
    }).catch(error => console.error('Error loading swear words:', error));
}

// Call this function when the page loads
loadSwearWords();

var userLoggedIn = {{ 'true' if current_user.is_authenticated else 'false' }};
console.debug("User logged in status:", userLoggedIn);

// Initialize the map
var map = L.map('map').setView([48.4102, 15.6022], 15);
var currentDrawnLayer = null;
var selectedToolButton = null;
var currentBaseLayer = 'Standardkarte'; // Default layer
var horizontalOffset = 1125; // 1.0225 km on each side, total 2.25 km
var verticalOffset = 594; // 0.59375 km on each side, total 1.02875 km
var centerPoint = map.project([48.4102, 15.6022], map.getZoom());
var southWest = map.unproject(centerPoint.subtract([horizontalOffset, verticalOffset]), map.getZoom());
var northEast = map.unproject(centerPoint.add([horizontalOffset, verticalOffset]), map.getZoom());
var bounds = L.latLngBounds(southWest, northEast);
var extendedHorizontalOffset = horizontalOffset + 1000; // Add 10 km
var extendedVerticalOffset = verticalOffset + 1000; // Add 10 km
var extendedSouthWest = map.unproject(centerPoint.subtract([extendedHorizontalOffset, extendedVerticalOffset]), map.getZoom());
var extendedNorthEast = map.unproject(centerPoint.add([extendedHorizontalOffset, extendedVerticalOffset]), map.getZoom());
var extendedBounds = L.latLngBounds(extendedSouthWest, extendedNorthEast);
map.setMaxBounds(extendedBounds);
map.on('drag', function() {
    if (!extendedBounds.contains(map.getCenter())) {}
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
    console.debug("Base layer changed to:", currentBaseLayer);
    updateMarkerIcons();
});
L.control.layers(baseLayers).addTo(map);

let futureMarker = {
    icon: null,
    category: '',
    description: ''
};

function createIcon(pinSize, outlineSize, fillColor, isFeatured) {
    var adjustedPinSize = currentBaseLayer === 'Satellit' ? pinSize * 2.5 : pinSize * 1.5;
    var strokeColor = currentBaseLayer === 'Satellit' ? 'white' : fillColor;
    var strokeWidth = currentBaseLayer === 'Satellit' ? 5 : outlineSize * 10;
    var strokeOpacity = currentBaseLayer === 'Satellit' ? 1 : 0.5;
    var starSize = adjustedPinSize / 2;
    var starEmoji = isFeatured ? `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="${starSize}" fill="yellow">⭐</text>` : '';
    var blackOutline = isFeatured ? `<circle cx="${adjustedPinSize / 2}" cy="${adjustedPinSize / 2}" r="${adjustedPinSize / 4 + 2}" stroke="black" stroke-width="2" fill="none" />` : '';
    var svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${adjustedPinSize}" height="${adjustedPinSize}" viewBox="0 0 ${adjustedPinSize} ${adjustedPinSize}">
            <circle cx="${adjustedPinSize / 2}" cy="${adjustedPinSize / 2}" r="${adjustedPinSize / 4}" fill="${fillColor}" />
            <circle cx="${adjustedPinSize / 2}" cy="${adjustedPinSize / 2}" r="${adjustedPinSize / 4}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="none" stroke-opacity="${strokeOpacity}" />
            ${blackOutline}
            ${starEmoji}
        </svg>`;
    return L.icon({
        iconUrl: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgIcon)))}`,
        iconSize: [adjustedPinSize, adjustedPinSize],
        iconAnchor: [adjustedPinSize / 2, adjustedPinSize / 2],
        popupAnchor: [0, -adjustedPinSize / 2]
    });
}

function createCursorIcon(fillColor) {
    var svgCursorIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${fillColor}" /></svg>`;
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgCursorIcon)))}`;
}

var isMarkerCreationActive = false;
function setMapCursor() {
    var cursorIconUrl = futureMarker.icon;
    document.getElementById('map').style.cursor = `url('${cursorIconUrl}') 12 12, auto`;
    isMarkerCreationActive = true;
    console.debug("Map cursor set for marker creation");
}

function handleMapClick(e) {
    if (isMarkerCreationActive) {
        if (boundary.contains(e.latlng)) {
            selectedLatLng = e.latlng;
            var tempMarker = L.marker(e.latlng, {
                icon: createIcon(24, 2, getCategoryColor(futureMarker.category))
            }).addTo(map);
            showCustomConfirm(selectedLatLng, tempMarker);
        }
    }
}
map.on('click', handleMapClick);

function showCustomConfirm(latlng, tempMarker) {
    var confirmDiv = document.getElementById('custom-confirm');
    confirmDiv.style.display = 'block';
    document.getElementById('confirm-yes').onclick = function() {
        saveMarkerData(latlng, futureMarker.category, futureMarker.description, function(savedMarkerData) {
            map.removeLayer(tempMarker);
            addNewMarker(latlng, futureMarker.category, futureMarker.description, savedMarkerData.id);
        });
        confirmDiv.style.display = 'none';
        resetMapCursor();
        isMarkerCreationActive = false;
    };
    document.getElementById('confirm-tryagain').onclick = function() {
        map.removeLayer(tempMarker);
        confirmDiv.style.display = 'none';
        isMarkerCreationActive = true;
        setMapCursor();
    };
    document.getElementById('confirm-no').onclick = function() {
        map.removeLayer(tempMarker);
        confirmDiv.style.display = 'none';
        resetMapCursor();
        isMarkerCreationActive = false;
    };

    function addNewMarker(latLng, category, description, markerId) {
        var fillColor = getCategoryColor(category);
        var popupContent = `<div style="text-align: center;">${description}</div>`;
        var marker = L.marker(latLng, {
            icon: createIcon(24, 2, fillColor, false),
            category: category,
            isMapObject: true,
            isAnswer: false, // Ensure it's not an answer marker
            isFeatured: false
        }).addTo(map);
        marker.bindPopup(popupContent);
        marker.markerId = markerId;
        if (!categoryLayers[category]) {
            categoryLayers[category] = L.layerGroup().addTo(map);
        }
        marker.addTo(categoryLayers[category]);
        updateCategoryButtonText(category);
        console.debug(`Marker created via regular mode, category "${category}", with description "${description}". Marker is not an answer marker, setting is_answer=false, and is_mapobject=true.`);
    }

    function updateCategoryButtonText(category) {
        var button = document.querySelector(`button[category-name="${category}"]`);
        if (button && categoryLayers[category]) {
            button.innerText = `${category} (${categoryLayers[category].getLayers().length} Beiträge)`;
        }
    }
    document.getElementById('confirm-tryagain').onclick = function() {
        map.removeLayer(tempMarker);
        confirmDiv.style.display = 'none';
        isMarkerCreationActive = true;
        setMapCursor();
    };
    document.getElementById('confirm-no').onclick = function() {
        map.removeLayer(tempMarker);
        confirmDiv.style.display = 'none';
        resetMapCursor();
        isMarkerCreationActive = false;
    };
}
function resetMapCursor() {
    document.getElementById('map').style.cursor = '';
    isMarkerCreationActive = false;
    console.debug("Map cursor reset after marker creation");
}

function openMarkerOverlay(event) {
    var overlay = document.getElementById('marker-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '10000';
        updateMarkerCategoryDescription();
    }
    if (event) {
        event.stopPropagation();
    }
}

function initializeEventListeners() {
    document.getElementById('marker-description').addEventListener('click', function() {});
    console.debug("Event listeners initialized");
}
initializeEventListeners();

function updateMarkerCategoryDescription() {
    const categorySelect = document.getElementById("marker-category");
    const categoryDescription = document.getElementById("marker-category-description");
    const selectedOption = categorySelect.value;
    let categoryText = "";
    switch (selectedOption) {
        case "Transport":
            categoryText = "Wünschen Sie sich einen neuen Radweg? Eine neue Busverbindung? Gibt es Probleme mit dem Parken?";
            break;
        case "Öffentliche Plätze":
            categoryText = "Sollen öffentliche Plätze umgestaltet werden? Braucht es mehr Grünflächen?";
            break;
        case "Umwelt":
            categoryText = "Ist Ihnen Umweltverschmutzung aufgefallen? Haben Sie Ideen, um die Stadt sauberer, ökologischer oder Zukunftsfit zu machen?";
            break;
        case "Verwaltung":
            categoryText = "Gibt es Ideen für bessere Dienste der Verwaltung? Projektvorschläge, öffentliche Veranstaltungen betreffen?";
            break;
        case "Kultur":
            categoryText = "Gibt es Ideen für Veranstaltungen, Kunstinstallationen, Theater oder Literatur?";
            break;
        case "Bildung":
            categoryText = "Welche Dinge im Bereich der Bildung, Schulen und Hochschulen können wir als Gemeinde verbessern?";
            break;
        case "Gesundheit":
            categoryText = "Ideen zum Thema Gesundheit? Verbesserungsvorschläge für medizinische Einrichtungen oder gesundheitsfördernde Maßnahmen?";
            break;
        case "Sport":
            categoryText = "Ideen zu Sportveranstaltungen, Sportplätzen oder städtischen Kursen?";
            break;
        case "Andere":
            categoryText = "Haben Sie einen eigenen Vorschlag, der in keine der genannten Kategorien passt? Teilen Sie Ihre Idee uns mit!";
            break;
        default:
            categoryText = "Bitte wählen Sie eine Kategorie aus.";
            break;
    }
    categoryDescription.textContent = categoryText;
    console.debug("Marker category description updated to:", categoryText);
}

function containsSwearWords(text, language) {
    var words = swearWords[language] || [];
    var textWords = text.toLowerCase().split(/\s+/);
    return textWords.some(word => words.includes(word));
}

function postMarker() {
    var markerDescriptionTextarea = document.getElementById('marker-description');
    var description = markerDescriptionTextarea.value;

    if (containsSwearWords(description, 'de') || containsSwearWords(description, 'en')) {
        alert("Bitte entfernen Sie unangebrachte Ausdrücke aus Ihrer Beschreibung.");
        return;
    }
    if (isSpam(description)) {
        alert("Ihr Text scheint Spam zu enthalten. Bitte überprüfen Sie ihn und versuchen Sie es erneut.");
        return;
    }
    if (description.length < 15) {
        alert("Bitte geben Sie mindestens 15 Zeichen ein.");
        return;
    }
    var markerOverlay = document.getElementById('marker-overlay');
    if (markerOverlay) {
        markerOverlay.style.display = 'none';
    } else {
        return;
    }
    var selectedCategory = document.getElementById('marker-category').value;
    futureMarker.category = selectedCategory;
    futureMarker.description = description;
    var fillColor = getCategoryColor(selectedCategory);
    futureMarker.icon = createCursorIcon(fillColor);
    setMapCursor();
    document.getElementById('marker-description').value = '';
    console.debug("Marker posted with description:", description);
}


function toggleMarkerSidebar() {
    var sidebar = document.getElementById('sidebar');
    var mapElement = document.getElementById('map');
    if (sidebar.style.display === 'none' || sidebar.style.display === '') {
        sidebar.style.display = 'block';
        mapElement.classList.add('sidebar-visible');
    } else {
        sidebar.style.display = 'none';
        mapElement.classList.remove('sidebar-visible');
    }
    console.debug("Marker sidebar toggled");
}

var allMarkers = [];
var filteredMarkers = [];
var displayedMarkersCount = 0;
const markersPerPage = 20; // Number of markers per page, increased to 20 as per the requirement
const categoryColors = {
    'Transport': '#133873',
    'Öffentliche Plätze': '#ff5c00',
    'Umwelt': '#4CAF50',
    'Verwaltung': '#653993',
    'Kultur': '#431307',
    'Bildung': '#eab003',
    'Gesundheit': '#9A031E',
    'Sport': '#3d4f53',
    'Andere': '#212121'
};



function updateShowMoreButton() {
    const showMoreButton = document.getElementById('show-more-markers');
    if (filteredMarkers.length <= displayedMarkersCount || filteredMarkers.length <= markersPerPage) {
        showMoreButton.style.display = 'none';
    } else {
        showMoreButton.style.display = 'block';
    }
    console.debug("Show more button updated");
}

function loadMoreMarkers() {
    const paginatedMarkers = paginateMarkers(currentPage, markersPerPage);
    const list = document.getElementById('markers-list');
    
    paginatedMarkers.forEach(marker => {
        const listItem = document.createElement('li');
        const dateText = document.createElement('span');
        dateText.textContent = new Date(marker.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        dateText.style.color = 'black';
        dateText.style.fontWeight = 'normal';
        dateText.style.display = 'block';
        const prefixAndCategory = document.createElement('span');
        let prefix = marker.is_answer ? "Answer: " : (marker.is_mapobject ? "Notiz: " : "Projektvorschlag: ");
        prefixAndCategory.innerHTML = `<strong style="color: black;">${prefix}</strong><strong style="color: ${categoryColors[marker.category] || 'black'};">${marker.category}</strong>`;
        prefixAndCategory.style.display = 'block';
        const displayText = document.createElement('span');
        displayText.textContent = marker.is_answer ? marker.descriptionwhy : (marker.is_mapobject ? marker.descriptionwhy : marker.name);
        displayText.style.color = 'black';
        const link = document.createElement('a');
        link.href = "#";
        link.style.textDecoration = 'none';
        link.appendChild(dateText);
        link.appendChild(prefixAndCategory);
        link.appendChild(displayText);
        link.onclick = function() {
            centerMapOnMarker(marker.id);
            return false;
        };
        listItem.appendChild(link);
        list.appendChild(listItem);
    });

    displayedMarkersCount += paginatedMarkers.length;
    currentPage++;
    updateShowMoreButton();
    console.debug("More markers loaded");
}

function paginateMarkers(page, markersPerPage) {
    const startIndex = (page - 1) * markersPerPage;
    const endIndex = startIndex + markersPerPage;
    return filteredMarkers.slice(startIndex, endIndex);
}

function renderPage(page) {
    currentPage = parseInt(page);
    const list = document.getElementById('markers-list');
    list.innerHTML = '';
    displayedMarkersCount = 0;
    loadMoreMarkers();
    console.debug("Page rendered:", page);
}

function sortMarkers(sortType) {
    if (sortType === "Neueste") {
        filteredMarkers.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortType === "Älteste") {
        filteredMarkers.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    renderPage(1);
    console.debug("Markers sorted by:", sortType);
}

function filterByCategory(category) {
    filterMarkers();
    console.debug("Filtered by category:", category);
}

function createCategoryFilter() {
    const filterDiv = document.getElementById('category-filter');
    filterDiv.innerHTML = '';
    
    const select = document.createElement('select');
    select.id = 'category-select';
    select.onchange = function() {
        filterByCategory(this.value);
    };
    
    // Fetch categories dynamically from the server
    fetch('/get_categories')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const categories = ["Alle", ...data.categories];
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.innerText = category;
                    select.appendChild(option);
                });
            } else {
                console.error('Failed to fetch categories:', data.error);
            }
        })
        .catch(error => console.error('Error fetching categories:', error));
    
    filterDiv.appendChild(select);
    console.debug("Category filter created");
}

function createSortFilter() {
    const sortDiv = document.getElementById('sort-filter');
    sortDiv.innerHTML = '';
    const select = document.createElement('select');
    select.id = 'sort-select';
    select.onchange = function() {
        sortMarkers(this.value);
    };
    const sortOptions = ["Neueste", "Älteste"];
    sortOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.innerText = option;
        select.appendChild(optionElement);
    });
    sortDiv.appendChild(select);
    console.debug("Sort filter created");
}



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




window.addEventListener('resize', function() {
    renderPage(currentPage);
    console.debug("Window resized, page rendered");
});

document.getElementById('show-markers-btn').addEventListener('click', function() {
    var markersListOverlay = document.getElementById('markers-list-overlay');
    var showMarkersBtn = this;
    if (markersListOverlay.style.display === 'block') {
        markersListOverlay.style.display = 'none';
        showMarkersBtn.innerText = 'Liste anzeigen';
    } else {
        createSortFilter();
        markersListOverlay.style.display = 'block';
        renderPage(1);
        showMarkersBtn.innerText = 'Liste ausblenden';
    }
    console.debug("Show markers button clicked");
});

document.getElementById('close-overlay-button').addEventListener('click', function() {
    var markersListOverlay = document.getElementById('markers-list-overlay');
    var showMarkersBtn = document.getElementById('show-markers-btn');
    markersListOverlay.style.display = 'none';
    showMarkersBtn.innerText = 'Liste anzeigen';
    console.debug("Close overlay button clicked");
});




























let showAnswersOnly = false;
var answerMarkers = [];
var nonAnswerMarkers = [];
var markersListOverlay = document.getElementById('markers-list-overlay');
var markersById = {};
var showFullProjectsOnly = false;
var currentPage = 1;
createCategoryFilter();
createSortFilter();
createFullProjectFilter();
renderPage(currentPage);


// Add event listeners to both buttons in karte.html
document.getElementById('hideNonMapMarkers').addEventListener('click', function() {
    toggleFullProjectFilter();
    syncFullProjectFilterButtons();
});

document.querySelector('.register-button-cl').addEventListener('click', function() {
    toggleFullProjectFilter();
    syncFullProjectFilterButtons();
});


function addMarkersToOverlay(markers) {
    allMarkers = markers;
    displayedMarkersCount = 0;
    filterMarkers();
    createCategoryFilter();
    createSortFilter();
    createFullProjectFilter();
    console.debug("Markers added to overlay:", allMarkers);
}

function filterMarkers() {
    let tempMarkers = allMarkers;
    const selectedCategory = document.getElementById('category-select') ? document.getElementById('category-select').value : "Alle";
    
    if (selectedCategory !== "Alle") {
        tempMarkers = tempMarkers.filter(marker => marker.category === selectedCategory);
    }
    if (showFullProjectsOnly) {
        tempMarkers = tempMarkers.filter(marker => !marker.is_mapobject);
    }
    filteredMarkers = tempMarkers.slice().sort((a, b) => b.id - a.id); // Sort by newest
    renderPage(1);
    updateShowMoreButton();
    updateMapMarkers();
    console.debug("Markers filtered:", filteredMarkers);
}

function updateMapMarkers() {
    for (var category in categoryLayers) {
        categoryLayers[category].eachLayer(function(marker) {
            if (showFullProjectsOnly && marker.options.isMapObject) {
                map.removeLayer(marker);
            } else if (!map.hasLayer(marker)) {
                map.addLayer(marker);
            }
        });
    }
    console.debug("Map markers updated");
}


function createFullProjectFilter() {
    const filterDiv = document.getElementById('full-project-filter');
    filterDiv.innerHTML = '';
    const filterButton = document.createElement('button');
    filterButton.id = 'full-project-filter-button';
    filterButton.className = 'register-button-cl';
    filterButton.textContent = 'Nur Projektvorschläge anzeigen';
    filterButton.addEventListener('click', function() {
        toggleFullProjectFilter();
        syncFullProjectFilterButtons();
    });
    filterDiv.appendChild(filterButton);
    console.debug("Full project filter created");
}

function toggleFullProjectFilter() {
    showFullProjectsOnly = !showFullProjectsOnly;
    filterMarkers();
    updateFullProjectFilterButtonText();
    console.debug("Full project filter toggled, showFullProjectsOnly:", showFullProjectsOnly);
}

function updateFullProjectFilterButtonText() {
    const filterButton = document.getElementById('full-project-filter-button');
    if (filterButton) {
        filterButton.textContent = showFullProjectsOnly ? 'Alles anzeigen' : 'Nur Projektvorschläge anzeigen';
    }
}

function syncFullProjectFilterButtons() {
    const mapButton = document.getElementById('hideNonMapMarkers');
    const overlayButton = document.getElementById('full-project-filter-button');
    if (mapButton) {
        mapButton.textContent = showFullProjectsOnly ? 'Alles anzeigen' : 'Nur Projektvorschläge anzeigen';
    }
    if (overlayButton) {
        overlayButton.textContent = showFullProjectsOnly ? 'Alles anzeigen' : 'Nur Projektvorschläge anzeigen';
    }
}


function sortMarkersByNewest(markers) {
    return markers.sort((a, b) => new Date(b.date) - new Date(a.date));
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

fetch('/get_projects')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Remove the filtering step, so all projects are included
        const sortedData = sortMarkersByNewest(data);
        addMarkers(sortedData);
        createCategoryButtons();
        updateCategoryButtonColors();
        addMarkersToOverlay(sortedData);
        console.debug("Projects fetched and processed");
    })
    .catch(error => {
        console.error('Failed to fetch projects:', error);
    });

document.addEventListener('DOMContentLoaded', function() {

    // Add event listener for the toggle button
    document.getElementById('toggle-answer-markers-btn').addEventListener('click', function() {
        toggleAnswerMarkers();
    });

    // Initial log of markers when page loads
    logMarkerCounts();
});

function toggleAnswerMarkers() {
    showAnswersOnly = !showAnswersOnly;
    if (showAnswersOnly) {
        hideAllNonAnswerMarkers();
        console.debug(`${answerMarkers.length} answer markers have been shown`);
    } else {
        showAllMarkers();
        console.debug(`${answerMarkers.length} answer markers have been hidden`);
    }
    updateAnswerToggleButtonText();
}

function hideAllNonAnswerMarkers() {
    nonAnswerMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
}

function showAllMarkers() {
    nonAnswerMarkers.forEach(marker => {
        map.addLayer(marker);
    });
}

function updateAnswerToggleButtonText() {
    const toggleButton = document.getElementById('toggle-answer-markers-btn');
    if (toggleButton) {
        toggleButton.textContent = showAnswersOnly ? 'Alle Markierungen anzeigen' : 'Antwortmarkierungen ein-/ausblenden';
    }
}

// Function to log marker counts
function logMarkerCounts() {
    let notizenCount = 0;
    let projektvorschlageCount = 0;
    let answerCount = 0;

    for (let id in markersById) {
        const marker = markersById[id];
        if (marker.options.isAnswer) {
            answerCount++;
        } else if (marker.options.isMapObject) {
            notizenCount++;
        } else {
            projektvorschlageCount++;
        }
    }

    console.debug(`${Object.keys(markersById).length} markers have been loaded. ${notizenCount} are Notizen, ${projektvorschlageCount} are Projektvorschläge, ${answerCount} are answer markers.`);
}




































function addMarkers(projects) {
    projects.forEach(project => {
        if (project.geoloc) {
            var coords = project.geoloc.split(',');
            var latLng = L.latLng(parseFloat(coords[0]), parseFloat(coords[1]));
            var fillColor = getCategoryColor(project.category);
            var isFeatured = project.is_featured;
            var popupContent;
            var formattedDate = new Date(project.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            var totalVotes = project.upvotes + project.downvotes;
            var upvotePercentage = totalVotes > 0 ? ((project.upvotes / totalVotes) * 100).toFixed(1) : 0;
            var downvotePercentage = totalVotes > 0 ? ((project.downvotes / totalVotes) * 100).toFixed(1) : 0;

            if (project.is_mapobject) {
                popupContent = `
                    <div style="text-align: center;">
                        <span style="color: grey;">${formattedDate}</span><br>
                        <strong style="color: ${fillColor};">${project.category}</strong><br>
                        ${project.descriptionwhy}
                    </div>`;
            } else if (project.is_answer) {
                popupContent = `
                    <div style="text-align: center;">
                        <span style="color: grey;">${formattedDate}</span><br>
                        <strong>Question: ${project.category}</strong><br>
                        <p>${project.descriptionwhy}</p>
                    </div>`;
            } else {
                var upvoteButtonStyle = project.upvoted_by_user ? 'background-color: #4caf50;' : '';
                var downvoteButtonStyle = project.downvoted_by_user ? 'background-color: #9a031e;' : '';
                var votingDetailsHtml = ``;
                var votingBarHtml = `
                    <div class="voting-bar" style="margin-top: 1px;">
                        <div class="upvotes" style="width: ${upvotePercentage}%;"></div>
                        <div class="downvotes" style="width: ${downvotePercentage}%;"></div>
                    </div>
                `;
               popupContent = `
    <div style="text-align: center; z-index:2000 !important">
        <span style="color: grey;">${formattedDate}</span><br>
        <strong style="color: ${fillColor};">${project.category}</strong><br>
        <b>${project.name}</b>
        <br>
        <img src="/static/usersubmissions/${project.image_file}" style="width:500px; height:auto; object-fit: contain; display: block; margin: 10px auto; border-radius: 30px;">
        ${votingDetailsHtml}
        ${votingBarHtml}
        <div style="display: flex; justify-content: space-around; align-items: center; margin-top: 10px;">
            <button onmouseover="this.style.backgroundColor='#66c46a'" onmouseout="this.style.backgroundColor='#4caf50'" onclick="vote(${project.id}, 'upvote')" id="upvote-button-${project.id}" class="vote-button circle-btn upvote" style="background-color: #4caf50; ${upvoteButtonStyle}">👍</button>
            <span id="upvote-count-${project.id}" style="font-weight: bold; margin: 0 10px;">${project.upvotes}</span>
            <a href="/Partizipative_Planung_Vorschlag/${project.id}" target="_blank" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" class="button-hover-effect" style="font-size: 16px; font-weight: bold; color:white !important; text-decoration: none; background-color: #1a1a1a; border-radius: 30px; display: flex; flex-grow: 1; justify-content: center; align-items: center; padding: 10px; margin: 0 10px; transition: transform 0.3s ease, background-color 0.3s ease;">
                Details
            </a>
            <span id="downvote-count-${project.id}" style="font-weight: bold; margin: 0 10px;">${project.downvotes}</span>
            <button onmouseover="this.style.backgroundColor='#cc5045'" onmouseout="this.style.backgroundColor='#9A031E'" onclick="vote(${project.id}, 'downvote')" id="downvote-button-${project.id}" class="vote-button circle-btn downvote" style="background-color: #9A031E; ${downvoteButtonStyle}">👎</button>
        </div>
    </div>
`;

            }

            var marker = L.marker(latLng, {
                icon: createIcon(24, 2, fillColor, isFeatured),
                category: project.category,
                isMapObject: project.is_mapobject,
                isAnswer: project.is_answer,
                isFeatured: isFeatured
            }).addTo(map);
            marker.bindPopup(popupContent);
            map.on('popupopen', function(e) {
                var popupContent = e.popup.getContent();
                var tempDiv = document.createElement('div');
                tempDiv.innerHTML = popupContent;
                var upvoteElement = tempDiv.querySelector('[id^="upvote-count-"]');
                if (upvoteElement) {
                    var projectId = upvoteElement.id.replace('upvote-count-', '');
                    setInitialVoteBarStyles(projectId);
                }
            });
            markersById[project.id] = marker;
            if (project.is_answer) {
                answerMarkers.push(marker);
                console.debug(`Marker created via Guide mode, answering "${project.descriptionwhy}" to question title "${project.category}". Marker is an answer marker, is_answer=true has been assigned. is_mapobject=false.`);
            } else {
                nonAnswerMarkers.push(marker);
                console.debug(`Marker created via regular mode, category "${project.category}", with description "${project.descriptionwhy}". Marker is not an answer marker, setting is_answer=false, and is_mapobject=true.`);
            }
            if (!categoryLayers[project.category]) {
                categoryLayers[project.category] = L.layerGroup().addTo(map);
            }
            marker.addTo(categoryLayers[project.category]);
        }
    });

    // Log marker counts after markers are added
    logMarkerCounts();
}

function updateMarkerIcons() {
    for (var category in categoryLayers) {
        categoryLayers[category].eachLayer(function(marker) {
            var pinSize = 24;
            var outlineSize = 2;
            var fillColor = getCategoryColor(marker.options.category);
            var isFeatured = marker.options.isFeatured;
            var newIcon = createIcon(pinSize, outlineSize, fillColor, isFeatured);
            marker.setIcon(newIcon);
        });
    }
    console.debug("Marker icons updated");
}

document.addEventListener('click', function(event) {
    if (event.target.closest('.voting-bar, .upvotes, .downvotes')) {
        return;
    }
    var markerOverlay = document.getElementById('marker-overlay');
    var overlayContent = document.getElementById('overlay-content');
    var navOverlay = document.getElementById('nav-overlay');
    var videoOverlay = document.getElementById('video-overlay');
    var videoOverlay2 = document.getElementById('video-overlay-2');
    if (navOverlay && navOverlay.contains(event.target)) {
        return;
    }
    if (videoOverlay && videoOverlay.contains(event.target)) {
        return;
    }
    if (videoOverlay2 && videoOverlay2.contains(event.target)) {
        return;
    }
    if (markerOverlay && markerOverlay.style.display !== 'none' && !overlayContent.contains(event.target)) {
        markerOverlay.style.display = 'none';
    }
});
function getCategoryColor(category) {
    const categoryColors = {
        'Transport': '#133873',
        'Öffentliche Plätze': '#ff5c00',
        'Umwelt': '#4CAF50',
        'Verwaltung': '#653993',
        'Kultur': '#431307',
        'Bildung': '#eab003',
        'Gesundheit': '#9A031E',
        'Sport': '#3d4f53',
        'Andere': '#212121'
    };

    // Check if the category is a standard one with hardcoded color
    if (categoryColors.hasOwnProperty(category)) {
        return categoryColors[category];
    }

    // Use cached color for question/answer categories
    return questionCategoryColors[category] || '#888'; // Default color if not found
}

var categoryLayers = {};
function logSelectedCategory() {
    var selectedCategory = document.getElementById('marker-category').value;
    console.debug("Selected category:", selectedCategory);
}

function pointToLayer(feature, latlng) {
    var fillColor = feature.properties.color || "#ff7800";
    return L.marker(latlng, {
        icon: createIcon(fillColor)
    });
}


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





function defaultStyle(feature) {
    return {
        fillColor: feature.properties.color || "#ff7800",
        weight: 2,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7
    };
}


var gisData = {{ baustelle.gis_data | tojson | safe }};

L.geoJSON(gisData, {
    pointToLayer: pointToLayer,
    onEachFeature: bindPopups
}).addTo(map);

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














































// Make sure to add `isAnswer` property to your markers in addMarkers function


document.getElementById('guided-mode-button').addEventListener('click', function() {
    document.getElementById('guided-mode-modal').style.display = 'flex';
    console.debug("Guided mode modal opened");
});

document.getElementById('start-guided-mode').addEventListener('click', function() {
    document.getElementById('guided-mode-modal').style.display = 'none';
    document.getElementById('question-modal').style.display = 'flex';
    console.debug("Guided mode started");
    // Additional logic to start the guided mode
});

document.getElementById('cancel-guided-mode').addEventListener('click', function() {
    document.getElementById('guided-mode-modal').style.display = 'none';
    console.debug("Guided mode cancelled");
});

document.getElementById('cancel-qa-mode').addEventListener('click', function() {
    document.getElementById('question-modal').style.display = 'none';
    console.debug("QA mode cancelled");
});

function updatePopupContent(projectId, data) {
    var popup = markersById[projectId].getPopup();
    var popupContentDiv = document.createElement('div');
    popupContentDiv.innerHTML = popup.getContent();

    var originalUpvoteCountElement = popupContentDiv.querySelector(`#upvote-count-${projectId}`);
    var originalDownvoteCountElement = popupContentDiv.querySelector(`#downvote-count-${projectId}`);
    if (originalUpvoteCountElement) originalUpvoteCountElement.innerText = data.upvote_count;
    if (originalDownvoteCountElement) originalDownvoteCountElement.innerText = data.downvote_count;

    var newUpvoteCountElement = popupContentDiv.querySelector(`#new-upvote-count-${projectId}`);
    var newDownvoteCountElement = popupContentDiv.querySelector(`#new-downvote-count-${projectId}`);
    if (newUpvoteCountElement) newUpvoteCountElement.innerText = data.upvote_count;
    if (newDownvoteCountElement) newDownvoteCountElement.innerText = data.downvote_count;

    popup.setContent(popupContentDiv.innerHTML);
    markersById[projectId].bindPopup(popup).openPopup();
}

function setInitialVoteBarStyles(projectId) {
    document.querySelectorAll('.voting-bar').forEach(votingBar => {
        const upvoteElement = votingBar.querySelector('.upvotes');
        const downvoteElement = votingBar.querySelector('.downvotes');
        const upvotePercentage = parseFloat(upvoteElement.style.width);
        const downvotePercentage = parseFloat(downvoteElement.style.width);
        if (upvotePercentage > 0 && downvotePercentage > 0) {
            upvoteElement.style.borderRadius = '30px 0 0 30px';
            downvoteElement.style.borderRadius = '0 30px 30px 0';
        } else if (upvotePercentage > 0) {
            upvoteElement.style.borderRadius = '30px';
            downvoteElement.style.borderRadius = '0';
        } else if (downvotePercentage > 0) {
            downvoteElement.style.borderRadius = '30px';
            upvoteElement.style.borderRadius = '0';
        }
        upvoteElement.onclick = function() {
            vote(projectId, 'upvote');
        };
        downvoteElement.onclick = function() {
            vote(projectId, 'downvote');
        };
    });
}
document.addEventListener('DOMContentLoaded', function() {
    setInitialVoteBarStyles();
    console.debug("Initial vote bar styles set");
});

function vote(projectId, voteType) {
    if (!userLoggedIn) {
        alert("Melden Sie sich an, um über Projekte abzustimmen.");
        return;
    }
    fetch(`/vote/${projectId}/${voteType}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            'project_id': projectId,
            'vote_type': voteType
        })
    }).then(response => response.json()).then(data => {
        if (data.success) {
            updateVotingUI(projectId, data);
            console.debug("Vote registered for project:", projectId, "vote type:", voteType);
        }
    }).catch(error => console.error('Error during voting:', error));
}

function updateVotingUI(projectId, data) {
    var openPopup = null;
    map.eachLayer(function(layer) {
        if (layer.getPopup && layer.getPopup() && layer.getPopup().isOpen()) {
            openPopup = layer.getPopup();
        }
    });
	
    if (markersById[projectId] && markersById[projectId].getPopup().isOpen()) {
        const popup = markersById[projectId].getPopup();
        const popupContent = popup.getContent();
        const parser = new DOMParser();
        const popupDom = parser.parseFromString(popupContent, 'text/html');

        const upvoteCountElement = popupDom.getElementById(`upvote-count-${projectId}`);
        const downvoteCountElement = popupDom.getElementById(`downvote-count-${projectId}`);
        if (upvoteCountElement) upvoteCountElement.textContent = data.upvote_count;
        if (downvoteCountElement) downvoteCountElement.textContent = data.downvote_count;

        const upvotesBar = popupDom.querySelector('.upvotes');
        const downvotesBar = popupDom.querySelector('.downvotes');
        if (upvotesBar && downvotesBar) {
            const upvotePercentage = data.upvote_percentage.toFixed(1);
            const downvotePercentage = data.downvote_percentage.toFixed(1);
            upvotesBar.style.width = `${upvotePercentage}%`;
            downvotesBar.style.width = `${downvotePercentage}%`;

            upvotesBar.style.borderRadius = data.upvote_count > 0 && data.downvote_count > 0 ? '30px 0 0 30px' : '30px';
            downvotesBar.style.borderRadius = data.upvote_count > 0 && data.downvote_count > 0 ? '0 30px 30px 0' : '30px';
        }

        popup.setContent(new XMLSerializer().serializeToString(popupDom.documentElement));
    }
    setInitialVoteBarStyles(projectId);
    console.debug("Voting UI updated for project:", projectId);
}

function adjustBorderRadius(upvoteElement, downvoteElement, upvoteCount, downvoteCount) {
    if (upvoteCount > 0 && downvoteCount > 0) {
        upvoteElement.style.borderRadius = '30px 0 0 30px';
        downvoteElement.style.borderRadius = '0 30px 30px 0';
    } else if (upvoteCount > 0 && downvoteCount === 0) {
        upvoteElement.style.borderRadius = '30px';
    } else if (upvoteCount === 0 && downvoteCount > 0) {
        downvoteElement.style.borderRadius = '30px';
    }
}



function containsSwearWords(text, language) {
    var words = swearWords[language] || [];
    var textWords = text.toLowerCase().split(/\s+/);
    return textWords.some(word => words.includes(word));
}

function centerMapOnMarker(markerId) {
    var marker = markersById[markerId];
    if (marker) {
        var markerLatLng = marker.getLatLng();
        var popup = marker.getPopup();

        // Calculate popup size based on predefined dimensions
        var popupWidth = window.innerWidth <= 1080 ? 300 : 500; // 300px for mobile, 500px for desktop
        var popupHeight = popupWidth * (3 / 4); // Maintain 4:3 aspect ratio
        popupHeight += 40; // Adding extra pixels for margins and other elements

        console.debug(`Popup clicked, popup size ${popupWidth} x ${popupHeight} px expected, image size ${popupWidth} x ${popupHeight * 3 / 4} expected.`);

        // Get the map container dimensions
        var mapDiv = document.getElementById('map');
        var mapWidth = mapDiv.clientWidth;
        var mapHeight = mapDiv.clientHeight;

        console.debug(`Map div is currently ${mapWidth} px wide and ${mapHeight} px high on this device.`);

        // Calculate marker position within the map container
        var markerPoint = map.latLngToContainerPoint(markerLatLng);
        var markerFromTop = markerPoint.y;
        var markerFromLeft = markerPoint.x;
        var markerFromRight = mapWidth - markerPoint.x;
        var markerFromBottom = mapHeight - markerPoint.y;

        console.debug(`Marker is currently within ${markerFromTop} px from the top border of "map" div, ${markerFromLeft} px from the left border, ${markerFromRight} px from right border, and ${markerFromBottom} px from bottom border.`);

        // Adjust offsets to ensure the popup fits within the map view
        var xOffset = 0;
        var yOffset = 0;

        if (markerFromTop < popupHeight / 2 + 10) { // Popup height / 2 + some margin
            yOffset = popupHeight / 2 + 10 - markerFromTop;
        }
        if (markerFromBottom < popupHeight / 2 + 10) {
            yOffset = -(popupHeight / 2 + 10 - markerFromBottom);
        }

        if (markerFromLeft < popupWidth / 2 + 10) {
            xOffset = popupWidth / 2 + 10 - markerFromLeft;
        }
        if (markerFromRight < popupWidth / 2 + 10) {
            xOffset = -(popupWidth / 2 + 10 - markerFromRight);
        }

        console.debug(`Centering marker so that the whole popup fits within the map div of the device. Offsets calculated: xOffset = ${xOffset}, yOffset = ${yOffset}.`);

        // Calculate the new center of the map
        var point = map.project(markerLatLng, map.getZoom()).subtract([xOffset, yOffset]);
        var newCenter = map.unproject(point, map.getZoom());

        // Set the map view to the new position
        map.setView(newCenter, map.getZoom());

        // Open the popup after a short delay to allow the map to finish moving
        setTimeout(function() {
            marker.openPopup();
        }, 00); // 300 milliseconds delay

        // Close the markers list overlay on mobile and tablet, and update button text
        if (window.innerWidth <= 1080) {
            var sidebar = document.getElementById('markers-list-overlay');
            sidebar.style.display = 'none';
            var showMarkersBtn = document.getElementById('show-markers-btn');
            showMarkersBtn.innerText = 'Liste anzeigen';
        }
    }
}

function createCategoryButtons() {
    var container = document.getElementById('category-toggle-buttons');
    for (var category in categoryLayers) {
        var wrapperDiv = document.createElement('div');
        wrapperDiv.style.textAlign = 'center';
        var button = document.createElement('button');
        button.innerText = `${category} (${categoryLayers[category].getLayers().length} Beiträge)`;
        button.setAttribute('category-name', category);
        button.style.fontWeight = 'bold';
        button.style.lineHeight = '1';
        button.style.cursor = 'pointer';
        button.style.textDecoration = 'none';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.width = '97%';
        button.style.height = 'auto';
        button.style.boxSizing = 'border-box';
        button.style.transition = 'background-color 0.2s ease-in-out';
        button.style.borderRadius = '30px';
        button.style.textAlign = 'center';
        button.style.border = 'none';
        button.style.outline = 'none';
        button.style.boxShadow = 'none';
        button.style.flexGrow = '1';
        button.style.flexShrink = '1';
        button.style.padding = '7px';
        button.style.margin = '7px auto';
        button.style.fontSize = '18px';
        button.style.color = 'white';
        button.style.backgroundColor = getCategoryColor(category);
        applyButtonStyles(button);
        setButtonState(button, category);
        if (!map.hasLayer(categoryLayers[category])) {
            button.classList.add('faded');
        }
        button.onclick = function() {
            toggleCategory(this.innerText);
            setButtonState(this, this.getAttribute('category-name'));
        };
        wrapperDiv.appendChild(button);
        container.appendChild(wrapperDiv);
    }
    console.debug("Category buttons created");
}

function setButtonState(button, category) {
    if (map.hasLayer(categoryLayers[category])) {
        button.classList.remove('faded');
    } else {
        button.classList.add('faded');
    }
}

function applyButtonStyles(button) {
    button.style.fontWeight = 'bold';
}

function toggleCategory(categoryName) {
    for (var category in categoryLayers) {
        if (categoryLayers.hasOwnProperty(category)) {
            var layer = categoryLayers[category];
            var button = document.querySelector(`button[category-name="${category}"]`);
            if (categoryName === `${category} (${layer.getLayers().length} Beiträge)`) {
                if (map.hasLayer(layer)) {
                    map.removeLayer(layer);
                    button.classList.add('faded');
                } else {
                    map.addLayer(layer);
                    button.classList.remove('faded');
                }
            }
        }
    }
    console.debug("Category toggled:", categoryName);
}

function updateCategoryButtonColors() {
    const categoryButtons = document.querySelectorAll('#category-toggle-buttons button');
    categoryButtons.forEach(button => {
        const buttonText = button.textContent.trim();
        const categoryMatch = buttonText.match(/^(.*?)(?=\s*\()/);
        const category = categoryMatch ? categoryMatch[0].trim() : "";
        const color = getCategoryColor(category);
        if (color) {
            button.style.backgroundColor = color;
        }
    });
    console.debug("Category button colors updated");
}
updateCategoryButtonColors();

let selectedLatLng;

function saveMarkerData(latlng, category, description, callback) {
    var isAuthenticated = false
    var dataToSend = {
        lat: latlng.lat,
        lng: latlng.lng,
        category: category,
        description: description,
        isAnonymous: !isAuthenticated,
        is_mapobject: category !== 'Answer',
        is_answer: category === 'Answer'
    };
    $.ajax({
        url: '/add_marker',
        method: 'POST',
        data: JSON.stringify(dataToSend),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        success: function(response) {
            if (callback) {
                callback(response);
            }
            checkMarkerLimit();
            console.debug("Marker data saved:", response);
        },
        error: function(xhr, textStatus, errorThrown) {
            if (xhr.status === 429) {
                alert("Sie haben Ihr Tageslimit für das Hinzufügen von Markierungen erreicht. Versuchen Sie es später noch einmal.");
            }
            console.error('Error saving marker data:', errorThrown);
        }
    });
}

function checkMarkerLimit() {
    fetch('/check_marker_limit').then(response => response.json()).then(data => {
        const limitInfoElement = document.getElementById('limit-info');
        if (data.limit_reached) {
            document.getElementById('add-marker-button').disabled = true;
            document.getElementById('open-overlay').disabled = true;
            startTimer(data.reset_time);
            limitInfoElement.textContent = `Sie haben Ihr Tageslimit von ${data.max_limit} Markierungen erreicht.`;
        } else {
            const markersRemaining = data.max_limit - data.current_count;
        }
        console.debug("Marker limit checked:", data);
    }).catch(error => {
        const limitInfoElement = document.getElementById('limit-info');
        limitInfoElement.textContent = "Fehler beim Abrufen der Marker-Limit-Informationen.";
        console.error('Error checking marker limit:', error);
    });
}
document.addEventListener('DOMContentLoaded', function() {
    checkMarkerLimit();
});
function startTimer(expiryTime) {
    if (!expiryTime) return;
    var countDownDate = new Date(expiryTime).getTime();
    var addButton = document.getElementById('add-marker-button');
    var overlayButton = document.getElementById('open-overlay');
    var interval = setInterval(function() {
        var now = new Date().getTime();
        var distance = countDownDate - now;
        var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((distance % (1000 * 60)) / (1000 * 60));
        var seconds = Math.floor((distance % (1000 * 60)) / 1000);
        var timerText = `Limit erreicht, läuft in ${hours}h${minutes}m ab`;
        addButton.innerText = timerText;
        overlayButton.innerText = timerText;
        if (distance < 0) {
            clearInterval(interval);
            addButton.innerText = "Hinzufügen";
            addButton.disabled = false;
            overlayButton.innerText = "Hinzufügen";
            overlayButton.disabled = false;
        }
    }, 1000);
    console.debug("Timer started for marker limit reset:", expiryTime);
}
function updateTextareaCharCountFeedback(textareaElement, feedbackElement, minLimit, maxLimit) {
    var charCount = textareaElement.value.length;
    var charRemaining = maxLimit - charCount;
    if (charCount < minLimit) {
        feedbackElement.textContent = `Sie müssen noch ${minLimit - charCount} Zeichen eingeben.`;
    } else if (charCount <= maxLimit) {
        feedbackElement.textContent = `Sie können noch ${charRemaining} Zeichen eingeben.`;
    } else {
        feedbackElement.textContent = "Zeichenlimit erreicht.";
        textareaElement.value = textareaElement.value.substring(0, maxLimit);
    }
    feedbackElement.style.color = '#003056';
    console.debug("Textarea character count feedback updated");
}
var markerDescriptionTextarea = document.getElementById('marker-description');
var markerDescriptionFeedback = document.createElement('div');
markerDescriptionFeedback.id = 'markerDescriptionFeedback';
markerDescriptionTextarea.parentNode.insertBefore(markerDescriptionFeedback, markerDescriptionTextarea.nextSibling);
markerDescriptionTextarea.addEventListener('input', function() {
    updateTextareaCharCountFeedback(markerDescriptionTextarea, markerDescriptionFeedback, 15, 300);
});
updateTextareaCharCountFeedback(markerDescriptionTextarea, markerDescriptionFeedback, 15, 300);

const closeOverlayBtns = document.querySelectorAll("[onclick^='closeVideoOverlay']");
    closeOverlayBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const overlayId = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            document.getElementById(overlayId).style.display = 'none';
            console.debug("Video overlay closed:", overlayId);
        });
    });

document.getElementById('close-overlay-button').addEventListener('click', function() {
    document.getElementById('markers-list-overlay').style.display = 'none';
    console.debug("Markers list overlay closed");
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
    console.debug("Overlay display adjusted for device");

function toggleNavOverlay() {
    var navOverlay = document.getElementById('nav-overlay');
    if (navOverlay.style.display === 'block') {
        navOverlay.style.display = 'none';
    } else {
        navOverlay.style.display = 'block';
    }
    console.debug("Nav overlay toggled");
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

document.addEventListener('DOMContentLoaded', function() {
    var submitButton = document.getElementById('add-marker-button');
    submitButton.addEventListener('click', validateMarkerDescription);
    console.debug("Submit button event listener added");
});

function validateMarkerDescription(event) {
    var description = document.getElementById('marker-description').value;
    if (isSpam(description)) {
        event.preventDefault();
        return false;
    }
    console.debug("Marker description validated");
}

document.getElementById('info-link').addEventListener('click', function(e) {
    e.preventDefault();
    handleMobileRedirectOrOverlay('youtube-iframe', 'video-overlay', 'aXB8KE_gpm8', 'V7EjnHuLZjI');
    console.debug("Info link clicked");
});
document.getElementById('info-link2').addEventListener('click', function(e) {
    e.preventDefault();
    handleMobileRedirectOrOverlay('youtube-iframe-2', 'video-overlay-2', '9-bWivUusZ4', '9xEXWG8TybY');
    console.debug("Info link 2 clicked");
});

function handleMobileRedirectOrOverlay(iframeId, overlayId, desktopVideoId, mobileVideoId) {
    var iframe = document.getElementById(iframeId);
    var videoUrl = 'https://www.youtube.com/watch?v=' + mobileVideoId;
    var videoId = window.innerWidth > 1080 ? desktopVideoId : mobileVideoId;
    
    if (window.innerWidth <= 1080) {
        if (confirm('Sie werden zur YouTube weitergeleitet, um das Video anzusehen. Akzeptieren?')) {
            window.location.href = videoUrl;
        } else {
            console.log('User declined to be redirected.');
        }
    } else {
        iframe.src = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&mute=1&enablejsapi=1';
        document.getElementById(overlayId).style.display = 'flex';
        console.debug('Video overlay opened for desktop.');
    }
}

function closeVideoOverlay(iframeId, overlayId) {
    var iframe = document.getElementById(iframeId);
    if (iframe.src) {
        iframe.src = '';
    }
    document.getElementById(overlayId).style.display = 'none';
    console.debug('Video overlay closed:', overlayId);
}

var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player, player2;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-iframe', {
        videoId: 'aXB8KE_gpm8',
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
    player2 = new YT.Player('youtube-iframe-2', {
        videoId: '9-bWivUusZ4',
        events: {
            'onStateChange': onPlayerStateChange2
        }
    });
    console.debug("YouTube Iframe API ready");
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        showReplayImage('youtube-iframe', 'replay-container');
    }
}

function onPlayerStateChange2(event) {
    if (event.data === YT.PlayerState.ENDED) {
        showReplayImage('youtube-iframe-2', 'replay-container-2');
    }
}

function showReplayImage(iframeId, containerId) {
    var iframe = document.getElementById(iframeId);
    iframe.style.display = 'none';
    var replayContainer = document.getElementById(containerId);
    replayContainer.style.display = 'flex';
    var replayImg = document.createElement('img');
    replayImg.id = 'replay-image';
    replayImg.src = '{{ url_for("static", filename="replay.png") }}';
    replayImg.addEventListener('click', function() {
        replayVideo(iframeId, containerId);
    });
    replayContainer.innerHTML = '';
    replayContainer.appendChild(replayImg);
    console.debug("Replay image shown for:", iframeId);
}

function replayVideo(iframeId, containerId) {
    var replayContainer = document.getElementById(containerId);
    replayContainer.style.display = 'none';
    var iframe = document.getElementById(iframeId);
    iframe.style.display = 'block';
    var playerToUse = iframeId === 'youtube-iframe' ? player : player2;
    playerToUse.seekTo(0);
    playerToUse.playVideo();
    console.debug("Video replayed for:", iframeId);
}

document.getElementById('video-overlay').addEventListener('click', function(event) {
    if (!event.target.closest('#youtube-iframe, #replay-image')) {
        closeVideoOverlay('youtube-iframe', 'video-overlay');
    }
});
document.getElementById('video-overlay-2').addEventListener('click', function(event) {
    if (!event.target.closest('#youtube-iframe-2, #replay-image')) {
        closeVideoOverlay('youtube-iframe-2', 'video-overlay-2');
    }
});



document.addEventListener('DOMContentLoaded', function() {
    let currentQuestionset = null;
    let currentQuestionIndex = 0;
    let answers = [];
    let tempMarker = null;

    function openGuidedModeModal() {
        console.log("Guided Mode button clicked.");
        fetch('/get_questionsets')
            .then(response => response.json())
            .then(questionsets => {
                const select = document.getElementById('questionset-select');
                if (!select) {
                    console.error("Questionset select element not found.");
                    return;
                }
                select.innerHTML = '';
                questionsets.forEach(qs => {
                    const option = document.createElement('option');
                    option.value = qs.id;
                    option.textContent = qs.title;
                    select.appendChild(option);
                });
                document.getElementById('guided-mode-modal').style.display = 'flex';
            })
            .catch(error => {
                console.error("Error fetching question sets:", error);
            });
    }

    function startGuidedMode() {
        const questionsetId = document.getElementById('questionset-select').value;
        fetch(`/get_questionset/${questionsetId}`)
            .then(response => response.json())
            .then(questionset => {
                currentQuestionset = questionset;
                currentQuestionIndex = 0;
                answers = [];
                document.getElementById('guided-mode-modal').style.display = 'none';
                showQuestionModal();
            })
            .catch(error => {
                console.error("Error fetching questionset:", error);
            });
    }

    function showQuestionModal() {
        if (currentQuestionIndex < currentQuestionset.questions.length) {
            const question = currentQuestionset.questions[currentQuestionIndex];
            document.getElementById('question-title').textContent = question.title;
            document.getElementById('question-description').textContent = question.description;
            document.getElementById('next-question').textContent = 'Next';
            document.getElementById('question-modal').style.display = 'flex';
            updateSummaryContent();
        } else {
            console.log("All questions have been answered.");
            document.getElementById('question-title').textContent = "All questions have been answered.";
            document.getElementById('question-description').textContent = "Press Finish to submit all answers.";
            document.getElementById('next-question').textContent = 'Finish';
            document.getElementById('question-modal').style.display = 'flex';
            updateSummaryContent();
        }
    }

    function updateSummaryContent() {
        const summaryContent = document.getElementById('summary-content');
        summaryContent.innerHTML = `
            <h2>Summary of Answers</h2>
            <p>Amount of Questions answered: ${answers.length} / ${currentQuestionset.questions.length}</p>
            <ul>
                ${answers.map((answer, index) => `
                    <li><strong>${index + 1}. ${currentQuestionset.questions.find(q => q.id === answer.question_id).title}</strong>: ${answer.answer_text}</li>
                `).join('')}
            </ul>
        `;
    }

    function handleMapClick(e) {
        const question = currentQuestionset.questions[currentQuestionIndex];
        const answerText = prompt('Enter your answer:');
        if (answerText) {
            answers.push({
                question_id: question.id,
                answer_text: answerText,
                latitude: e.latlng.lat,
                longitude: e.latlng.lng
            });

            saveMarkerData(e.latlng, question.title, answerText, function(savedMarkerData) {
                addNewMarker(e.latlng, question.title, answerText, savedMarkerData.id, question.marker_color);
                map.off('click', handleMapClick);
                currentQuestionIndex++;
                showQuestionModal();
            });
        }
    }

    function submitAnswers() {
        console.log("Submitting answers:", answers);
        fetch(`/answer_questionset/${currentQuestionset.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ answers })
        })
        .then(response => {
            console.log("Response status:", response.status);
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text); });
            }
            return response.json();
        })
        .then(data => {
            console.log("Server response data:", data);
            alert(data.message);
            document.getElementById('question-modal').style.display = 'none';
        })
        .catch(error => {
            console.error("Error submitting answers:", error);
            alert("Error submitting answers: " + error.message);
        });
    }

    document.getElementById('guided-mode-button').addEventListener('click', openGuidedModeModal);
    document.getElementById('start-guided-mode').addEventListener('click', startGuidedMode);
    document.getElementById('cancel-guided-mode').addEventListener('click', () => {
        document.getElementById('guided-mode-modal').style.display = 'none';
    });
    document.getElementById('answer-question').addEventListener('click', () => {
        map.on('click', handleMapClick);
        document.getElementById('question-modal').style.display = 'none';
    });
    document.getElementById('next-question').addEventListener('click', () => {
        if (currentQuestionIndex < currentQuestionset.questions.length) {
            currentQuestionIndex++;
            showQuestionModal();
        } else {
            console.log("No more questions to answer.");
            document.getElementById('question-title').textContent = "All questions have been answered.";
            document.getElementById('question-description').textContent = "Press Finish to submit all answers.";
            document.getElementById('next-question').textContent = 'Finish';
        }
    });
    document.getElementById('cancel-qa-mode').addEventListener('click', () => {
        document.getElementById('question-modal').style.display = 'none';
    });
    document.getElementById('next-question').addEventListener('click', () => {
        if (currentQuestionIndex >= currentQuestionset.questions.length) {
            submitAnswers();
        }
    });

    function addNewMarker(latLng, title, description, markerId, color) {
        var fillColor = color || getCategoryColor(title);
        var popupContent = `<div style="text-align: center;"><strong>${title}</strong><br>${description}</div>`;
        var marker = L.marker(latLng, {
            icon: createIcon(24, 2, fillColor, false),
            category: title,
            isMapObject: false,
            isAnswer: true,
            isFeatured: false
        }).addTo(map);
        marker.bindPopup(popupContent);
        marker.markerId = markerId;
        if (!categoryLayers[title]) {
            categoryLayers[title] = L.layerGroup().addTo(map);
        }
        marker.addTo(categoryLayers[title]);
        updateCategoryButtonText(title);
        console.debug("New marker added for question:", title);
    }

    function saveMarkerData(latlng, category, description, callback) {
        var dataToSend = {
            lat: latlng.lat,
            lng: latlng.lng,
            category: category,
            description: description,
            is_mapobject: false,
            is_answer: true
        };
        $.ajax({
            url: '/add_marker',
            method: 'POST',
            data: JSON.stringify(dataToSend),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function(response) {
                if (callback) {
                    callback(response);
                }
                checkMarkerLimit();
                console.debug("Marker data saved:", response);
            },
            error: function(xhr, textStatus, errorThrown) {
                if (xhr.status === 429) {
                    alert("Sie haben Ihr Tageslimit für das Hinzufügen von Markierungen erreicht. Versuchen Sie es später noch einmal.");
                }
                console.error('Error saving marker data:', errorThrown);
            }
        });
    }

    function updateCategoryButtonText(category) {
        var button = document.querySelector(`button[category-name="${category}"]`);
        if (button && categoryLayers[category]) {
            button.innerText = `${category} (${categoryLayers[category].getLayers().length} Beiträge)`;
        }
    }

    console.log("Event listeners for Guided Mode have been added.");
});

document.addEventListener('DOMContentLoaded', function() {
    // Function to ensure footer is visible
    function ensureFooterVisibility() {
        var footerNav = document.querySelector('.footer-navigation');
        if (footerNav) {
            footerNav.style.display = 'flex'; // Ensure display is flex
            footerNav.style.visibility = 'visible'; // Ensure visibility

            // Extra check for iOS to adjust positioning if not visible
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                footerNav.style.position = 'fixed';
                footerNav.style.bottom = '0';
            }
        }
    }

    // Initial check
    ensureFooterVisibility();

    // Recheck on resize to handle dynamic changes or orientation changes
    window.addEventListener('resize', ensureFooterVisibility);
    console.debug("Footer visibility ensured");
});
