document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded and parsed');

  const themeToggle = document.getElementById('themeToggle');
  const mobileThemeToggle = document.getElementById('mobileThemeToggle');
  const themeText = document.querySelector('.theme-btn span');

  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  function applyTheme(theme) {
     if (theme === 'dark') {
         document.documentElement.classList.add('dark');
         if (themeText) themeText.textContent = 'Light Mode';
     } else {
         document.documentElement.classList.remove('dark');
         if (themeText) themeText.textContent = 'Dark Mode';
     }
  }
  applyTheme(savedTheme === 'dark' || (!savedTheme && prefersDark) ? 'dark' : 'light');

  function toggleTheme() {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    const newTheme = isCurrentlyDark ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  if (mobileThemeToggle) {
    mobileThemeToggle.addEventListener('click', toggleTheme);
  }

    // handles toggle for button when submitting a journal entry - indicates loading state on page
    const entryForm = document.getElementById('entryForm');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const submitBtn = document.getElementById('submitBtn');

    if (entryForm) {
        entryForm.addEventListener('submit', function (e) {
            // Hide the submit button text and show the spinner in its place
            submitBtn.style.display = 'none';
            loadingSpinner.style.display = 'inline-block';
            submitBtn.disabled = true;
        });
    }



  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.querySelector('.sidebar');

  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', function() {
      sidebar.classList.toggle('show');
    });
  }


  const historyListContainer = document.querySelector('.history-list');

  if (historyListContainer) {

    historyListContainer.addEventListener('click', async function(event) {
        console.log("Click detected inside history list. Target:", event.target);

        // Check if the click happened on or inside a bookmark button
        const bookmarkButton = event.target.closest('.bookmark-btn');
        if (bookmarkButton) {
            console.log('Bookmark button clicked via delegation');
            event.preventDefault(); // Prevent any default browser action (like link navigation)

            // Find the parent card element to get the entry ID
            const entryCard = bookmarkButton.closest('.history-card');
            const entryId = entryCard ? entryCard.dataset.id : null;
            const icon = bookmarkButton.querySelector('i');

            if (!entryId || !icon) {
                console.error('Delegated: Could not find entry ID or icon for bookmark.');
                alert('Error: Could not perform bookmark action.');
                return; // Exit if we can't find necessary elements
            }

            console.log(`Delegated: Toggling bookmark for entry ID: ${entryId}`);
            try {
                // Send the POST request to the backend toggle route
                const response = await fetch(`/entries/${entryId}/toggle-bookmark`, { method: 'POST' });
                const data = await response.json(); // Expect a JSON response

                if (!response.ok) { throw new Error(data.message || `Server error: ${response.status}`); }

                if (data.success) {
                    if (data.isBookmarked) {
                        icon.classList.remove('far');
                        icon.classList.add('fas');
                        bookmarkButton.title = 'Remove Bookmark';
                        console.log(`Delegated: Entry ${entryId} bookmarked.`);
                    } else {
                        icon.classList.remove('fas');
                        icon.classList.add('far');
                        bookmarkButton.title = 'Add Bookmark';
                        console.log(`Delegated: Entry ${entryId} unbookmarked.`);
                    }
                } else {
                    // Handle cases where the server responded ok but indicated failure (e.g., success: false)
                    console.error('Delegated: Bookmark toggle failed:', data.message);
                    alert(`Could not toggle bookmark: ${data.message || 'Unknown error'}`);
                }
            } catch (error) {
                // Catch network errors or errors thrown from response check
                console.error('Delegated: Error during fetch for bookmark toggle:', error);
                alert(`An error occurred: ${error.message}`);
            }
            return;
        }


        // --- Delete Action Handling ---
        const deleteButton = event.target.closest('.delete-btn');
        if (deleteButton) {
            console.log('Delete button clicked via delegation');
            event.preventDefault(); 

            const entryCard = deleteButton.closest('.history-card');
            const entryId = entryCard ? entryCard.dataset.id : null;

            if (!entryId) {
                console.error('Delegated: Could not find entry ID for delete.');
                alert('Error: Could not identify entry to delete.');
                return; // Exit if ID is missing
            }

            if (confirm('Are you sure you want to delete this entry? This cannot be undone.')) {
                console.log(`Delegated: Attempting to delete entry ID: ${entryId}`);
                try {
                    // Send the DELETE request to the backend route
                    const response = await fetch(`/messages/${entryId}`, { method: 'DELETE' });
                    const data = await response.json();

                    if (!response.ok) { throw new Error(data.message || `Server error: ${response.status}`); }

                    if (data.message && data.message.toLowerCase().includes('success')) {
                        console.log(`Delegated: Entry ${entryId} deleted.`);
                        entryCard.remove();
                        
                    } else {
                        console.error('Delegated: Delete failed:', data.message);
                        alert(`Could not delete entry: ${data.message || 'Unknown error'}`);
                    }
                } catch (error) {
                    // Catch network errors or errors thrown from response check
                    console.error('Delegated: Error during fetch for delete:', error);
                    alert(`An error occurred while deleting: ${error.message}`);
                }
            } else {
                console.log('Delegated: Delete cancelled by user.');
            }
            return; 
        } 

    });

  } else {
    console.warn('Element with class .history-list not found. Delete/Bookmark listeners not attached.');
  }
});