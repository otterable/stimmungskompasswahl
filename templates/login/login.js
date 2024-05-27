document.addEventListener('DOMContentLoaded', function() {
    var backgroundNumber = Math.floor(Math.random() * 12) + 1;
    document.body.style.backgroundImage = 'url(/static/background' + backgroundNumber + '.png)';

    document.getElementById('toggle-form-btn').addEventListener('click', function() {
        var form = document.getElementById('login-form');
        if (form.style.display === 'none' || form.style.display === '') {
            form.style.display = 'block';
        } else {
            form.style.display = 'none';
        }
    });

    document.getElementById('custom-apple-signin-button').addEventListener('click', function() {
        AppleID.auth.signIn();
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
});

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
