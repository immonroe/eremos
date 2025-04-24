// var thumbUp = document.getElementsByClassName("fa-thumbs-up");
// var thumbDown = document.getElementsByClassName("fa-thumbs-down");
// var editEntry = document.getElementsByClassName("fa-pencil");
var trash = document.getElementsByClassName("fa-trash-o");

Array.from(trash).forEach(function(element) {
      element.addEventListener('click', function(){
        // Researched dynamic way to grab elements to delete, for some reason I ran into a bug where this.parentNode.parentNode.childNodes[i].innerText was not working
        const messageItem = this.closest('.message');
        const name = messageItem.querySelector('strong:nth-of-type(1)').nextSibling.textContent.trim().replace(':', '');
        const item = messageItem.querySelector('strong:nth-of-type(2)').nextSibling.textContent.trim().replace(':', '');
        fetch('messages', {
          method: 'delete',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            'name': name,
            'item': item
          })
        }).then(function (response) {
          window.location.reload()
        })
      });
});

// Array.from(thumbUp).forEach(function(element) {
//       element.addEventListener('click', function(){
//         const name = this.parentNode.parentNode.childNodes[1].innerText
//         const msg = this.parentNode.parentNode.childNodes[3].innerText
//         const thumbUp = parseFloat(this.parentNode.parentNode.childNodes[5].innerText)
//         fetch('messages/upvote', {
//           method: 'put',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             'name': name,
//             'msg': msg,
//             'thumbUp':thumbUp
//           })
//         })
//         .then(response => {
//           if (response.ok) return response.json()
//         })
//         .then(data => {
//           console.log(data)
//           window.location.reload(true)
//         })
//       });
// });

// Array.from(thumbDown).forEach(function(element) {
//   element.addEventListener('click', function(){
//     const name = this.parentNode.parentNode.childNodes[1].innerText
//     const msg = this.parentNode.parentNode.childNodes[3].innerText
//     const thumbUp = parseFloat(this.parentNode.parentNode.childNodes[5].innerText)
//     // const thumbDown = parseFloat(this.parentNode.parentNode.childNodes[7].innerText)
//     fetch('messages/downvote', {
//       method: 'put',
//       headers: {'Content-Type': 'application/json'},
//       body: JSON.stringify({
//         'name': name,
//         'msg': msg,
//         'thumbUp':thumbUp
//       })
//     })
//     .then(response => {
//       if (response.ok) return response.json()
//     })
//     .then(data => {
//       console.log(data)
//       window.location.reload(true)
//     })
//   });
// });