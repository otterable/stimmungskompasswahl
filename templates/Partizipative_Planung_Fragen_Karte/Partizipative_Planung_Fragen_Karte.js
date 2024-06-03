// Ensure isSpam function is defined
if (typeof isSpam === 'undefined') {
    window.isSpam = function() {
        return false;
    };
}

let questionCategoryColors = {};

function fetchQuestionCategoryColors() {
    fetch('/get_all_question_category_colors')
        .then(response => response.json())
        .then(data => {
            questionCategoryColors = data;
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
    fetch('/static/filter.json').then(response => response.json()).then(data => {
        swearWords = data;
    }).catch(error => {});
}

// Call this function when the page loads
loadSwearWords();

var userLoggedIn = {{ 'true' if current_user.is_authenticated else 'false' }};

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
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    minZoom: 15,
    attribution: '| © OpenStreetMap contributors'
}).addTo(map);
var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    minZoom: 15,
    attribution: '....'
});
var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    minZoom: 15,
    attribution: '&copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS User Community'
});
var thunderforestLayers = {
    "Atlas": L.tileLayer('https://tile.thunderforest.com/atlas/{z}/{x}/{y}.png?apikey=5c57f95ca93348f1a37f6572742a5b48', {
        minZoom: 15,
        attribution: 'Tiles © Thunderforest, ....'
    }),
    "Neighbourhood": L.tileLayer('https://tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey=5c57f95ca93348f1a37f6572742a5b48', {
        minZoom: 15,
        attribution: 'Tiles © Thunderforest, ....'
    }),
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
    }),
    "Pioneer": L.tileLayer('https://tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey=5c57f95ca93348f1a37f6572742a5b48', {
        minZoom: 15,
        attribution: 'Tiles © Thunderforest, ....'
    }),
};
var basemapLayers = {
    "GeolandBasemap": L.tileLayer('http://maps.wien.gv.at/basemap/geolandbasemap/normal/google3857/{z}/{y}/{x}.png', {
        minZoom: 15,
        attribution: 'Basemap.at, ....'
    }),
    "BmapGrau": L.tileLayer('http://maps.wien.gv.at/basemap/bmapgrau/normal/google3857/{z}/{y}/{x}.png', {
        minZoom: 15,
        attribution: 'Basemap.at, ....'
    })
};
var baseLayers = {
    "Standardkarte": osmLayer,
    "Satellit": satelliteLayer,
    "Klar": thunderforestLayers.Atlas,
    "Öffi": thunderforestLayers.Transport,
    "Radwege": thunderforestLayers.Cycle,
    "Grau": basemapLayers.BmapGrau,
    "Kontrast": thunderforestLayers.Mobile_Atlas,
    "Papyrus": thunderforestLayers.Pioneer,
};
baseLayers["Standardkarte"].addTo(map);
map.on('baselayerchange', function(e) {
    currentBaseLayer = e.name;
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
}
initializeEventListeners();






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
var showFullProjectsOnly = false;
var currentPage = 1;

function addMarkersToOverlay(markers) {
    allMarkers = markers.filter(marker => marker.is_answer); // Filter only answer markers
    displayedMarkersCount = 0;
    filterMarkers();
    createSortFilter();
    createFullProjectFilter();
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
}

function updateShowMoreButton() {
    const showMoreButton = document.getElementById('show-more-markers');
    if (filteredMarkers.length <= displayedMarkersCount || filteredMarkers.length <= markersPerPage) {
        showMoreButton.style.display = 'none';
    } else {
        showMoreButton.style.display = 'block';
    }
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
        let prefix = "Answer: ";
        prefixAndCategory.innerHTML = `<strong style="color: black;">${prefix}</strong><strong style="color: ${categoryColors[marker.category] || 'black'};">${marker.category}</strong>`;
        prefixAndCategory.style.display = 'block';
        const displayText = document.createElement('span');
        displayText.textContent = marker.descriptionwhy;
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
}

























function sortMarkers(sortType) {
    if (sortType === "Neueste") {
        filteredMarkers.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortType === "Älteste") {
        filteredMarkers.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    renderPage(1);
}

function filterByCategory(category) {
    filterMarkers();
}

function createCategoryFilter() {
    const filterDiv = document.getElementById('category-filter');
    if (!filterDiv) return; // Exit if no element found

    filterDiv.innerHTML = ''; // Clear previous contents

    const select = document.createElement('select');
    select.id = 'category-select';
    select.onchange = function() {
        filterByCategory(this.value);
    };

    // Default option for showing all categories
    const defaultOption = document.createElement('option');
    defaultOption.value = 'Alle';
    defaultOption.innerText = 'Alle';
    select.appendChild(defaultOption);

    // Fetch categories from the server
    fetch('/get_projects')
        .then(response => response.json())
        .then(data => {
            const categories = new Set(); // Using a Set to keep unique categories

            data.forEach(project => {
                if (project.category && typeof project.category === 'string' && project.is_answer) {
                    categories.add(project.category.trim()); // Add category if it's from an answer marker
                }
            });

            categories.forEach(category => {
                if (category) { // Ensure category is not empty
                    const option = document.createElement('option');
                    option.value = category;
                    option.innerText = category;
                    select.appendChild(option);
                }
            });

            filterDiv.appendChild(select);
        })
        .catch(error => console.error('Error loading categories:', error));
}

document.addEventListener('DOMContentLoaded', createCategoryFilter);



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
}

function toggleFullProjectFilter() {
    showFullProjectsOnly = !showFullProjectsOnly;
    filterMarkers();
    updateFullProjectFilterButtonText();
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

window.addEventListener('resize', function() {
    renderPage(currentPage);
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
});

document.getElementById('close-overlay-button').addEventListener('click', function() {
    var markersListOverlay = document.getElementById('markers-list-overlay');
    var showMarkersBtn = document.getElementById('show-markers-btn');
    markersListOverlay.style.display = 'none';
    showMarkersBtn.innerText = 'Liste anzeigen';
});

createSortFilter();
createFullProjectFilter();
renderPage(currentPage);

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
}
var markersById = {};

let showAnswersOnly = false;
var answerMarkers = [];
var nonAnswerMarkers = [];

document.addEventListener('DOMContentLoaded', function() {
    // Other initialization code...

    // Add event listener for the toggle button

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

// Make sure to add `isAnswer` property to your markers in addMarkers function
function addMarkers(projects) {
    projects.forEach(project => {
        if (project.is_answer && project.geoloc) {
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
                    <div style="text-align: center; z-index:1000 !important">
                        <span style="color: grey;">${formattedDate}</span><br>
                        <strong style="color: ${fillColor};">${project.category}</strong><br>
                        <b>${project.name}</b>
                        <br>
                        <img src="/static/usersubmissions/${project.image_file}" style="width:500px; height:auto; object-fit: contain; display: block; margin: 10px auto; border-radius: 30px;">
                        ${votingDetailsHtml}
                        ${votingBarHtml}
                        <div style="display: flex; justify-content: space-around; align-items: center; margin-top: 10px;">
                            <button onmouseover="this.style.backgroundColor='#66c46a'" onmouseout="this.style.backgroundColor='#4caf50'" onclick="vote(${project.id}, 'upvote')" id="upvote-button-${project.id}" class="vote-button circle-btn upvote" style="${upvoteButtonStyle}">👍</button>
                            <span id="upvote-count-${project.id}" style="font-weight: bold; margin: 0 10px;">${project.upvotes}</span>
                            <a href="/Partizipative_Planung_Vorschlag/${project.id}" target="_blank" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" class="button-hover-effect" style="font-size: 16px; font-weight: bold; color:white !important; text-decoration: none; background-color: #1a1a1a; border-radius: 30px; display: flex; flex-grow: 1; justify-content: center; align-items: center; padding: 10px; margin: 0 10px; transition: transform 0.3s ease, background-color 0.3s ease;">
                                Details
                            </a>
                            <span id="downvote-count-${project.id}" style="font-weight: bold; margin: 0 10px;">${project.downvotes}</span>
                            <button onmouseover="this.style.backgroundColor='#cc5045'" onmouseout="this.style.backgroundColor='#9A031E'" onclick="vote(${project.id}, 'downvote')" id="downvote-button-${project.id}" class="vote-button circle-btn downvote" style="${downvoteButtonStyle}">👎</button>
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
            answerMarkers.push(marker);
            console.debug(`Marker created via Guide mode, answering "${project.descriptionwhy}" to question title "${project.category}". Marker is an answer marker, is_answer=true has been assigned. is_mapobject=false.`);
            if (!categoryLayers[project.category]) {
                categoryLayers[project.category] = L.layerGroup().addTo(map);
            }
            marker.addTo(categoryLayers[project.category]);
        }
    });

    // Log marker counts after markers are added
    logMarkerCounts();
}
document.getElementById('guided-mode-button').addEventListener('click', function() {
    document.getElementById('guided-mode-modal').style.display = 'flex';
});



document.getElementById('start-guided-mode').addEventListener('click', function() {
    document.getElementById('guided-mode-modal').style.display = 'none';
    document.getElementById('question-modal').style.display = 'flex';
    // Assuming you have a function to start fetching questions or similar logic here
    startGuidedMode();
});

document.getElementById('answer-question').addEventListener('click', function() {
    // Ensure you bind the map click event or similar actions here to handle the answer logic
    handleAnswerMode();
});

function handleAnswerMode() {
    // Assuming you use the map click to handle answers
    map.on('click', handleMapClick);
    document.getElementById('question-modal').style.display = 'none';
    // Additional code to manage state as necessary
}


document.getElementById('cancel-guided-mode').addEventListener('click', function() {
    document.getElementById('guided-mode-modal').style.display = 'none';
});

document.getElementById('cancel-qa-mode').addEventListener('click', function() {
    document.getElementById('question-modal').style.display = 'none';
});





fetch('/get_projects').then(response => {
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
}).then(data => {
    const sortedData = sortMarkersByNewest(data);
    addMarkers(sortedData);
    createCategoryButtons();
    updateCategoryButtonColors();
    addMarkersToOverlay(sortedData);
}).catch(error => {});

function sortMarkersByNewest(markers) {
    return markers.sort((a, b) => new Date(b.date) - new Date(a.date));
}
var markersListOverlay = document.getElementById('markers-list-overlay');

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

        var wasPopupOpen = map.hasLayer(popup);
        if (!wasPopupOpen) {
            popup.setLatLng(new L.LatLng(-90, -180));
            popup.openOn(map);
        }

        var popupWidth = popup.getElement() ? popup.getElement().clientWidth : 300;
        var popupHeight = popup.getElement() ? popup.getElement().clientHeight : 200;

        if (!wasPopupOpen) {
            map.closePopup(popup);
        }

        var xOffset = 0;
        var yOffset = 0;
        if (window.innerWidth <= 1080) {
            xOffset = 0;
            yOffset = popupHeight / 4 + 20;
        } else {
            yOffset = 20;
        }

        var point = map.project(markerLatLng, map.getZoom()).subtract([xOffset, yOffset]);
        var newCenter = map.unproject(point, map.getZoom());

        map.setView(newCenter, map.getZoom());

        setTimeout(function() {
            marker.openPopup();
        }, 00);

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
        },
        error: function(xhr, textStatus, errorThrown) {
            if (xhr.status === 429) {
                alert("Sie haben Ihr Tageslimit für das Hinzufügen von Markierungen erreicht. Versuchen Sie es später noch einmal.");
            }
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
    }).catch(error => {
        const limitInfoElement = document.getElementById('limit-info');
        limitInfoElement.textContent = "Fehler beim Abrufen der Marker-Limit-Informationen.";
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
        });
    });

document.getElementById('close-overlay-button').addEventListener('click', function() {
    document.getElementById('markers-list-overlay').style.display = 'none';
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

document.addEventListener('DOMContentLoaded', function() {
    var submitButton = document.getElementById('add-marker-button');
    submitButton.addEventListener('click', validateMarkerDescription);
});

function validateMarkerDescription(event) {
    var description = document.getElementById('marker-description').value;
    if (isSpam(description)) {
        event.preventDefault();
        return false;
    }
}

document.getElementById('info-link').addEventListener('click', function(e) {
    e.preventDefault();
    handleMobileRedirectOrOverlay('youtube-iframe', 'video-overlay', 'aXB8KE_gpm8', 'V7EjnHuLZjI');
});
document.getElementById('info-link2').addEventListener('click', function(e) {
    e.preventDefault();
    handleMobileRedirectOrOverlay('youtube-iframe-2', 'video-overlay-2', '9-bWivUusZ4', '9xEXWG8TybY');
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
        console.log('Video overlay opened for desktop.');
    }
}

function closeVideoOverlay(iframeId, overlayId) {
    var iframe = document.getElementById(iframeId);
    if (iframe.src) {
        iframe.src = '';
    }
    document.getElementById(overlayId).style.display = 'none';
    console.log('Video overlay closed');
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
}

function replayVideo(iframeId, containerId) {
    var replayContainer = document.getElementById(containerId);
    replayContainer.style.display = 'none';
    var iframe = document.getElementById(iframeId);
    iframe.style.display = 'block';
    var playerToUse = iframeId === 'youtube-iframe' ? player : player2;
    playerToUse.seekTo(0);
    playerToUse.playVideo();
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

// Add event listeners to both buttons in karte.html
document.getElementById('hideNonMapMarkers').addEventListener('click', function() {
    toggleFullProjectFilter();
    syncFullProjectFilterButtons();
});

document.querySelector('.register-button-cl').addEventListener('click', function() {
    toggleFullProjectFilter();
    syncFullProjectFilterButtons();
});







document.addEventListener('DOMContentLoaded', function() {
    setupGuidedMode();
});

let currentQuestionset = null;
let currentQuestionIndex = 0;
let answers = [];

function setupGuidedMode() {
    fetchQuestionSetsAndPrepare();
    attachEventListeners();
    console.debug("Setup for Guided Mode completed.");
}

function fetchQuestionSetsAndPrepare() {
    fetch('/get_questionsets')
        .then(response => response.json())
        .then(questionsets => {
            populateQuestionSets(questionsets);
            console.debug("Question sets loaded:", questionsets);
        })
        .catch(error => console.error("Error fetching question sets:", error));
}

function populateQuestionSets(questionsets) {
    const select = document.getElementById('questionset-select');
    if (!select) {
        console.error("Questionset select element not found.");
        return;
    }
    select.innerHTML = questionsets.map(qs => `<option value="${qs.id}">${qs.title}</option>`).join('');
}

function attachEventListeners() {
    document.getElementById('guided-mode-button').addEventListener('click', handleGuidedModeButton);
    document.getElementById('answer-question').addEventListener('click', handleAnswerButton);
    document.getElementById('cancel-guided-mode').addEventListener('click', closeGuidedMode);
    document.getElementById('cancel-qa-mode').addEventListener('click', closeQuestionModal);
    document.getElementById('next-question').addEventListener('click', handleNextQuestion);
}

function handleGuidedModeButton() {
    const select = document.getElementById('questionset-select');
    const modal = document.getElementById('guided-mode-modal');
    if (select.options.length > 1) {
        modal.style.display = 'flex';
    } else if (select.options.length === 1) {
        modal.style.display = 'none';
        startGuidedMode(select.options[0].value);
    } else {
        console.error("No question sets available.");
    }
}

function handleAnswerButton() {
    document.getElementById('question-modal').style.display = 'none';
    console.debug("Map click handler for answering is set.");
}

function startGuidedMode(questionsetId = null) {
    questionsetId = questionsetId || document.getElementById('questionset-select').value;
    if (!questionsetId) {
        console.error("No questionset ID selected");
        return;
    }

    fetch(`/get_questionset/${questionsetId}`)
        .then(response => response.json())
        .then(questionset => {
            currentQuestionset = questionset;
            currentQuestionIndex = 0;
            showQuestionModal();
            console.debug("Guided mode started with question set:", questionset);
        })
        .catch(error => console.error("Error fetching questionset:", error));
}

function showQuestionModal() {
    if (!currentQuestionset || !currentQuestionset.questions || currentQuestionIndex >= currentQuestionset.questions.length) {
        console.error("No questions available or index out of bounds");
        return;
    }

    const question = currentQuestionset.questions[currentQuestionIndex];
    document.getElementById('question-title').textContent = question.title;
    document.getElementById('question-description').textContent = question.description;
    document.getElementById('question-modal').style.display = 'flex';
    updateSummary(); // Ensure the summary is updated every time the question modal is shown
    enableMapCursor();
    console.debug("Showing question modal for:", question.title);
}

function enableMapCursor() {
    var currentColor = currentQuestionset.questions[currentQuestionIndex].marker_color;
    var cursorIconUrl = createCursorIcon(currentColor);
    document.getElementById('map').style.cursor = `url('${cursorIconUrl}') 12 12, auto`;
    console.debug("Cursor set to marker icon with color:", currentColor);

    document.getElementById('map').addEventListener('mouseenter', function() {
        document.getElementById('map').style.cursor = `url('${cursorIconUrl}') 12 12, auto`;
    });
    document.getElementById('map').addEventListener('mouseleave', resetMapCursor);
}

function createCursorIcon(fillColor) {
    var svgCursorIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${fillColor}" /></svg>`;
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgCursorIcon)))}`;
}

function resetMapCursor() {
    document.getElementById('map').style.cursor = '';
    console.debug("Cursor reset to default.");
}

function handleNextQuestion() {
    if (currentQuestionIndex + 1 < currentQuestionset.questions.length) {
        currentQuestionIndex++;
        showQuestionModal();
    } else {
        console.log("No more questions.");
        document.getElementById('question-modal').style.display = 'none';
        resetMapCursor();
    }
}

function closeGuidedMode() {
    document.getElementById('guided-mode-modal').style.display = 'none';
    resetMapCursor();
    console.debug("Guided mode modal closed.");
}

function closeQuestionModal() {
    document.getElementById('question-modal').style.display = 'none';
    resetMapCursor();
    console.debug("Question modal closed.");
}

function handleMapClick(e) {
    if (currentQuestionset && currentQuestionIndex < currentQuestionset.questions.length) {
        const question = currentQuestionset.questions[currentQuestionIndex];
        const answerText = prompt('Enter your answer for: ' + question.title);
        if (answerText) {
            let answerData = {
                question_id: question.id,
                answer_text: answerText,
                latitude: e.latlng.lat,
                longitude: e.latlng.lng,
                is_answer: true,
                is_mapobject: false,
                category: question.title,
                description: answerText
            };

            saveAnswer(answerData);
            resetMapCursor(); // Reset cursor immediately after map click
            currentQuestionIndex++;
            if (currentQuestionIndex < currentQuestionset.questions.length) {
                showQuestionModal();
            } else {
                console.debug("All questions answered.");
                submitAnswers();
            }
        }
    } else {
        console.log("Map clicked outside question answering mode.");
    }
}

function saveAnswer(answerData) {
    answers.push(answerData);
    updateSummary(); // Update the summary whenever a new answer is saved
    const formattedData = {
        lat: answerData.latitude,
        lng: answerData.longitude,
        category: answerData.category,
        description: answerData.description,
        is_answer: answerData.is_answer,
        is_mapobject: answerData.is_mapobject
    };

    fetch('/add_marker', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formattedData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to save answer');
        }
        return response.json();
    })
    .then(data => {
        console.log("Answer saved successfully", data);
    })
    .catch(error => {
        console.error("Error saving answer:", error);
    });
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

function updateSummary() {
    const summaryElement = document.getElementById('summary-content');
    let summaryHtml = "<h2>Summary</h2>";

    if (answers.length > 0) {
        answers.forEach(answer => {
            const question = currentQuestionset.questions.find(q => q.id === answer.question_id);
            const questionTitle = question ? question.title : "Unknown Question";
            summaryHtml += `<p>${questionTitle}: ${answer.answer_text}</p>`;
        });
    } else {
        summaryHtml += "<p>No questions answered yet!</p>";
    }
    summaryElement.innerHTML = summaryHtml;
}
