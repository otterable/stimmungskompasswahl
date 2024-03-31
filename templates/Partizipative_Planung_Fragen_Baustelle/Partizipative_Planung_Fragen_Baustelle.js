    // var centerPoint = map.project([48.4102, 15.6022], map.getZoom());
      var map = L.map('map').setView([48.40868923524383, 15.611355395082073], 17);
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

      // Draw the boundary rectangle

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
      });
      L.control.layers(baseLayers).addTo(map);
      // Function to create a colored circle icon
      function createIcon(fillColor) {
        var svgIcon = `
                        <svg
                            xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
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
      // Function to bind popups to GeoJSON objects
      function bindPopups(feature, layer) {
        if (feature.properties && feature.properties.customDescription) {
          // Display only the customDescription value without the title
          var popupContent = `
							<div class='popup-content'>${feature.properties.customDescription}</div>`;
        } else if (feature.properties) {
          // If there's no customDescription, fallback to showing all properties
          var popupContent = "";
          for (var key in feature.properties) {
            popupContent += `
								<div class='popup-row'>
									<strong>${key}:</strong> ${feature.properties[key]}
								</div>`;
          }
          popupContent += "";
        }
        layer.bindPopup(popupContent, {
          className: 'custom-popup'
        });
      }
      var gisData = {{ baustelle.gis_data | tojson | safe}};
      L.geoJSON(gisData, {
        pointToLayer: pointToLayer,
        onEachFeature: bindPopups
      }).addTo(map);
      console.log("Map loaded with GeoJSON files:", gisData ? gisData.features.length : 0);
      // Custom pointToLayer function to use our custom icon
      function pointToLayer(feature, latlng) {
        var fillColor = feature.properties.color || "#ff7800"; // Use color from properties or default
        return L.marker(latlng, {
          icon: createIcon(fillColor)
        });
      }

      function defaultStyle(feature) {
        return {
          fillColor: feature.properties.color || "#ff7800", // Use color from properties or default
          weight: 2,
          opacity: 1,
          color: 'white', // Border color
          fillOpacity: 0.7
        };
      }
      // Add the GeoJSON data
      if (gisData) {
        L.geoJSON(gisData, {
          pointToLayer: pointToLayer,
          style: defaultStyle, // Apply default style for non-point features
          onEachFeature: bindPopups
        }).addTo(map);
        console.log("Map loaded with GeoJSON files:", gisData.features.length);
      } else {
        console.log("No GeoJSON data to load.");
      }
      // Assuming you have a global object to store GeoJSON layers
      var geojsonLayers = {};
      // Example function to load GeoJSON data onto the map
      function loadGeoJSONToMap(data, fileName) {
        var geojsonLayer = L.geoJSON(data, {
          pointToLayer: pointToLayer,
          onEachFeature: bindPopups
        }).addTo(map);
        // Get a unique ID for the layer
        var layerId = L.stamp(geojsonLayer);
        // Store the layer in the global geojsonLayers object for reference
        geojsonLayers[layerId] = geojsonLayer;
        // Add the GeoJSON file to the list with controls
        addGeoJSONToList(fileName, layerId);
      }
      // Assuming 'data' is your GeoJSON object and 'Example GeoJSON' is the name of your file
      // loadGeoJSONToMap(data, "Example GeoJSON");
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
        visibilityButton.innerHTML = '&#128065;'; // Eye icon
        visibilityButton.onclick = function() {
          var layer = geojsonLayers[layerId];
          if (map.hasLayer(layer)) {
            map.removeLayer(layer);
            visibilityButton.innerHTML = '&#128065;'; // Eye icon
          } else {
            map.addLayer(layer);
            visibilityButton.innerHTML = '&#128065;'; // Eye icon, could change to indicate visibility
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
        const baustelleId = window.location.pathname.split("/").pop(); // Extracting Baustelle ID from URL
        if (questionText.trim() === '') {
          alert('Bitte geben Sie eine Frage ein.');
          return;
        }
        const payload = {
          text: questionText,
          author: 'Anonymous', // Adjust as needed
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
          fetchQuestions(); // Fetch questions again to refresh the map markers
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
          fetchQuestions(); // Fetch questions again to refresh the map markers
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

      function submitAnswer(questionId, lat, lng) {
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
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }).then(response => response.json()).then(data => {
          if (data.error) {
            console.error('Error submitting answer:', data.error);
            return;
          }
          console.log(`Answer submitted for question ID ${questionId}. Refreshing markers.`);
          fetchQuestions(); // Refresh the questions to update markers and overlays
        }).catch(error => console.error('Error:', error));
      };

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
        <button onclick="submitAnswer(${question.id}, ${question.latitude}, ${question.longitude})" class="button" style="background-color: #003056; color: white; margin-right: 5px;">Antworten</button>
        <button onclick="map.closePopup();" class="button" style="background-color: #9a031e; color: white; margin-left: 5px;">Abbrechen</button>
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

        // Reformat dates and prepare popup content
        const questionDate = new Date(question.date);
        const formattedQuestionDate = formatDate(questionDate);
        let popupContent = `<strong>Frage:</strong> ${question.text}<br><small>Gefragt am: ${formattedQuestionDate}</small>`;
        
        if (question.answered && question.answer_text) {
          const answerDate = new Date(question.answer_date);
          const formattedAnswerDate = formatDate(answerDate);
          popupContent += `<br><strong>Antwort:</strong> ${question.answer_text}<br><small>Geantwortet am: ${formattedAnswerDate}</small>`;
        }

        // Check if the user is an admin to add the answer section
        if (isAdmin && !question.answered) {
          popupContent += `
            <hr>
            <div style="text-align: center;">
              <p style="font-size: 16px; font-family: 'Roboto', sans-serif; font-weight: bold;">Beantworten Sie diese Frage und markieren Sie sie als beantwortet!</p>
              <textarea id="answer-text-${question.id}" rows="7" style="width: 100%; box-sizing: border-box; text-align: left; border: 1px solid black; font-size: 16px; font-family: 'Roboto', sans-serif;" placeholder="Ihre Antwort hier..."></textarea>
              <br>
              <button onclick="submitAnswer(${question.id}, ${question.latitude}, ${question.longitude})" class="button" style="background-color: #003056; color: white; margin-right: 5px;">Antworten</button>
              <button onclick="map.closePopup();" class="button" style="background-color: #9a031e; color: white; margin-left: 5px;">Abbrechen</button>
            </div>`;
        }

        marker.bindPopup(popupContent);
        marker.on('popupopen', function() {
          console.log(`Popup for question marker id ${question.id} opened`);
        });

        markersById[question.id.toString()] = marker; // Store the marker with question ID as key
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

// When the DOM is fully loaded, fetch questions and then check the URL for a marker ID to center on
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const centerOnMarkerId = urlParams.get('centerOnMarker');


});


      document.addEventListener("DOMContentLoaded", fetchQuestions);

      function submitQuestion(lat, lng) {
        const questionText = document.getElementById('question-text').value;
        const baustelleId = window.location.pathname.split("/").pop(); // Extracting Baustelle ID from URL
        if (questionText.trim() === '') {
          alert('Bitte geben Sie eine Frage ein.');
          return;
        }
        const payload = {
          text: questionText,
          author: 'Anonymous', // Adjust as needed
          baustelle_id: baustelleId,
          latitude: lat,
          longitude: lng,
        };
        fetch('/submit_question', { // Make sure this endpoint matches your Flask route
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
          map.closePopup();
          // Create and add the marker with the custom icon based on the answered status
          const icon = createCustomIcon(data.answered);
          L.marker([lat, lng], {
            icon: icon
          }).addTo(map).bindPopup(`
													<strong>Frage:</strong> ${data.text}
													<br>
														<small>${data.date}</small>`);
        }).catch(error => console.error('Error:', error));
      };
      fetchQuestions(); // This will run the function to fetch and display questions on load
      var markersById = {};
      document.addEventListener("DOMContentLoaded", function() {
        const baustelleId = window.location.pathname.split('/').pop();
        document.getElementById('show-markers-btn').addEventListener('click', function() {
          toggleMarkersListOverlay(baustelleId);
        });
        document.getElementById('close-overlay-button').addEventListener('click', function() {
          document.getElementById('markers-list-overlay').style.display = 'none';
        });
        // Event listeners for the filters
        document.getElementById('question-status-filter').addEventListener('change', function() {
          loadQuestions(baustelleId);
        });
        document.getElementById('question-time-sort').addEventListener('change', function() {
          loadQuestions(baustelleId);
        });

        function toggleMarkersListOverlay(baustelleId) {
          var markersListOverlay = document.getElementById('markers-list-overlay');
          var isDisplayed = markersListOverlay.style.display === 'block';
          markersListOverlay.style.display = isDisplayed ? 'none' : 'block';
          if (!isDisplayed) {
            loadQuestions(baustelleId);
          }
        }

        function loadQuestions(baustelleId) {
          fetch(`/get_questions/${baustelleId}`).then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
          }).then(data => {
            const statusFilter = document.getElementById('question-status-filter').value;
            const timeSort = document.getElementById('question-time-sort').value;
            let filteredData = data;
            // Filter based on status
            if (statusFilter === 'answered') {
              filteredData = data.filter(question => question.answered);
            } else if (statusFilter === 'unanswered') {
              filteredData = data.filter(question => !question.answered);
            }
            // Sort based on time
            if (timeSort === 'newest') {
              filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));
            } else if (timeSort === 'oldest') {
              filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));
            }
            renderQuestions(filteredData);
          }).catch(error => console.error('Error fetching questions:', error));
        }
        document.addEventListener("DOMContentLoaded", function() {
          const showMarkersBtn = document.getElementById('show-markers-btn');
          const markersListOverlay = document.getElementById('markers-list-overlay');
          // Function to toggle the markers list overlay and button text
          function toggleMarkersListOverlay() {
            if (window.innerWidth <= 1080) { // Check if the screen width is 1080px or less
              if (markersListOverlay.style.display === 'block') {
                markersListOverlay.style.display = 'none';
                showMarkersBtn.innerText = 'Liste anzeigen';
              } else {
                markersListOverlay.style.display = 'block';
                showMarkersBtn.innerText = 'Liste ausblenden';
              }
            }
          }
          // Attach event listener to the "Liste" button
          showMarkersBtn.addEventListener('click', toggleMarkersListOverlay);
          // Event listener for the 'Schließen' button
          document.getElementById('close-overlay-button').addEventListener('click', function() {
            markersListOverlay.style.display = 'none';
            showMarkersBtn.innerText = 'Liste anzeigen'; // Reset button text when overlay is closed
          });
        });

        function renderQuestions(questions) {
  const markersList = document.getElementById('markers-list');
  markersList.innerHTML = ''; // Clear existing list items
  questions.forEach(question => {
    const item = document.createElement('li');
    item.innerHTML = formatQuestionListItem(question);
    item.dataset.markerId = question.id.toString(); // Ensure markerId is stored as string if needed
    item.addEventListener('click', function() {
      console.log(`Question marker ID ${this.dataset.markerId} clicked inside markers-overlay, centering the map on question marker ID ${this.dataset.markerId} and opening its popup`);
      const marker = markersById[this.dataset.markerId];
      if(marker) {
        map.setView(marker.getLatLng(), map.getZoom());
        marker.setPopupContent(generatePopupContent(question));
        marker.openPopup();
      }
      // Check if screen width is less than 1080px before toggling overlay
      if (window.innerWidth < 1080) {
        toggleMarkersListOverlay(); // Close the overlay and update the button text only if screen width is < 1080px
      }
    });
    markersList.appendChild(item);
  });
}
       
          });
        

        function formatQuestionListItem(question) {
          // Format the question list item HTML with classes for styling
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
        // Implement the formatDate function as needed


      function formatDate(utcDateString) {
        // Create a Date object from the UTC date string
        let utcDate = new Date(utcDateString);
        // Convert UTC date to local time
        let localDate = new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000);
        // Adjust for the +1 hour offset from UTC
        let targetDate = new Date(localDate.getTime() + (1 * 60 * 60000)); // Adding 1 hour
        // Check if DST is in effect for the targetDate and adjust if necessary
        if (isDST(targetDate)) {
          targetDate = new Date(targetDate.getTime() + (1 * 60 * 60000)); // Adjust by an additional hour for DST
        }
        // Format the date
        let day = targetDate.getDate().toString().padStart(2, '0');
        let month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
        let year = targetDate.getFullYear();
        return `${day}.${month}.${year}`;
      }
      // Function to check if DST is in effect
      function isDST(date) {
        let jan = new Date(date.getFullYear(), 0, 1);
        let jul = new Date(date.getFullYear(), 6, 1);
        return date.getTimezoneOffset() < Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
      }
      // Function to check if DST is in effect
      function isDST(date) {
        let jan = new Date(date.getFullYear(), 0, 1);
        let jul = new Date(date.getFullYear(), 6, 1);
        return date.getTimezoneOffset() < Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
      }
      // Add a method to Date prototype to determine if DST is in effect
      Date.prototype.stdTimezoneOffset = function() {
        const jan = new Date(this.getFullYear(), 0, 1);
        const jul = new Date(this.getFullYear(), 6, 1);
        return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
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
        const popupContent = `
        
																	<div id="question-form" style="text-align: center;">
																		<h3>Schreiben Sie eine Frage oder ein Feedback. Es wird für alle anderen sichtbar sein.</h3>
																		<textarea id="question-text" class="textarea" rows="7" style="width: 100%; box-sizing: border-box; text-align: left; border: 1px solid black; font-size: 16px; font-family: 'Roboto', sans-serif; resize: none;" placeholder="Ihre Frage hier..."></textarea>
																		<div style="display: flex; justify-content: center; margin-top: 10px;">
																			<button onclick="submitQuestion(${e.latlng.lat}, ${e.latlng.lng})" class="button" style="background-color: #003056; color: white; margin-right: 5px;">Posten</button>
																			<button onclick="map.closePopup();" class="button" style="background-color: #9a031e; color: white; margin-left: 5px;">Abbrechen</button>
																		</div>
																	</div>
    `;
        L.popup().setLatLng(e.latlng).setContent(popupContent).openOn(map);
      });
      document.addEventListener("DOMContentLoaded", function() {
        
        
        // Debugging Title Load
        console.log("Title Loaded:", document.getElementById("baustelle-title").textContent);
        // Debugging Quill Description Load
        console.log("Quill Description Loaded:", document.getElementById("baustelle-description").innerHTML);
        // Debugging Image Load
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
    </script>
    <script>
const closeOverlayBtns = document.querySelectorAll("[onclick^='closeVideoOverlay']");
    closeOverlayBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const overlayId = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            document.getElementById(overlayId).style.display = 'none';
        });
    });

    // Ensure that the 'close-overlay-button' correctly closes the markers list overlay
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

    // Close overlay function when the close-overlay-button is clicked
    const closeOverlayButton = document.getElementById('close-overlay-button');
    if (closeOverlayButton) {
        closeOverlayButton.addEventListener('click', function() {
            document.getElementById('markers-list-overlay').style.display = 'none';
        });
    }

    // Close overlay function for the close-overlay-btn button
    const closeOverlayBtn = document.getElementById('close-overlay-btn');
    if (closeOverlayBtn) {
        closeOverlayBtn.addEventListener('click', function() {
            // Adjust this to target the correct overlay ID you wish to close
            document.getElementById('nav-overlay').style.display = 'none';
        });
    }

    // Call the function on load and on resize
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
// Close the navigation overlay when clicking on the overlay background or on a non-button element
document.getElementById('nav-overlay').addEventListener('click', function(event) {
    // Close only if on mobile
    if (window.innerWidth <= 1080 && !event.target.closest('button, a')) {
        toggleNavOverlay();
    }
});
// Event listener for hamburger button
document.getElementById('hamburger-button').addEventListener('click', toggleNavOverlay);
// Resize event listener
window.addEventListener('resize', function() {
    var navOverlay = document.getElementById('nav-overlay');
    // Show on desktop, hide on mobile
    if (window.innerWidth > 1080) {
        navOverlay.style.display = 'block';
    } else {
        navOverlay.style.display = 'none';
    }
});
// Set initial state of the nav-overlay based on device width
window.onload = function() {
    var navOverlay = document.getElementById('nav-overlay');
    // Show on desktop, hide on mobile
    if (window.innerWidth > 1080) {
        navOverlay.style.display = 'block';
    } else {
        navOverlay.style.display = 'none';
    }
};
document.getElementById('close-overlay-btn').addEventListener('click', function() {
    document.getElementById('nav-overlay').classList.remove('nav-overlay-active');
});



    </script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const editButton = document.querySelector('#edit-baustelle-button');
        const editForm = document.querySelector('#edit-baustelle-form');
        if (editButton) {
          editButton.addEventListener('click', function() {
            editForm.style.display = editForm.style.display === 'none' ? 'block' : 'none';
          });
        }
      });