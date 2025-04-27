document.addEventListener('DOMContentLoaded', () => {
  const deleteBtns = document.querySelectorAll('.delete-btn');

  deleteBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      const messageItem = this.closest('li');
      const messageId = messageItem.getAttribute('data-id'); 
      console.log('Deleting message with ID:', messageId);

      // Optional: confirm deletion via page alert - will update to bootstrap component
      if (!confirm('Are you sure you want to delete this journal entry?')) {
        return; 
      }

      fetch(`/messages/${messageId}`, {
        method: 'DELETE'
      })
      .then(response => response.text())
      .then(data => {
        console.log(data);
        if (data === 'Entry deleted!') {
          messageItem.remove();
        }
      })
      .catch(err => console.error('Error deleting entry:', err));
    });
  });
});
