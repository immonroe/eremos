document.addEventListener('DOMContentLoaded', () => {
  const deleteBtns = document.querySelectorAll('.delete-btn');

  deleteBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      const messageItem = this.closest('li');
      const messageId = messageItem.getAttribute('data-id'); 
      console.log('Deleting message with ID:', messageId);

      fetch('/messages', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ _id: messageId })
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