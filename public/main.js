// document.addEventListener('DOMContentLoaded', () => {
//   const deleteBtns = document.querySelectorAll('.delete-btn');

//   deleteBtns.forEach(btn => {
//     btn.addEventListener('click', function () {
//       const messageItem = this.closest('li');
//       const messageId = messageItem.getAttribute('data-id'); 
//       console.log('Deleting message with ID:', messageId);

//       // Optional: confirm deletion via page alert - will update to bootstrap component
//       if (!confirm('Are you sure you want to delete this journal entry?')) {
//         return; 
//       }

//       fetch(`/messages/${messageId}`, {
//         method: 'DELETE'
//       })
//       .then(response => response.text())
//       .then(data => {
//         console.log(data);
//         if (data === 'Entry deleted!') {
//           messageItem.remove();
//         }
//       })
//       .catch(err => console.error('Error deleting entry:', err));
//     });
//   });
// });

document.addEventListener('DOMContentLoaded', function() {
  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  const mobileThemeToggle = document.getElementById('mobileThemeToggle');
  const themeText = document.querySelector('.theme-btn span');
  
  // Check for saved theme preference or use device preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    if (themeText) themeText.textContent = 'Light Mode';
  } else {
    if (themeText) themeText.textContent = 'Dark Mode';
  }

  function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    
    // Update button text
    if (themeText) {
      const isDark = document.documentElement.classList.contains('dark');
      themeText.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    }
    
    // Save theme preference
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  if (mobileThemeToggle) {
    mobileThemeToggle.addEventListener('click', toggleTheme);
  }

  // Mobile menu
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.querySelector('.sidebar');
  
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', function() {
      sidebar.classList.toggle('show');
    });
  }

  // Delete journal entry
  const deleteButtons = document.querySelectorAll('.delete-btn');
  
  deleteButtons.forEach(button => {
    button.addEventListener('click', async function() {
      const entryId = this.closest('.history-card, .list-group-item').getAttribute('data-id');
      
      if (confirm('Are you sure you want to delete this entry?')) {
        try {
          const response = await fetch('/messages/' + entryId, {
            method: 'DELETE',
          });
          
          if (response.ok) {
            // Remove the entry from the DOM
            this.closest('.history-card, .list-group-item').remove();
          } else {
            alert('Failed to delete entry');
          }
        } catch (error) {
          console.error('Error:', error);
          alert('An error occurred while deleting the entry');
        }
      }
    });
  });

  // Save draft functionality
  const saveDraftBtn = document.querySelector('.btn-outline');
  
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', function() {
      // Get form values
      const question1 = document.querySelector('input[name="question1"]').value;
      const question2 = document.querySelector('input[name="question2"]').value;
      const question3 = document.querySelector('input[name="question3"]').value;
      const question4 = document.querySelector('input[name="question4"]').value;
      
      // Save to localStorage
      const draft = {
        question1,
        question2,
        question3,
        question4,
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem('journalDraft', JSON.stringify(draft));
      alert('Draft saved!');
    });
    
    // Load draft if exists - will try and figure this out as time goes on
    // const savedDraft = localStorage.getItem('journalDraft');
    // if (savedDraft) {
    //   const draft = JSON.parse(savedDraft);
      
      // Ask user if they want to load the draft
    //   const loadDraft = confirm(`You have a saved draft from ${new Date(draft.savedAt).toLocaleString()}. Would you like to load it?`);
      
    //   if (loadDraft) {
    //     document.querySelector('input[name="question1"]').value = draft.question1 || '';
    //     document.querySelector('input[name="question2"]').value = draft.question2 || '';
    //     document.querySelector('input[name="question3"]').value = draft.question3 || '';
    //     document.querySelector('input[name="question4"]').value = draft.question4 || '';
    //   }
    // }
  }
});