document.addEventListener("DOMContentLoaded", function() {
    const form = document.querySelector("form");
    let resendOtpButton;

    function startResendOtpTimer() {
        resendOtpButton.disabled = true;
        let countdown = 30;
        const countdownInterval = setInterval(() => {
            resendOtpButton.innerText = `OTP erneut senden (${countdown}s)`;
            countdown -= 1;
            if (countdown < 0) {
                clearInterval(countdownInterval);
                resendOtpButton.disabled = false;
                resendOtpButton.innerText = "OTP erneut senden";
            }
        }, 1000);
    }

    form.onsubmit = function(event) {
        event.preventDefault();
        fetch("{{ url_for('register') }}", {
            method: 'POST',
            body: new FormData(form)
        }).then(response => response.json()).then(data => {
            if (data.success) {
                console.log("Registration success:", data);
                // Clear the form and display OTP input field
                form.innerHTML = '<input type="text" name="otp" placeholder="OTP eingeben" required style="border-radius: 30px; padding: 15px; background-color: white; font-weight: bold; color: black; border: 1px solid #003056; cursor: pointer; width: 100%; box-sizing: border-box;">' +
                    '<button type="submit" class="button" style="font-weight: bold; margin-top: 10px;">OTP bestätigen</button>' +
                    '<button type="button" id="resend-otp" class="button" style="font-weight: bold; margin-top: 10px;">OTP erneut senden</button>';
                
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
                        console.log("OTP verification response:", data);
                        if (data.success) {
                            alert(data.message);
                            console.log("Redirecting to:", data.redirect_url);
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
                // Show error message
                alert(data.message);
            }
        }).catch(error => {
            console.error('Error:', error);
            alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        });
    };
});

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

function redirectToIndex() {
    window.location.href = '/';
}

function redirectToRegister() {
    window.location.href = '/register';
}

document.addEventListener('DOMContentLoaded', function() {
    var backgroundNumber = Math.floor(Math.random() * 12) + 1; // Generates a random number between 1 and 12
    document.body.style.backgroundImage = 'url(/static/background' + backgroundNumber + '.png)';
});
