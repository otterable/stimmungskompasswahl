var map = L.map('map').setView([48.4102, 15.6022], 13);
         var currentDrawnLayer = null;
         var selectedToolButton = null;
         // Track the current base layer
         var currentBaseLayer = 'Standardkarte'; // Default layer
         // Calculate the offset for boundaries
         var horizontalOffset = 1125; // 1.0225 km on each side, total 2.25 km
         var verticalOffset = 594; // 0.59375 km on each side, total 1.02875 km
         // Define the boundaries
         var centerPoint = map.project([48.4102, 15.6022], map.getZoom());
         var southWest = map.unproject(centerPoint.subtract([horizontalOffset, verticalOffset]), map.getZoom());
         var northEast = map.unproject(centerPoint.add([horizontalOffset, verticalOffset]), map.getZoom());
         var bounds = L.latLngBounds(southWest, northEast);
         // Calculate extended bounds for 10 km buffer
         var extendedHorizontalOffset = horizontalOffset + 100000; // Add 10 km
         var extendedVerticalOffset = verticalOffset + 100000; // Add 10 km
         var extendedSouthWest = map.unproject(centerPoint.subtract([extendedHorizontalOffset, extendedVerticalOffset]), map.getZoom());
         var extendedNorthEast = map.unproject(centerPoint.add([extendedHorizontalOffset, extendedVerticalOffset]), map.getZoom());
         var extendedBounds = L.latLngBounds(extendedSouthWest, extendedNorthEast);
         // Set the max bounds to restrict dragging beyond 10 km from the original boundary
         map.setMaxBounds(extendedBounds);
         // Debugging: Log when the user reaches the edge of the draggable area
         map.on('drag', function() {
             if (!extendedBounds.contains(map.getCenter())) {}
         });
         // Define the coordinates for a very large outer rectangle
         var outerBounds = [
             L.latLng(-90, -180),
             L.latLng(90, -180),
             L.latLng(90, 180),
             L.latLng(-90, 180),
             L.latLng(-90, -180)
         ];
         // Define the coordinates for the inner rectangle (the boundary)
         var innerBounds = [
             bounds.getSouthWest(),
             bounds.getNorthWest(),
             bounds.getNorthEast(),
             bounds.getSouthEast(),
             bounds.getSouthWest()
         ];
         var boundary = L.latLngBounds(innerBounds);
         // Create a polygon with a hole (inverted polygon)
         var invertedPolygon = L.polygon([outerBounds, innerBounds], {
             color: 'grey',
             fillColor: 'grey',
             fillOpacity: 0.5
         }).addTo(map);
         // Draw the boundary rectangle
         L.rectangle(bounds, {
             color: "#808080",
             weight: 2,
             fill: false
         }).addTo(map);
         L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
             minZoom: 13,
             attribution: '| © OpenStreetMap contributors'
         }).addTo(map);
         // Map layers
         var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
             minZoom: 13,
             attribution: '....'
         });
         var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
             minZoom: 13,
             attribution: '&copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS User Community'
         });
         var thunderforestLayers = {
             "Atlas": L.tileLayer('https://tile.thunderforest.com/atlas/{z}/{x}/{y}.png?apikey=5c57f95ca93348f1a37f6572742a5b48', {
                 minZoom: 13,
                 attribution: 'Tiles © Thunderforest, ....'
             }),
             "Neighbourhood": L.tileLayer('https://tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey=5c57f95ca93348f1a37f6572742a5b48', {
                 minZoom: 13,
                 attribution: 'Tiles © Thunderforest, ....'
             }),
             "Transport": L.tileLayer('https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=5c57f95ca93348f1a37f6572742a5b48', {
                 minZoom: 13,
                 attribution: 'Tiles © Thunderforest, ....'
             }),
             "Cycle": L.tileLayer('https://tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=5c57f95ca93348f1a37f6572742a5b48', {
                 minZoom: 13,
                 attribution: 'Tiles © Thunderforest, ....'
             }),
             "Mobile_Atlas": L.tileLayer('https://tile.thunderforest.com/mobile-atlas/{z}/{x}/{y}.png?apikey=5c57f95ca93348f1a37f6572742a5b48', {
                 minZoom: 13,
                 attribution: 'Tiles © Thunderforest, ....'
             }),
             "Pioneer": L.tileLayer('https://tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey=5c57f95ca93348f1a37f6572742a5b48', {
                 minZoom: 13,
                 attribution: 'Tiles © Thunderforest, ....'
             }),
         };
         // basemap.at layers
         var basemapLayers = {
             "GeolandBasemap": L.tileLayer('http://maps.wien.gv.at/basemap/geolandbasemap/normal/google3857/{z}/{y}/{x}.png', {
                 minZoom: 13,
                 attribution: 'Basemap.at, ....'
             }),
             "BmapGrau": L.tileLayer('http://maps.wien.gv.at/basemap/bmapgrau/normal/google3857/{z}/{y}/{x}.png', {
                 minZoom: 13,
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
         // Add default layer to map
         baseLayers["Standardkarte"].addTo(map);
         map.on('baselayerchange', function(e) {
             currentBaseLayer = e.name;
             updateMarkerIcons();
         });
         L.control.layers(baseLayers).addTo(map);
         
         // Add a boundary visualization to the map (optional).
         
         // Initialize GeoJSON layer storage.
         var geojsonLayers = {};
         var geojsonFileCounter = 0;
         var geojsonFilesList = document.getElementById('loadedFiles');
         var drawnObjects = {}; // Tracks drawn Leaflet objects
         var filelist = [];
         var filebodylist = [];
         // Function to handle GeoJSON file loading.
         function loadGeoJSON(event) {
            
             var files = event.target.files;
             for (var i = 0, f; f = files[i]; i++) {
                var reader = new FileReader();
                filelist.push(f.name.replace(/ /g, "_"))
                filebodylist.push(f)
                console.log(filebodylist)
                reader.onload = (function(theFile) {
                     return function(e) {
                         var data = JSON.parse(e.target.result);
                         var geojson = L.geoJSON(data, {
                             pointToLayer: createColoredMarker,
                             onEachFeature: onEachFeature
                         }).addTo(map);
                         map.fitBounds(geojson.getBounds());
                         var layerId = 'geojsonLayer_' + L.stamp(geojson);
                         geojsonLayers[layerId] = geojson;
                         addFileToList(theFile.name, layerId);
                     };
                 })(f);
                 reader.readAsText(f);
             }
         }
         // Update the list of loaded GeoJSON files.
         var editableLayers = new L.FeatureGroup();
                 map.addLayer(editableLayers);
         
         // Initialize the draw control and pass it the FeatureGroup of editable layers
         
         var drawControl = new L.Control.Draw({
             edit: {
                 featureGroup: editableLayers,
                 poly: {
                     allowIntersection: false
                 }
             },
             draw: {
                 polygon: {
                     allowIntersection: false,
                     showArea: true
                 },
                 polyline: true,
                 rectangle: true,
                 circle: true,
                 marker: true
             }
         });
         map.addControl(drawControl);
         
        function createColoredMarker(feature, latlng) {
            var geojsonMarkerOptions = {
                radius: 8,
                fillColor: feature.properties.color || "#ff7800", // Default color if not specified
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            };
            return L.circleMarker(latlng, geojsonMarkerOptions);
        }
         
         // Handle the creation of new layers
         map.on(L.Draw.Event.CREATED, function (e) {
                     var type = e.layerType,
                         layer = e.layer,
                         layerId = L.stamp(layer);
                     drawnObjects[layerId] = layer;
                     layer.addTo(map);
                     addDrawnObjectToList(type, layerId);
                 });
         
         // Updated function for GeoJSON files and drawn objects
         function addToList(name, layerId, isDrawnObject = false) {
             var list = document.getElementById('loadedFiles');
             var listItem = document.createElement('li');
             listItem.innerHTML = `${name} <button onclick="removeLayer('${layerId}', ${isDrawnObject})">&#10060;</button> <button onclick="toggleLayerVisibility('${layerId}', ${isDrawnObject})">&#128065;</button> <input type='color' id='colorPicker_${layerId}' oninput='changeLayerColor("${layerId}", this.value, ${isDrawnObject})'>`;
             listItem.id = 'listItem_' + layerId;
             list.appendChild(listItem);
         }
         
         // Use this unified function for adding both GeoJSON and drawn objects to the list
         function addFileToList(name, layerId) {
             addToList(name, layerId, false);
         }
         
         function addDrawnObjectToList(type, layerId) {
             addToList(type, layerId, true);
         }
         
         
         var geojsonLayer;
         
         var geojsonLayers = {}; // Object to hold each geoJSON layer by a unique identifier
         var fileCounter = 0; // Counter to create unique identifiers
         
         
         
         
         function createPopupContent(properties) {
             let popupContent = '<div class="popup-content">';
             for (const [key, value] of Object.entries(properties)) {
                 // Special handling for the image file to create an <img> tag
                 if (key === "image_file" && value) {
                     popupContent += `<br><img src="/static/usersubmissions/${value}" alt="Image" style="max-width:200px; cursor:pointer;" onclick="openImageInOverlay('/static/usersubmissions/${value}')">`;
                 } else {
                     // For other properties, just append them to the popup content
                     popupContent += `<br><b>${key}:</b> ${value}`;
                 }
             }
             popupContent += '</div>';
             return popupContent;
         }
         
        // Revised onEachFeature function
        function onEachFeature(feature, layer) {
            if (feature.properties) {
                var popupContent = Object.keys(feature.properties).map(function(k) {
                    return k + ': ' + feature.properties[k];
                }).join('<br>');
                layer.bindPopup(popupContent);
            }
         }
         
          function addToList(name, layerId, isDrawnObject) {
             var list = document.getElementById('loadedFiles');
             var listItem = document.createElement('li');
             listItem.innerHTML = `${name} <button onclick="removeLayer('${layerId}', ${isDrawnObject})">&#10060;</button> <button onclick="toggleLayerVisibility('${layerId}', ${isDrawnObject})">&#128065;</button> <input type='color' id='colorPicker_${layerId}' oninput='changeLayerColor("${layerId}", this.value, ${isDrawnObject})'>`;
             listItem.id = 'listItem_' + layerId;
             list.appendChild(listItem);
         }
         		
         function toggleLayerVisibility(layerId, isDrawnObject) {
             var layer = isDrawnObject ? drawnObjects[layerId] : geojsonLayers[layerId];
             if (map.hasLayer(layer)) {
                 map.removeLayer(layer);
             } else {
                 map.addLayer(layer);
             }
         }
         
         
         function addDrawnObjectToList(type, layerId) {
             var list = document.getElementById('loadedFiles');
             var listItem = document.createElement('li');
             listItem.innerHTML = `${type} <button onclick="removeLayer('${layerId}', true)">Remove</button> 
             <button onclick="toggleLayerVisibility('${layerId}', true)">&#128065;</button> 
             <input type='color' id='colorPicker_${layerId}' oninput='changeLayerColor("${layerId}", this.value, true)'>`;
             listItem.id = 'listItem_' + layerId;
             list.appendChild(listItem);
         }
         
         function changeLayerColor(layerId, color, isDrawnObject) {
             var layer = isDrawnObject ? drawnObjects[layerId] : geojsonLayers[layerId];
             if (layer) {
                 if (layer.setStyle) {
                     // Applies for vector shapes like polygons, lines, circles
                     layer.setStyle({color: color, fillColor: color});
                 } else if (layer instanceof L.Marker) {
                     // For markers, create a new icon with the selected color
                     var newIcon = createColoredIcon(color); // Implement this function based on your needs
                     layer.setIcon(newIcon);
                 }
             } else {
                 console.error('Layer not found:', layerId);
             }
         }
         
         function createColoredIcon(color) {
             // Define your marker icon using Leaflet's API
             // This example creates a simple circle marker
             var circleIcon = L.divIcon({
                 className: 'custom-div-icon',
                 html: "<div style='background-color:" + color + ";' class='marker-pin'></div>",
                 iconSize: [30, 42],
                 iconAnchor: [15, 42]
             });
             return circleIcon;
         }
         
         
         function removeLayer(layerId, isDrawnObject) {
             var layer = isDrawnObject ? drawnObjects[layerId] : geojsonLayers[layerId];
             if (layer) {
                 map.removeLayer(layer);
                 if (isDrawnObject) {
                     delete drawnObjects[layerId];
                 } else {
                     delete geojsonLayers[layerId];
                 }
                 var listItem = document.getElementById('listItem_' + layerId);
                 listItem.parentNode.removeChild(listItem);
             }
         }
         
         
         
             
         function openImageInOverlay(src) {
             document.getElementById('fullscreenImage').src = src;
             document.getElementById('imageOverlay').style.display = 'block';
             event.stopPropagation(); // Prevent the map click event
         }
         
         function closeOverlay() {
             document.getElementById('imageOverlay').style.display = 'none';
         }
         
         function submitForm() {
             var cropper;
             let combinedGeoJSON = {
                 type: "FeatureCollection",
                 features: []
             };
             // Log and add features from geojsonLayers
             Object.keys(geojsonLayers).forEach(layerId => {
                 geojsonLayers[layerId].eachLayer(innerLayer => {
                     let feature = innerLayer.toGeoJSON();
                     combinedGeoJSON.features.push(feature);
                     console.log(`Exporting GeoJSON Layer: ${layerId}, Color: ${innerLayer.options.color || 'default'}`);
                 });
             });
         
             // Log and add features from drawnObjects
             Object.keys(drawnObjects).forEach(layerId => {
                 let feature = drawnObjects[layerId].toGeoJSON();
                 combinedGeoJSON.features.push(feature);
                 let color = drawnObjects[layerId].options.color || 'default';
                 console.log(`Exporting Drawn Object: ${layerId}, Type: ${feature.geometry.type}, Color: ${color}`);
             });
         
            var formData = new FormData(document.getElementById("baustelleForm"));
            formData.append("gis_data", JSON.stringify(combinedGeoJSON));
            formData.append("gisfiles", JSON.stringify(filelist))
            formData.append("filebodylist", filebodylist)
            console.log(formData)
             fetch('/admin/neuebaustelle', {
                 method: 'POST',
                 body: formData
             })
             .then(response => response.json())
             .then(data => {
                 console.log(data.message);
                 if(data.status === 'success' && data.baustelleId) {
                     alert("Baustelle successfully published!");
                     window.location.href = `/Partizipative_Planung_Fragen_Baustelle/${data.baustelleId}`;
                 } else {
                     alert("Failed to publish Baustelle. Please try again.");
                     console.error('Redirect failed. Baustelle ID is undefined.');
                 }
             })
             .catch(error => {
                 console.error('Error:', error);
                 alert("An error occurred. Please try again.");
             });
         }
         
         function openOverlay(imageSrc) {
         document.getElementById('fullscreenImage').src = imageSrc;
         document.getElementById('imageOverlay').style.display = 'block';
         }
         
         // Function to close the overlay
         function closeOverlay() {
         document.getElementById('imageOverlay').style.display = 'none';
         }
         document.getElementById('imageInput').addEventListener('change', function(event) {
         
         var cropper;
         var files = event.target.files;
         if (files.length > 0) {
         var reader = new FileReader();
         reader.onload = function(e) {
             var imagePreview = document.getElementById('imagePreview');
             imagePreview.src = e.target.result;
             imagePreview.style.display = 'block';
         
             if (cropper) {
                 cropper.destroy(); // Destroy the previous cropper instance
             }
         
             cropper = new Cropper(imagePreview, {
                 aspectRatio: 4 / 3,
                 autoCropArea: 1,
                 viewMode: 1,
             });
         };
         reader.readAsDataURL(files[0]);
         }
         });