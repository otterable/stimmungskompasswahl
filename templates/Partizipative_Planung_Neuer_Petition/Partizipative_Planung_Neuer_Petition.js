document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed");

    const urlParams = new URLSearchParams(window.location.search);
    const petitionID = urlParams.get('petition_id');

    if (petitionID) {
        console.log(`Editing petition ID: ${petitionID}`);
        fetch(`/get_petition_data/${petitionID}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Petition not found');
                }
                return response.json();
            })
            .then(data => {
                document.getElementById('name').value = data.name;
                document.getElementById('category').value = data.category;
                document.getElementById('introduction').value = data.introduction;
                document.getElementById('description1').value = data.description1;
                document.getElementById('description2').value = data.description2;
                document.getElementById('description3').value = data.description3;
                document.getElementById('public_benefit').value = data.public_benefit;
                document.getElementById('geoloc').value = data.geoloc;

                for (let i = 1; i <= 10; i++) {
                    if (data[`image_file${i}`]) {
                        const imgElement = document.createElement('img');
                        imgElement.src = `/static/uploads/${data[`image_file${i}`]}`;
                        imgElement.alt = `Bild ${i}`;
                        imgElement.style.maxWidth = '100px';
                        imgElement.style.maxHeight = '100px';
                        document.querySelector(`label[for=image_file${i}]`).appendChild(imgElement);
                    }
                }
            })
            .catch(error => console.error('Error fetching petition data:', error));
    }

    document.querySelector('form').addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(this);

        fetch('/Partizipative_Planung_Neuer_Petition', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                return response.json().then(data => {
                    if (data.id) {
                        console.log(`Petition ${data.id} saved successfully.`);
                        window.location.href = `/Partizipative_Planung_Petition/${data.id}`;
                    } else {
                        throw new Error('Failed to save petition.');
                    }
                });
            }
        })
        .catch(error => console.error('Error saving petition:', error));
    });
});

    // Change the background image
    var backgroundNumber = Math.floor(Math.random() * 14) + 1; // Generates a random number between 1 and 14
    document.body.style.backgroundImage = 'url(/static/background' + backgroundNumber + '.png)';

