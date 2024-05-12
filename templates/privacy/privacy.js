
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
  
    document.addEventListener('DOMContentLoaded', function() {
    var backgroundNumber = Math.floor(Math.random() * 12) + 1; // Generates a random number between 1 and 12
    document.body.style.backgroundImage = 'url(/static/background' + backgroundNumber + '.png)';
  });
