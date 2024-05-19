// Existing JavaScript code

if (typeof isSpam === 'undefined') {
    window.isSpam = function() {
        return false;
    };
}

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
            isFeatured: false
        }).addTo(map);
        marker.bindPopup(popupContent);
        marker.markerId = markerId;
        if (!categoryLayers[category]) {
            categoryLayers[category] = L.layerGroup().addTo(map);
        }
        marker.addTo(categoryLayers[category]);
        updateCategoryButtonText(category);
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
    allMarkers = markers;
    displayedMarkersCount = 0;
    filterMarkers();
    createCategoryFilter();
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
        let prefix = marker.is_mapobject ? "Notiz: " : "Projektvorschlag: ";
        prefixAndCategory.innerHTML = `<strong style="color: black;">${prefix}</strong><strong style="color: ${categoryColors[marker.category] || 'black'};">${marker.category}</strong>`;
        prefixAndCategory.style.display = 'block';
        const displayText = document.createElement('span');
        displayText.textContent = marker.is_mapobject ? marker.descriptionwhy : marker.name;
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
    filterDiv.innerHTML = '';
    const select = document.createElement('select');
    select.id = 'category-select';
    select.onchange = function() {
        filterByCategory(this.value);
    };
    const categories = ["Alle", "Transport", "Öffentliche Plätze", "Umwelt", "Verwaltung", "Kultur", "Bildung", "Gesundheit", "Sport", "Andere"];
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.innerText = category;
        select.appendChild(option);
    });
    filterDiv.appendChild(select);
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

createCategoryFilter();
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
    var color;
    switch (category) {
        case 'Transport':
            color = '#133873';
            break;
        case 'Öffentliche Plätze':
            color = '#ff5c00';
            break;
        case 'Umwelt':
            color = '#4CAF50';
            break;
        case 'Verwaltung':
            color = '#653993';
            break;
        case 'Kultur':
            color = '#431307';
            break;
        case 'Bildung':
            color = '#eab003';
            break;
        case 'Gesundheit':
            color = '#9A031E';
            break;
        case 'Sport':
            color = '#3d4f53';
            break;
        case 'Andere':
            color = '#212121';
            break;
        default:
            color = '#888';
            break;
    }
    return color;
}
var categoryLayers = {};
function logSelectedCategory() {
    var selectedCategory = document.getElementById('marker-category').value;
}
var markersById = {};

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
                        <strong style="color: ${categoryColors[project.category] || 'black'};">${project.category}</strong><br>
                        ${project.descriptionwhy}
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
                var upvoteButtonStyle = `
                    background-color: #4caf50 !important;
                    color: white !important;
                    padding: 10px !important;
                    cursor: pointer;
                    border: none;
                    transition: background-color 0.3s ease, transform 0.3s ease !important;
                `;
                var detailsButtonStyle = `
                    display: inline-block;
                    font-size: 16px;
                    font-weight: bold;
                    color: white !important;
                    text-decoration: none;
                    background-color: #007bff;
                    padding: 10px;
                    cursor: pointer;
                    border: none;
                    transition: background-color 0.3s ease, transform 0.3s ease !important;
                    height: 40px;
                    line-height: 20px;
                    border-radius: 4px;
                `;
                var votingButtonsHeight = '40px';
                var downvoteButtonStyle = `
                    background-color: #9A031E !important;
                    color: white !important;
                    padding: 10px !important;
                    cursor: pointer;
                    border: none;
                    transition: background-color 0.3s ease, transform 0.3s ease !important;
                `;
                var popupContent = `
                    <div style="text-align: center; z-index:1000 !important">
                        <span style="color: grey;">${formattedDate}</span><br>
                        <strong style="color: ${categoryColors[project.category] || 'black'};">${project.category}</strong><br>
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
            if (!categoryLayers[project.category]) {
                categoryLayers[project.category] = L.layerGroup().addTo(map);
            }
            marker.addTo(categoryLayers[project.category]);
        }
    });
}

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

document.addEventListener('DOMContentLoaded', function() {
    fetch('/get_projects_with_vote_status')
        .then(response => response.json())
        .then(projects => {
            projects.forEach(project => {
                const upvoteButton = document.querySelector(`#upvote-button-${project.id}`);
                const downvoteButton = document.querySelector(`#downvote-button-${project.id}`);

                if (upvoteButton && project.user_vote === 'upvote') {
                    upvoteButton.classList.add('voted-upvote');
                    console.log(`Upvote loaded: User ID ${project.user_id} has previously upvoted project ID ${project.id}, turning the circle button of upvote to color #4caf50.`);
                } else if (downvoteButton && project.user_vote === 'downvote') {
                    downvoteButton.classList.add('voted-downvote');
                    console.log(`Downvote loaded: User ID ${project.user_id} has previously downvoted project ID ${project.id}, turning the circle button of downvote to color #9a031e.`);
                }

                if ((upvoteButton || downvoteButton) && project.user_vote) {
                    console.log(`Vote loaded: User ID ${project.user_id} has previously ${project.user_vote}d project ID ${project.id}, adjusting the circle button color.`);
                }
            });
        })
        .catch(error => console.error('Error loading project votes:', error));
});

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
        }
    }).catch(error => {});
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
    const categoryButtons = document.querySelectorAll('#category-toggle-buttons button');
    categoryButtons.forEach(button => {
        const buttonText = button.textContent.trim();
        const categoryMatch = buttonText.match(/^(.*?)(?=\s*\()/);
        const category = categoryMatch ? categoryMatch[0].trim() : "";
        const color = categoryColors[category];
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
        isAnonymous: !isAuthenticated
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
        var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
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
