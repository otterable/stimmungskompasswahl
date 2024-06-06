$(document).ready(function() {
    function startResendOtpTimer() {
        $('#resend-otp').prop('disabled', true);
        let countdown = 30;
        const countdownInterval = setInterval(() => {
            $('#resend-otp').text(`OTP erneut schicken (${countdown}s)`);
            countdown -= 1;
            if (countdown < 0) {
                clearInterval(countdownInterval);
                $('#resend-otp').prop('disabled', false);
                $('#resend-otp').text("OTP erneut schicken");
            }
        }, 1000);
    }

    $('#identifier-form').submit(function(e) {
        e.preventDefault();
        $.ajax({
            type: 'POST',
            url: '{{ url_for("request_otp") }}',
            data: {
                identifier: $('#identifier').val()
            },
            success: function(response) {
                if (response.success) {
                    $('#identifier-form').hide();
                    $('#otp-form').show();
                    startResendOtpTimer();
                } else {
                    alert(response.message);
                }
            }
        });
    });

    $('#otp-reset-form').submit(function(e) {
        e.preventDefault();
        $.ajax({
            type: 'POST',
            url: '{{ url_for("reset_password") }}',
            data: {
                otp: $('#otp').val(),
                new_password: $('#new_password').val()
            },
            success: function(response) {
                if (response.success) {
                    alert(response.message);
                    window.location.href = response.redirect_url;
                } else {
                    alert(response.message);
                }
            },
            error: function(response) {
                alert('OTP-Verifizierung für das Zurücksetzen des Passworts fehlgeschlagen');
            }
        });
    });

    $('#resend-otp').click(function() {
        $.ajax({
            type: 'POST',
            url: '{{ url_for("request_otp") }}',
            data: {
                identifier: $('#identifier').val()  // Ensure identifier (phone/email) is sent
            },
            success: function(response) {
                if (response.success) {
                    alert("OTP wurde erneut gesendet.");
                    startResendOtpTimer();
                } else {
                    alert(response.message);
                }
            },
            error: function() {
                alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
            }
        });
    });

    var backgroundNumber = Math.floor(Math.random() * 12) + 1;
    document.body.style.backgroundImage = 'url(/static/background' + backgroundNumber + '.png)';
});

function redirectToIndex() {
    window.location.href = '/';
}
