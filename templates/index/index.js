 // Display the prompt

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(function(registration) {
          })
      .catch(function(error) {
        
      });
  }

// Toggle the navigation overlay when the hamburger button is clicked
document.getElementById('hamburger-button').addEventListener('click', function() {
    var navOverlay = document.getElementById('nav-overlay');
    navOverlay.classList.toggle('nav-overlay-active');
});
// Close the navigation overlay when clicking on the overlay background or on a non-button element
document.getElementById('nav-overlay').addEventListener('click', function(event) {
    // Close only if the clicked element is not a button or a link
    if (!event.target.closest('button, a')) {
    closeNavOverlay();
    }
});
// Function to close the navigation overlay
function closeNavOverlay() {
    var navOverlay = document.getElementById('nav-overlay');
    navOverlay.classList.remove('nav-overlay-active');
}
// Prevent closing when clicking on buttons (delegation)
document.getElementById('nav-links').addEventListener('click', function(event) {
    if (event.target.tagName === 'BUTTON' || event.target.tagName === 'A') {
    event.stopPropagation();
    }
});
// Resize event listener
window.addEventListener('resize', function() {
    // Check if the window width is greater than the threshold for mobile view
    if (window.innerWidth > 1080) {
    // Make sure the nav-overlay is displayed
    document.getElementById('nav-overlay').classList.add('nav-overlay-active');
    } else {
    // For mobile view, revert back to the default behavior
    document.getElementById('nav-overlay').classList.remove('nav-overlay-active');
    }
});
// Call the function on page load to set the initial state
function toggleOverlay() {
    var overlay = document.getElementById("category-choices");
    if (overlay.style.display === "none") {
    overlay.style.display = "flex";
    } else {
    overlay.style.display = "none";
    }
}
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

let resizeTimer;
window.addEventListener('resize', () => {
    document.querySelectorAll('.project-thumbnail').forEach((element) => {
        element.style.transform = 'scale(0.95)';
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 150);
    });
});

document.addEventListener("DOMContentLoaded", function() {
var lazyImages = [].slice.call(document.querySelectorAll("img.lazyload"));

if ("IntersectionObserver" in window) {
    let lazyImageObserver = new IntersectionObserver(function(entries, observer) {
    entries.forEach(function(entry) {
        if (entry.isIntersecting) {
        let lazyImage = entry.target;
        lazyImage.src = lazyImage.dataset.src;
        lazyImage.classList.remove("lazyload");
        lazyImageObserver.unobserve(lazyImage);
        }
    });
    });

    lazyImages.forEach(function(lazyImage) {
    lazyImageObserver.observe(lazyImage);
    });
}
});

// Display the prompt



if ('serviceWorker' in navigator) {
navigator.serviceWorker.register('/service-worker.js')
    .then(function(registration) {
    })
    .catch(function(error) {
    });
}

console.log("Is Authenticated: {{ current_user.is_authenticated }}");


document.getElementById('close-overlay-btn').addEventListener('click', function() {
    document.getElementById('nav-overlay').classList.remove('nav-overlay-active');
});
