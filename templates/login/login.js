document.addEventListener('DOMContentLoaded', function() {
    var backgroundNumber = Math.floor(Math.random() * 12) + 1; // Generates a random number between 1 and 12
    document.body.style.backgroundImage = 'url(/static/background' + backgroundNumber + '.png)';
});

document.getElementById('toggle-form-btn').addEventListener('click', function() {
    var form = document.getElementById('login-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
});

document.addEventListener("DOMContentLoaded", function() {
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
                alert('Login failed - invalid credentials.');
            }
        });
    };
});

function onSignIn(googleUser) {
    var profile = googleUser.getBasicProfile();
    alert('Google login successful! Welcome, ' + profile.getName());
}

function onFailure(error) {
    alert('Google login failed. Please try again.');
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
