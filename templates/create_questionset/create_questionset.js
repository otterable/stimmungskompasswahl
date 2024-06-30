
  // JavaScript function to handle redirection to Stimmungskarte
  function redirectToStimmungskarte() {
    window.location.href = '/Partizipative_Planung_Karte';
  }
  // JavaScript function to handle redirection to Suggest an Idea
  function redirectToList() {
    window.location.href = '/list';
  }
  // JavaScript function to handle redirection to List of Current Suggestions
  function redirectToneuerbeitrag() {
    window.location.href = '/Partizipative_Planung_Neuer_Projekt';
  }

  function toggleMenu() {
    var x = document.getElementById("nav-links");
    if (x.style.display === "block") {
      x.style.display = "none";
    } else {
      x.style.display = "block";
    }
  }
  
    

document.getElementById('add-question').addEventListener('click', addQuestion);

function addQuestion() {
    const container = document.getElementById('questions-container');
    const questionCount = container.children.length + 1;
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';
    questionDiv.innerHTML = `
        <h3>Question ${questionCount}</h3>
        <label for="question-title-${questionCount}">Title:</label>
        <input type="text" id="question-title-${questionCount}" name="questions[${questionCount - 1}][title]" required>
        <label for="question-description-${questionCount}">Description:</label>
        <textarea id="question-description-${questionCount}" name="questions[${questionCount - 1}][description]" required></textarea>
        <label for="question-marker-color-${questionCount}">Marker color:</label>
        <input type="color" id="question-marker-color-${questionCount}" name="questions[${questionCount - 1}][marker_color]" required>
        <label for="question-image-${questionCount}">Upload Image:</label>
        <input type="file" id="question-image-${questionCount}" name="questions[${questionCount - 1}][image]" accept="image/*">
        <div id="preview-container-${questionCount}"></div> <!-- Container for image preview/cropper -->
    `;
    container.appendChild(questionDiv);

    const imageInput = document.getElementById(`question-image-${questionCount}`);
    imageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgElement = document.createElement('img');
                imgElement.src = e.target.result;
                imgElement.style.maxWidth = '100%';
                const previewContainer = document.getElementById(`preview-container-${questionCount}`);
                previewContainer.innerHTML = '';
                previewContainer.appendChild(imgElement);
                initializeCropper(imgElement, previewContainer);
            };
            reader.readAsDataURL(file);
        }
    });
}

function initializeCropper(imgElement, previewContainer) {
    let cropper = new Cropper(imgElement, {
        aspectRatio: 4 / 3, // Maintain a 4:3 aspect ratio
        viewMode: 1,
        autoCropArea: 1,
        responsive: true,
        scalable: true,
        movable: true,
        crop(event) {
            console.log(`Crop box data: x: ${event.detail.x}, y: ${event.detail.y}, width: ${event.detail.width}, height: ${event.detail.height}`);
        }
    });
    previewContainer.cropper = cropper; // Store the cropper instance in the container for later use
}

document.getElementById('questionset-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const formData = new FormData(this);
    formData.set('title', document.getElementById('questionset-title').value);
    formData.set('description', document.getElementById('questionset-description').value);

    const questions = document.querySelectorAll('.question');
    let imagePromises = [];

    questions.forEach((question, index) => {
        formData.set(`questions[${index}][title]`, question.querySelector('input[type="text"]').value);
        formData.set(`questions[${index}][description]`, question.querySelector('textarea').value);
        formData.set(`questions[${index}][marker_color]`, question.querySelector('input[type="color"]').value);
        
        const previewContainer = question.querySelector(`div#preview-container-${index + 1}`);
        if (previewContainer && previewContainer.cropper) {
            const imgPromise = new Promise(resolve => {
                // Explicitly define the dimensions for the cropped canvas
                const canvasOptions = {
                    maxWidth: 1200,  // Set the maximum width to 1200 pixels
                    maxHeight: 900,  // Compute the height from the 4:3 ratio
                    fillColor: '#fff',  // Fill color for any blank space due to aspect ratio
                    imageSmoothingEnabled: true,
                    imageSmoothingQuality: 'high'
                };
                previewContainer.cropper.getCroppedCanvas(canvasOptions).toBlob(function(blob) {
                    formData.append(`questions[${index}][image]`, blob, `question-${index}.jpeg`);
                    resolve();
                }, 'image/jpeg');
            });
            imagePromises.push(imgPromise);
        }
    });

    Promise.all(imagePromises).then(() => {
        fetch('/create_questionset', {
            method: 'POST',
            body: formData,
        }).then(response => response.json())
        .then(data => {
            alert(data.message);
            window.location.reload();
        });
    });
});

