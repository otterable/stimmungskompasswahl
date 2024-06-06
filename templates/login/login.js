document.addEventListener('DOMContentLoaded', function() {
    var backgroundNumber = Math.floor(Math.random() * 12) + 1;
    document.body.style.backgroundImage = 'url(/static/background' + backgroundNumber + '.png)';

    var loginFormButton = document.getElementById('toggle-form-btn');
    var otpFormButton = document.getElementById('toggle-otp-btn');
    var loginForm = document.getElementById('login-form');
    var otpForm = document.getElementById('otp-form');
    var registerInfoSection = document.getElementById('register-info-section');
    var allButtons = document.querySelectorAll('.register-button, .button'); // Selects all button-like elements
    var otherButtons = document.querySelectorAll('a.register-button, a.button:not(.register-button)'); // Selects non-form related buttons

    loginFormButton.addEventListener('click', function() {
        toggleForm(loginForm, this, otpFormButton);
    });

    otpFormButton.addEventListener('click', function() {
        toggleForm(otpForm, this, loginFormButton);
    });

    function toggleForm(formElement, button, otherButton) {
        if (formElement.style.display === 'none' || formElement.style.display === '') {
            hideAllForms();
            formElement.style.display = 'block';
            formElement.style.opacity = 0;
            setTimeout(() => formElement.style.opacity = 1, 100); // Fade in effect
            button.style.backgroundColor = '#201E1F'; // Indicate active section
            button.style.border = '4px solid black';
            otherButton.style.display = 'none'; // Hide the other section button
            hideOtherButtons();
            registerInfoSection.style.display = 'none'; // Hide the register info section
        } else {
            formElement.style.display = 'none';
            button.style.backgroundColor = ''; // Reset styles
            button.style.border = '';
            showAllButtons();
            registerInfoSection.style.display = 'block'; // Show the register info section
        }
    }

    function hideAllForms() {
        // Reset all forms and buttons
        [loginForm, otpForm].forEach(form => {
            form.style.display = 'none';
            form.style.opacity = 0;
        });
        allButtons.forEach(button => {
            button.style.backgroundColor = '';
            button.style.border = '';
            button.style.display = 'block'; // Ensure all buttons are initially visible for any future interactions
        });
        showOtherButtons();
    }

    function hideOtherButtons() {
        otherButtons.forEach(button => {
            button.style.display = 'none'; // Hide buttons
        });
    }

    function showAllButtons() {
        allButtons.forEach(button => {
            button.style.display = 'block'; // Show all buttons
        });
    }

    function showOtherButtons() {
        otherButtons.forEach(button => {
            button.style.display = 'block'; // Show buttons
        });
    }
});

document.getElementById('otp-request-form').onsubmit = function(event) {
    event.preventDefault();
    fetch('/login_via_otp', {
        method: 'POST',
        body: new FormData(this)
    }).then(response => response.json()).then(data => {
        if (data.success) {
            document.getElementById('identifier_input').style.display = 'none';  // Hide identifier input
            document.getElementById('otp-entry').style.display = 'block';  // Show OTP entry form
            document.getElementById('send-otp-button').style.display = 'none';  // Hide the "Send OTP" button
            document.getElementById('resend-otp').style.display = 'block';  // Show the "Resend OTP" button
            alert('OTP wurde gesendet.');
            startResendTimer();  // Start the resend timer
        } else {
            alert('Fehler beim schicken des OTP.');
        }
    });
};

function startResendTimer() {
    let button = document.getElementById('resend-otp');
    button.disabled = true;  // Disable the button initially
    let countdown = 30;
    let timer = setInterval(function() {
        button.textContent = `OTP erneut schicken (${countdown}s)`;
        countdown--;
        if (countdown < 0) {
            clearInterval(timer);
            button.textContent = 'OTP erneut schicken';
            button.disabled = false;  // Enable the button after 30 seconds
        }
    }, 1000);
}

document.getElementById('otp-verify-form').onsubmit = function(event) {
    event.preventDefault();  // Prevent default form submission which causes page reload
    fetch('/otp_verify_login', {
        method: 'POST',
        body: new FormData(this),
        headers: {
            'Accept': 'application/json'
        }
    }).then(response => response.json()).then(data => {
        if (data.success) {
            window.location.href = data.next || "{{ url_for('index') }}";  // Redirect if login is successful
        } else {
            alert('OTP-Verifizierung fehlgeschlagen.');  // Show an error message if login fails
        }
    }).catch(error => console.error('Error:', error));  // Log errors to console
};

document.getElementById('resend-otp').addEventListener('click', function() {
    document.getElementById('otp-request-form').dispatchEvent(new Event('submit'));
});

document.getElementById('change-identifier').addEventListener('click', function() {
    document.getElementById('identifier_input').style.display = 'block';  // Show identifier input
    document.getElementById('otp-entry').style.display = 'none';  // Hide OTP entry form
    document.getElementById('identifier_input').value = '';
    document.getElementById('send-otp-button').style.display = 'block';  // Show the "Send OTP" button
    document.getElementById('resend-otp').style.display = 'none';  // Hide the "Resend OTP" button
});

const form = document.querySelector("form");
form.onsubmit = function(event) {
    event.preventDefault();
    fetch(form.action, {
        method: 'POST',
        body: new FormData(form)
    }).then(response => response.json()).then(data => {
        if (data.success) {
            window.location.href = data.next || "{{ url_for('index') }}";
        } else {
            alert('Anmeldung fehlgeschlagen - ungültige Anmeldedaten.');
        }
    });
};

function onSignIn(googleUser) {
    var profile = googleUser.getBasicProfile();
    alert('Google-Anmeldung erfolgreich! Willkommen, ' + profile.getName() + '!');
}

function onFailure(error) {
    alert('Google-Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
}

function renderButton() {
    gapi.signin2.render('g-signin2', {
        'scope': 'profile email',
        'width': 240,
        'height': 50,
        'longtitle': true,
        'theme': 'dark',
        'onsuccess': onSignIn,
        'onfailure': onFailure
    });
}

function redirectToIndex() {
    window.location.href = '/';
}
