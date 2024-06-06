   document.addEventListener('DOMContentLoaded', function() {
        var backgroundNumber = Math.floor(Math.random() * 12) + 1; // Generates a random number between 1 and 12
        document.body.style.backgroundImage = 'url(/static/background' + backgroundNumber + '.png)';
    });

 function redirectToIndex() {
        window.location.href = '/';
    }

    function redirectToRegister() {
        window.location.href = '/register';
    }
	
document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("register-form");
    let resendOtpButton;

    // Swear words list
    var swearWords = {
        "de": [],
        "en": []
    };

    // Function to load swear words from filter.json
    function loadSwearWords() {
        fetch('/static/filter.json').then(response => response.json()).then(data => {
            swearWords = data;
        }).catch(error => {});
    }

    // Call this function when the page loads
    loadSwearWords();

    function containsSwearWords(text, language) {
        var words = swearWords[language] || [];
        var textWords = text.toLowerCase().split(/\s+/);
        return textWords.some(word => words.includes(word));
    }

    form.onsubmit = function(event) {
        event.preventDefault();
        const username = document.getElementById("name").value;
        const password = document.getElementById("password").value;
        const usernameRegex = /^[a-zA-Z0-9]*$/;

        if (username.length < 5 || username.length > 15) {
            alert("Der Benutzername muss zwischen 5 und 15 Zeichen lang sein.");
            return;
        }

        if (password.length < 5 || password.length > 15) {
            alert("Das Passwort muss zwischen 5 und 15 Zeichen lang sein.");
            return;
        }

        if (!usernameRegex.test(username)) {
            alert("Der Benutzername darf keine Sonderzeichen enthalten.");
            return;
        }

        if (containsSwearWords(username, 'de') || containsSwearWords(username, 'en')) {
            alert("Der Benutzername enthält unangemessene Wörter. Bitte wählen Sie einen anderen Benutzernamen.");
            return;
        }

        fetch("{{ url_for('register') }}", {
            method: 'POST',
            body: new FormData(form)
        }).then(response => response.json()).then(data => {
            if (data.success) {
                form.innerHTML = '<input type="text" name="otp" placeholder="OTP eingeben" required style="border-radius: 30px; padding: 15px; background-color: white; font-weight: bold; color: black; border: 1px solid #003056; cursor: pointer; width: 100%; box-sizing: border-box;">' +
                    '<button type="submit" class="button" style="font-weight: bold; margin-top: 10px;">OTP bestätigen</button>' +
                    '<button type="button" id="resend-otp" class="button" style="font-weight: bold; margin-top: 10px;">OTP erneut schicken</button>';
                
                resendOtpButton = document.getElementById('resend-otp');
                startResendOtpTimer();

                resendOtpButton.addEventListener('click', function() {
                    fetch("{{ url_for('resend_otp') }}", {
                        method: 'POST'
                    }).then(response => response.json()).then(data => {
                        if (data.success) {
                            alert("OTP wurde erneut gesendet.");
                            startResendOtpTimer();
                        } else {
                            alert(data.message);
                        }
                    }).catch(error => {
                        console.error('Error:', error);
                        alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
                    });
                });

                // Add event listener for OTP submission
                form.onsubmit = function(event) {
                    event.preventDefault();
                    fetch("{{ url_for('verify_otp') }}", {
                        method: 'POST',
                        body: new FormData(form)
                    }).then(response => response.json()).then(data => {
                        if (data.success) {
                            alert(data.message);
                            window.location.href = data.redirect_url;
                        } else {
                            alert(data.message);
                        }
                    }).catch(error => {
                        console.error('Error:', error);
                        alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
                    });
                };
            } else {
                alert(data.message);
            }
        }).catch(error => {
            console.error('Error:', error);
            alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        });
    };

    function startResendOtpTimer() {
        resendOtpButton.disabled = true;
        let countdown = 30;
        const countdownInterval = setInterval(() => {
            resendOtpButton.innerText = `OTP erneut schicken (${countdown}s)`;
            countdown -= 1;
            if (countdown < 0) {
                clearInterval(countdownInterval);
                resendOtpButton.disabled = false;
                resendOtpButton.innerText = "OTP erneut schicken";
            }
        }, 1000);
    }

    function validatePhoneNumber(input) {
        let phoneNumber = input.value.replace(/[^\d]/g, '');
        if (phoneNumber.startsWith('43') && phoneNumber.length > 15) {
            phoneNumber = phoneNumber.substring(2);
        }
        if (phoneNumber.length > 13) {
            phoneNumber = phoneNumber.substring(0, 13);
        }
        input.value = phoneNumber;
    }



 
});
