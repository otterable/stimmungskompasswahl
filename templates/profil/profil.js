document.addEventListener('DOMContentLoaded', function() {
    attachPaginationEvent('comments-container');
    attachPaginationEvent('map-objects-container');
    attachPaginationEvent('projects-container');
    if (!isAnySectionOpen()) {
        document.getElementById('toggleProjectProposals').click();
    }
});

function attachPaginationEvent(containerId) {
    let container = document.getElementById(containerId);
    if (container) {
        container.addEventListener('click', function(e) {
            if (e.target.tagName === 'A' && e.target.classList.contains('page-link')) {
                e.preventDefault();
                const url = new URL(e.target.href);
                updatePaginationContent(url.href, containerId);
            }
        });
    } else {
        console.error(containerId + ' not found');
    }
}

function updatePaginationContent(url, containerId) {
    let section;
    switch (containerId) {
        case 'comments-container':
            section = 'comments';
            break;
        case 'map-objects-container':
            section = 'map_objects';
            break;
        case 'projects-container':
            section = 'projects';
            break;
    }
    const ajaxUrl = new URL(url);
    ajaxUrl.searchParams.set('section', section);
    fetch(ajaxUrl, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    }).then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    }).then(html => {
        document.getElementById(containerId).innerHTML = html;
    }).catch(error => console.error('Error:', error));
}

document.addEventListener('DOMContentLoaded', function() {
    const navOverlay = document.getElementById('nav-overlay');
    const navLinks = document.getElementById('nav-links');
    const hamburgerButton = document.getElementById('hamburger-button');
    const closeOverlayBtn = document.getElementById('close-overlay-btn');

    function toggleNavOverlay() {
        navOverlay.style.display = navOverlay.style.display === 'block' ? 'none' : 'block';
        console.debug(navOverlay.style.display === 'block' ? 'nav-overlay opened.' : 'nav-overlay closed.');
    }

    function closeNavOverlay() {
        navOverlay.style.display = 'none';
        console.debug('nav-overlay explicitly closed.');
    }

    function openNavOverlay() {
        navOverlay.style.display = 'block';
        console.debug('nav-overlay opened.');
    }

    hamburgerButton.addEventListener('click', function() {
        if (window.innerWidth <= 1080) {
            toggleNavOverlay();
        }
    });

    closeOverlayBtn.addEventListener('click', function(event) {
        event.stopPropagation();
        closeNavOverlay();
    });

    navOverlay.addEventListener('click', function(event) {
        if (!navLinks.contains(event.target) && window.innerWidth <= 1080) {
            closeNavOverlay();
        }
    });

    navLinks.addEventListener('click', function(event) {
        event.stopPropagation();
    });

    function adjustNavOverlayDisplay() {
        navOverlay.style.display = window.innerWidth > 1080 ? 'block' : 'none';
    }
    adjustNavOverlayDisplay();

    window.addEventListener('resize', adjustNavOverlayDisplay);
});

function redirectToStimmungskarte() {
    window.location.href = '/Partizipative_Planung_Karte';
}

function redirectToList() {
    window.location.href = '/list';
}

function redirectToneuerbeitrag() {
    window.location.href = '/Partizipative_Planung_Neuer_Projekt';
}

function toggleMenu() {
    var x = document.getElementById("nav-links");
    if (x.style.display === "block") {
        x.style.display = "none";
    } else {
        x.style.display = "block";
    }
}

document.getElementById('delete-data-btn').addEventListener('click', function(event) {
    event.preventDefault(); // Prevent default form submission
    var confirmation = confirm('Sind Sie sicher, dass Sie Ihr gesamtes Konto dauerhaft löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.');
    if (confirmation) {
        fetch('{{ url_for("delete_my_data") }}', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(response => {
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                return response.json().then(data => {
                    if (data.success) {
                        window.location.href = '/deleted.html';
                    } else {
                        alert(data.message);
                    }
                });
            }
        }).catch(error => console.error('Error:', error));
    } else {
        alert('Ihr Konto wurde nicht gelöscht.');
    }
});

let currentOpenSection = null;
document.querySelectorAll('.control-bar .c-button').forEach(button => {
    button.addEventListener('click', function() {
        const sectionId = this.getAttribute('data-section-id');
        toggleSection(sectionId);
    });
});
document.addEventListener('DOMContentLoaded', function() {
    if (!isAnySectionOpen()) {
        toggleSection('projectProposalsSection');
    }
});

function isAnySectionOpen() {
    let sections = document.querySelectorAll('.section');
    return Array.from(sections).some(section => section.style.display === 'block');
}

function openProjectProposalsSection() {
    const projectProposalsButton = document.getElementById('toggleProjectProposals');
    projectProposalsButton.click();
    console.debug('No sections open, opening projectProposalsSection');
}

document.getElementById('toggleLesezeichen').addEventListener('click', function() {
    toggleSection('bookmarksSection');
});
document.querySelectorAll('.control-bar .c-button').forEach(button => {
    button.addEventListener('click', function() {
        const sectionId = this.getAttribute('data-section-id');
        toggleSection(sectionId);
    });
});

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const projectProposalsSection = document.getElementById('projectProposalsSection');
    const projectProposalsButton = document.getElementById('toggleProjectProposals');
    if (currentOpenSection && currentOpenSection !== sectionId) {
        const currentSection = document.getElementById(currentOpenSection);
        if (currentSection) {
            currentSection.style.display = 'none';
            document.querySelector(`[data-section-id="${currentOpenSection}"]`).classList.remove('active');
            console.debug(currentOpenSection + ' section closed');
        }
    }
    if (section.style.display === 'none') {
        section.style.display = 'block';
        document.querySelector(`[data-section-id="${sectionId}"]`).classList.add('active');
        console.debug(sectionId + ' section opened');
        currentOpenSection = sectionId;
        if (projectProposalsSection.style.display === 'block' && sectionId !== 'projectProposalsSection') {
            projectProposalsSection.style.display = 'none';
            projectProposalsButton.classList.remove('active');
            console.debug('projectProposalsSection section closed');
        }
    } else {
        section.style.display = 'none';
        document.querySelector(`[data-section-id="${sectionId}"]`).classList.remove('active');
        console.debug(sectionId + ' section closed, opening projectProposalsSection');
        if (projectProposalsSection.style.display === 'none') {
            projectProposalsSection.style.display = 'block';
            projectProposalsButton.classList.add('active');
            console.debug('projectProposalsSection section opened');
            currentOpenSection = 'projectProposalsSection';
        } else {
            currentOpenSection = null;
        }
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
document.getElementById('toggleProjectProposals').addEventListener('click', function() {
    toggleSection('projectProposalsSection');
});
document.getElementById('toggleNotes').addEventListener('click', function() {
    toggleSection('notesSection');
});
document.getElementById('toggleComments').addEventListener('click', function() {
    toggleSection('commentsSection');
});

document.getElementById('toggleUsers').addEventListener('click', function() {
    toggleSection('usersSection');
});

function submitExportForm() {
    var formData = new FormData(document.getElementById("exportForm"));
    formData.forEach(function(value, key) {
        console.debug("Form Data - Key:", key, "Value:", value);
    });
    console.debug("Sending POST request to /export_projects");
    fetch('{{ url_for("export_projects") }}', {
        method: 'POST',
        body: formData
    }).then(response => {
        console.debug("Server Response:", response);
        if (!response.ok) {
            console.error('Server responded with status:', response.status);
            throw new Error('Server responded with status ' + response.status);
        }
        return response.json();
    }).then(data => {
        if (data.filepath) {
            window.location.href = data.filepath;
        } else {
            console.error('File path not received from server');
        }
    }).catch(error => {
        console.error('Export error:', error);
    });
    return false;
}

function deleteComment(event, commentId) {
    event.preventDefault();
    if (!confirm('Möchten Sie diesen Kommentar wirklich löschen?')) {
        return;
    }
    fetch(`/delete_comment/${commentId}`, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                commentId: commentId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.querySelector(`.project-thumbnail[data-comment-id="${commentId}"]`).remove();
                updateNumComments();
                updateCommentCountInStatistics();
            } else {
                alert('Fehler beim Löschen des Kommentars.');
            }
        })
        .catch(error => console.error('Error:', error));
}

function updateNumComments() {
    const numCommentsSpan = document.querySelector('.my-comments h2 span');
    let numComments = parseInt(numCommentsSpan.textContent);
    if (!isNaN(numComments) && numComments > 0) {
        numCommentsSpan.textContent = `${numComments - 1} Kommentar(e)`;
    }
}

function updateCommentCountInStatistics() {
    const numCommentsStatSpan = document.querySelectorAll('.marker-limit-info .highlight')[1];
    if (numCommentsStatSpan) {
        let numComments = parseInt(numCommentsStatSpan.textContent);
        if (!isNaN(numComments) && numComments > 0) {
            numCommentsStatSpan.textContent = `${numComments - 1}`;
        }
    }
}

function removeBookmark(event, projectId) {
    event.preventDefault();
    const confirmation = confirm('Möchten Sie dieses Lesezeichen wirklich entfernen?');
    if (!confirmation) {
        return;
    }
    fetch(`/remove_bookmark/${projectId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    }).then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok.');
        }
        return response.json();
    }).then(data => {
        const thumbnailToRemove = document.getElementById(`project-thumbnail-${projectId}`);
        if (thumbnailToRemove) {
            thumbnailToRemove.remove();
        }
        updateNumBookmarks();
    }).catch(error => console.error('Error:', error));
}

function updateNumBookmarks() {
    const numBookmarksSpan = document.getElementById('num-bookmarks');
    let numBookmarks = parseInt(numBookmarksSpan.textContent);
    if (!isNaN(numBookmarks)) {
        numBookmarksSpan.textContent = `${numBookmarks - 1} Lesezeichen`;
    }
}

function confirmDeleteMapObject(event, projectId) {
    event.preventDefault();
    const confirmation = confirm('Möchten Sie diese Notiz wirklich löschen?');
    if (!confirmation) {
        return;
    }
    fetch(`/delete_project/${projectId}`, {
        method: 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json'
        },
    }).then(response => response.json()).then(data => {
        if (data.success) {
            alert('Notiz erfolgreich gelöscht.');
            document.querySelector(`.project-thumbnail[data-project-id="${projectId}"]`).remove();
            updateNumMapObjects();
        } else {
            alert('Fehler beim Löschen der Notiz.');
        }
    }).catch(error => console.error('Error:', error));
}

function updateNumMapObjects() {
    const numMapObjectsSpan = document.getElementById('num-map-objects');
    let numMapObjects = parseInt(numMapObjectsSpan.textContent);
    if (!isNaN(numMapObjects)) {
        numMapObjectsSpan.innerHTML = `${numMapObjects - 1} Notizen <span style="color: #003056;">gepostet.</span>`;
    }
}

document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll('.project-thumbnail').forEach(projectThumbnail => {
        const upvotesElement = projectThumbnail.querySelector('.upvotes');
        const downvotesElement = projectThumbnail.querySelector('.downvotes');
        let upvotes = 0,
            downvotes = 0;
        if (upvotesElement) {
            upvotes = parseInt(upvotesElement.textContent.match(/\d+/) ? upvotesElement.textContent.match(/\d+/)[0] : "0");
        }
        if (downvotesElement) {
            downvotes = parseInt(downvotesElement.textContent.match(/\d+/) ? downvotesElement.textContent.match(/\d+/)[0] : "0");
        }
        if (upvotes > 0 && downvotes > 0) {
            if (upvotesElement) upvotesElement.style.borderRadius = '30px 0 0 30px';
            if (downvotesElement) downvotesElement.style.borderRadius = '0 30px 30px 0';
        } else if (upvotes > 0 && downvotes === 0) {
            if (upvotesElement) upvotesElement.style.borderRadius = '30px';
        } else if (downvotes > 0 && upvotes === 0) {
            if (downvotesElement) downvotesElement.style.borderRadius = '30px';
        } else {
            if (upvotesElement) upvotesElement.style.borderRadius = '30px';
            if (downvotesElement) upvotesElement.style.borderRadius = '30px';
        }
    });
});

let currentPageNumber = 1;
document.addEventListener('DOMContentLoaded', function() {
    attachEventListeners();
    updateCurrentPageNumberFromURL();
});

function attachEventListeners() {
    document.body.addEventListener('submit', handleFormSubmit);
    document.addEventListener('click', attachPaginationEventListeners);
}

function handleFormSubmit(event) {
    if (event.target.matches('.my-map-objects .project-thumbnail form')) {
        event.preventDefault();
        handleDeleteRequest(event.target);
    }
}

function attachPaginationEventListeners(event) {
    if (event.target.matches('.pagination .page-link')) {
        event.preventDefault();
        updateCurrentPageNumberFromLink(event.target.href);
        fetchPage(event.target.href);
    }
}

function handleDeleteRequest(form) {
    const projectId = new URL(form.action).pathname.split('/').pop();
    fetch(form.action, {
        method: 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    }).then(response => response.json()).then(data => {
        if (data.success) {
            updatePageAfterDeletion();
        } else {
            console.error('Error deleting project:', data.message);
        }
    }).catch(error => console.error('Error in delete request:', error));
}

function updateCurrentPageNumberFromLink(url) {
    const urlObj = new URL(url);
    const pageParam = urlObj.searchParams.get('map_object_page');
    if (pageParam) {
        currentPageNumber = pageParam;
    }
}

function updatePageAfterDeletion() {
    const remainingProjects = document.querySelectorAll('.my-map-objects .project-thumbnail').length;
    const currentBaseURL = window.location.href.split('?')[0];
    let newURL;
    if (remainingProjects > 0) {
        newURL = `${currentBaseURL}?project_page=1&map_object_page=${currentPageNumber}&comment_page=1`;
    } else {
        let newPageNumber = currentPageNumber > 1 ? currentPageNumber - 1 : 1;
        newURL = `${currentBaseURL}?project_page=1&map_object_page=${newPageNumber}&comment_page=1`;
    }
    fetchPage(newURL);
}

function fetchPage(url) {
    fetch(url, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    }).then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    }).then(html => {
        updateSectionContent(html);
    }).catch(error => console.error('Error fetching page section:', error));
}

function updateSectionContent(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const newContent = doc.querySelector('.my-map-objects');
    if (newContent) {
        document.querySelector('.my-map-objects').innerHTML = newContent.innerHTML;
    } else {
        console.error('New content not found in the response');
    }
}

function updateCurrentPageNumberFromURL() {
    const urlObj = new URL(window.location.href);
    const pageParam = urlObj.searchParams.get('map_object_page');
    if (pageParam) {
        currentPageNumber = pageParam;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    let currentOpenSection = null;

    function toggleSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) {
            console.error("Section not found:", sectionId);
            return;
        }
        if (section.style.display === 'none') {
            section.style.display = 'block';
            if (currentOpenSection && currentOpenSection !== sectionId) {
                const currentSection = document.getElementById(currentOpenSection);
                if (currentSection) {
                    currentSection.style.display = 'none';
                    console.debug(currentOpenSection + ' section closed');
                }
            }
            currentOpenSection = sectionId;
            console.debug(sectionId + ' section opened');
        } else {
            section.style.display = 'none';
            console.debug(sectionId + ' section closed');
            currentOpenSection = null;
        }
    }

    const filterOverlayButtons = document.querySelectorAll('#filter-overlay .c-button');
    filterOverlayButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            const sectionId = this.getAttribute('data-section-id');
            if (currentOpenSection === sectionId) {
                document.getElementById('filter-overlay').style.display = 'none';
                console.debug('Overlay closed, current section remains open:', sectionId);
            } else {
                toggleSection(sectionId);
                document.getElementById('filter-overlay').style.display = 'none';
            }
        });
    });

    if (!isAnySectionOpen()) {
        toggleSection('projectProposalsSection');
    }
    toggleSection('projectProposalsSection');
    const hamburgerButtonFilter = document.getElementById('hamburger-button-filter');
    const filterOverlay = document.getElementById('filter-overlay');
    if (hamburgerButtonFilter && filterOverlay) {
        hamburgerButtonFilter.addEventListener('click', function() {
            filterOverlay.style.display = filterOverlay.style.display === 'flex' ? 'none' : 'flex';
        });
    }
    if (filterOverlay) {
        filterOverlay.addEventListener('click', function(event) {
            if (event.target === this) {
                this.style.display = 'none';
            }
        });
    }
});

function isAnySectionOpen() {
    let sections = document.querySelectorAll('.section');
    return Array.from(sections).some(section => section.style.display === 'block');
}

function deleteProject(event, projectId) {
    event.preventDefault();
    const confirmation = confirm('Möchten Sie dieses Projekt wirklich löschen?');
    if (!confirmation) {
        return;
    }
    fetch(`/delete_project/${projectId}`, {
        method: 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json'
        },
    }).then(response => response.json()).then(data => {
        if (data.success) {
            alert('Projekt erfolgreich gelöscht.');
            document.querySelector(`form[data-project-id="${projectId}"]`).closest('.project-thumbnail').remove();
            updateProjectCounts();
        } else {
            alert('Fehler beim Löschen des Projekts.');
        }
    }).catch(error => console.error('Error:', error));
}

function updateProjectCounts() {
    const projectCountSpan = document.querySelector('.highlight');
    let currentCount = parseInt(projectCountSpan.textContent);
    if (!isNaN(currentCount)) {
        projectCountSpan.textContent = currentCount - 1;
    }
}

document.getElementById('close-overlay-btn').addEventListener('click', function() {
    document.getElementById('nav-overlay').classList.remove('nav-overlay-active');
});
