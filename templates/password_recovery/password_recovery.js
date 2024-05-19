$(document).ready(function() {
    $('#phone-number-form').submit(function(e) {
        e.preventDefault();
        $.ajax({
            type: 'POST',
            url: '{{ url_for("request_otp") }}',
            data: {
                phone_number: $('#phone_number').val()
            },
            success: function(response) {
                if (response.success) {
                    $('#phone-form').hide();
                    $('#otp-form').show();
                } else {
                    alert(response.message);
                }
            }
        });
    });

    $('#otp-form').submit(function(e) {
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
            }
        });
    });
});

function redirectToIndex() {
    window.location.href = '/';
}

document.addEventListener('DOMContentLoaded', function() {
    var backgroundNumber = Math.floor(Math.random() * 12) + 1; // Generates a random number between 1 and 12
    document.body.style.backgroundImage = 'url(/static/background' + backgroundNumber + '.png)';
});
