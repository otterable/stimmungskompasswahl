document.addEventListener('DOMContentLoaded', function() {
    console.debug("Initial Debug: Document Ready");

    // Change the background image
    var backgroundNumber = Math.floor(Math.random() * 14) + 1; // Generates a random number between 1 and 14
    document.body.style.backgroundImage = 'url(/static/background' + backgroundNumber + '.png)';

    // Toggle the navigation overlay when the hamburger button is clicked
    document.getElementById('hamburger-button').addEventListener('click', function() {
        var navOverlay = document.getElementById('nav-overlay');
        navOverlay.classList.toggle('nav-overlay-active');
    });

    // Close the navigation overlay when clicking on the overlay background or on a non-button element
    document.getElementById('nav-overlay').addEventListener('click', function(event) {
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
        if (window.innerWidth > 1080) {
            document.getElementById('nav-overlay').classList.add('nav-overlay-active');
        } else {
            document.getElementById('nav-overlay').classList.remove('nav-overlay-active');
        }
    });

    // Toggle overlay function
    function toggleOverlay() {
        var overlay = document.getElementById("category-choices");
        overlay.style.display = (overlay.style.display === "none") ? "flex" : "none";
    }

    // Redirection functions
    function redirectToStimmungskarte() {
        window.location.href = '/Partizipative_Planung_Karte';
    }

    function redirectToList() {
        window.location.href = '/list';
    }

    function redirectToneuerbeitrag() {
        window.location.href = '/Partizipative_Planung_Neuer_Projekt';
    }

    // Toggle menu function
    function toggleMenu() {
        var x = document.getElementById("nav-links");
        x.style.display = (x.style.display === "block") ? "none" : "block";
    }
});



// Function to check comment limit and potentially start a timer
function checkCommentLimit() {
    fetch('/check_comment_limit')
        .then(response => response.json())
        .then(data => {
            var commentButton = document.querySelector('.comment-button');
            if (data.limit_reached) {
                commentButton.disabled = true;
                startTimer(data.reset_time, 'comment-button');
            }
        })
        .catch(error => console.error('Error:', error));
}

// Timer function to handle the countdown
function startTimer(expiryTime, elementId) {
    var countDownDate = new Date(expiryTime).getTime();
    var x = setInterval(function() {
        var now = new Date().getTime();
        var distance = countDownDate - now;
        var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById(elementId).innerText = `Wait ${minutes}m ${seconds}s`;

        if (distance < 0) {
            clearInterval(x);
            document.getElementById(elementId).innerText = 'Comment';
            document.getElementById(elementId).disabled = false;
        }
    }, 1000);
}

// Function to update character count feedback
function updateCharCountFeedback(textareaElement, feedbackElement, minLimit, maxLimit) {
    var charCount = textareaElement.value.length;
    var charRemaining = maxLimit - charCount;
    feedbackElement.textContent = charCount < minLimit ? 
        `Min ${minLimit} chars required. Current: ${charCount}` :
        `Max ${maxLimit} chars allowed. Remaining: ${charRemaining}`;
}

document.addEventListener('DOMContentLoaded', function() {
    var commentTextarea = document.querySelector('textarea[name="comment"]');
    var charCountFeedback = document.getElementById('charCountFeedback');

    if (commentTextarea && charCountFeedback) {
        commentTextarea.addEventListener('input', function() {
            updateCharCountFeedback(commentTextarea, charCountFeedback, 20, 500);
        });

        checkCommentLimit(); // Check comment limit on page load
    }
});