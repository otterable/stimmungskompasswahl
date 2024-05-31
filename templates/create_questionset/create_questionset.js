
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
    `;

    container.appendChild(questionDiv);
}

document.getElementById('questionset-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const formData = new FormData(this);
    const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        questions: []
    };

    const questionCount = document.getElementById('questions-container').children.length;
    for (let i = 0; i < questionCount; i++) {
        data.questions.push({
            title: formData.get(`questions[${i}][title]`),
            description: formData.get(`questions[${i}][description]`),
            marker_color: formData.get(`questions[${i}][marker_color]`)
        });
    }

    fetch('/create_questionset', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(response => response.json())
      .then(data => {
          alert(data.message);
          window.location.reload();
      });
});
