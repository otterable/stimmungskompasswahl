document.addEventListener('DOMContentLoaded', function() {
    var backgroundNumber = Math.floor(Math.random() * 12) + 1;
    document.body.style.backgroundImage = 'url(/static/background' + backgroundNumber + '.png)';

    var proposalsButton = document.getElementById('toggle-proposals-btn');
    var notesButton = document.getElementById('toggle-notes-btn');
    var questionsButton = document.getElementById('toggle-questions-btn');
    var proposalsSection = document.getElementById('proposals-section');
    var notesSection = document.getElementById('notes-section');
    var questionsSection = document.getElementById('questions-section');
    var allSections = [proposalsSection, notesSection, questionsSection];
    var allButtons = [proposalsButton, notesButton, questionsButton];

    proposalsButton.addEventListener('click', function() {
        toggleSection(proposalsSection, this);
    });

    notesButton.addEventListener('click', function() {
        toggleSection(notesSection, this);
    });

    questionsButton.addEventListener('click', function() {
        toggleSection(questionsSection, this);
    });

    function toggleSection(sectionElement, button) {
        if (sectionElement.style.display === 'none' || sectionElement.style.display === '') {
            hideAllSections();
            sectionElement.style.display = 'block';
            sectionElement.style.opacity = 0;
            setTimeout(() => sectionElement.style.opacity = 1, 100); // Fade in effect
            button.style.backgroundColor = '#201E1F'; // Indicate active section
            button.style.border = '4px solid black';
        } else {
            sectionElement.style.display = 'none';
            button.style.backgroundColor = ''; // Reset styles
            button.style.border = '';
        }
    }

    function hideAllSections() {
        allSections.forEach(section => {
            section.style.display = 'none';
            section.style.opacity = 0;
        });
        allButtons.forEach(button => {
            button.style.backgroundColor = '';
            button.style.border = '';
        });
    }
});
