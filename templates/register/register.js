document.addEventListener("DOMContentLoaded", function() {
  const form = document.querySelector("form");
  form.onsubmit = function(event) {
    event.preventDefault();
    fetch("{{ url_for('register') }}", {
      method: 'POST',
      body: new FormData(form)
    }).then(response => response.json()).then(data => {
      if (data.success) {
        // Clear the form and display OTP input field
        form.innerHTML = '<input type="text" name="otp" placeholder="Passwort eingeben" required style="border-radius: 30px; padding: 15px; background-color: white; font-weight: bold; color: black; border: 1px solid #003056; cursor: pointer; width: 100%; box-sizing: border-box;">' +
          '<button type="submit" class="button" style="font-weight: bold; margin-top: 10px;">Passwort bestätigen</button>';
        // Add event listener for OTP submission
        form.onsubmit = function(event) {
          event.preventDefault();
          fetch("{{ url_for('verify_otp') }}", {
            method: 'POST',
            body: new FormData(form)
          }).then(response => response.json()).then(data => {
            if (data.success) {
              alert(data.message);
              window.location.href = "{{ url_for('index') }}";
            } else {
              alert(data.message);
            }
          }).catch(error => {
            alert('An error occurred. Please try again.');
          });
        };
      } else {
        // Show error message
        alert(data.message);
      }
    }).catch(error => {
      alert('An error occurred while sending the registration data.');
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
