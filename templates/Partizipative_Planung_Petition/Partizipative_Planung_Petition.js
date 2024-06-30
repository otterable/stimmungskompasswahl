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



// Function to update character count feedback
function updateCharCountFeedback(textareaElement, feedbackElement, minLimit, maxLimit) {
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

// Event listener for DOMContentLoaded to initialize functionalities
document.addEventListener('DOMContentLoaded', function() {
    var commentTextarea = document.querySelector('textarea[name="comment"]');
    var charCountFeedback = document.getElementById('charCountFeedback');
    var commentButton = document.querySelector('.comment-button'); // Select the comment button

    if (commentTextarea && charCountFeedback && commentButton) {
        commentTextarea.addEventListener('input', function() {
            updateCharCountFeedback(commentTextarea, charCountFeedback, 20, 500);
        });

        // Initialize the character count feedback on page load for the textarea
        updateCharCountFeedback(commentTextarea, charCountFeedback, 20, 500);

        // Check comment limit on page load
        checkCommentLimit(); 
    }
});

function checkCommentLimit() {
//console.log("Checking comment limit...");

fetch('/check_comment_limit')
    .then(response => response.json())
    .then(data => {
        //console.log("Comment Limit Check: ", data);
        var commentButton = document.querySelector('.comment-button');
        if (commentButton) {
            if (data.limit_reached) {
                //console.log(`LIMIT CHECK: 5/5 comments posted, limit has been reached. Turning button into a timer. Limit expires in: ${data.reset_time}`);
                commentButton.disabled = true;
                startTimer(data.reset_time, 'comment-button');
            } else {
                // Ensure the property name here matches what is sent from the server
                //console.log(`LIMIT CHECK: ${data.current_count}/5 comments posted.`);
            }
        } else {}
    })
    .catch(error => {});
}


document.addEventListener("DOMContentLoaded", function() {
	
	
  function adjustBottomBar() {
    const screenHeight = window.innerHeight;
    const formContainer = document.querySelector('.form-container');

    if (formContainer) {
      const formHeight = formContainer.offsetHeight;
      const bottomBar = document.querySelector('.bottom-bar');

      if (formHeight < screenHeight) {
        bottomBar.classList.remove('relative');
        bottomBar.classList.add('fixed');
      } else {
        bottomBar.classList.remove('fixed');
        bottomBar.classList.add('relative');
      }
    }
  }

  adjustBottomBar();
  window.addEventListener('resize', adjustBottomBar);
});

function votePetition(petitionId, voteType) {
    fetch(`/vote/petition/${petitionId}/${voteType}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const upvoteElement = document.querySelector('.upvotes');
            const downvoteElement = document.querySelector('.downvotes');
            document.getElementById('upvote-count').innerHTML = `Gefällt: <strong>${data.upvote_count}</strong>`;
            document.getElementById('downvote-count').innerHTML = `Gefällt nicht: <strong>${data.downvote_count}</strong>`;
            upvoteElement.style.width = `${data.upvote_percentage}%`;
            downvoteElement.style.width = `${data.downvote_percentage}%`;
        }
    })
    .catch(error => {
        console.error('Error voting on petition:', error);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    console.debug("Initial Debug: Document Ready");

    var backgroundNumber = Math.floor(Math.random() * 14) + 1; // Generates a random number between 1 and 14
    document.body.style.backgroundImage = 'url(/static/background' + backgroundNumber + '.png)';

    fetchAndDisplayVoteCounts();
});

function fetchAndDisplayVoteCounts() {
    var petitionIdElement = document.getElementById('petition-id');
    if (petitionIdElement) {
        var petitionId = petitionIdElement.value;
        fetchVoteCounts(petitionId);
    } else {
        console.error("Petition ID element is missing from the page.");
    }
}

function fetchVoteCounts(petitionId) {
    fetch(`/vote/petition/${petitionId}/count`)
        .then(response => response.json())
        .then(data => {
            // Handle the response and update the UI
            updateVoteUI(data);
        })
        .catch(error => console.error('Error loading vote counts:', error));
}

function updateVoteUI(data) {
    if (data.success) {
        console.log(`Votes loaded for petition ID ${data.petitionId}: ${data.upvote_count} upvotes, ${data.downvote_count} downvotes`);
        const upvoteElement = document.querySelector('.upvotes');
        const downvoteElement = document.querySelector('.downvotes');
        document.getElementById('upvote-count').innerHTML = `Gefällt: <strong>${data.upvote_count}</strong>`;
        document.getElementById('downvote-count').innerHTML = `Gefällt nicht: <strong>${data.downvote_count}</strong>`;
        upvoteElement.style.width = `${data.upvote_percentage}%`;
        downvoteElement.style.width = `${data.downvote_percentage}%`;
    } else {
        console.error('Failed to load votes:', data.message);
    }
}


    // Share on WhatsApp
    document.getElementById('share-whatsapp').addEventListener('click', function(e) {
        e.preventDefault();
        //console.log("Sharing to WhatsApp");
        var whatsappUrl = `https://wa.me/?text=Schau dir dieses Projekt an, das könnte unsere Stadt verbessern! ${window.location.href}`;
        window.open(whatsappUrl, '_blank');
    });

    // Share on Facebook
    document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        document.getElementById('share-facebook').addEventListener('click', function(e) {
            e.preventDefault();
            var facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
            window.open(facebookUrl, '_blank');
        });
    }, 1000); // Delay attaching the event listener by 1000 milliseconds
});

document.getElementById('share-share').addEventListener('click', function(e) {
    e.preventDefault();

    // Überprüfen Sie, ob der Benutzer ein Android-Gerät verwendet
    var isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
        // Funktion zum Kopieren der URL in die Zwischenablage auf Android
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('URL wurde in die Zwischenablage kopiert!');
        }).catch((error) => {
            console.error('Fehler beim Kopieren der URL:', error);
            alert('Fehler beim Kopieren der URL.');
        });
    } else {
        // Web Share API für andere Geräte verwenden
        if (navigator.share) {
            navigator.share({
                title: 'Projekt teilen',
                url: window.location.href
            }).then(() => {
                console.log('Danke fürs Teilen!');
            }).catch((error) => {
                console.error('Fehler beim Teilen:', error);
                alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
            });
        } else {
            alert('Die Web-Share-Funktion wird auf diesem Gerät nicht unterstützt.');
        }
    }
});
