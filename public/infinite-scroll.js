(function () {
  var LIMIT = 10;

  function getListContainer() {
    return document.querySelector('.history-list');
  }

  function getSentinel() {
    return document.getElementById('loadMoreSentinel');
  }

  function getFragmentUrl(listType, page) {
    if (listType === 'bookmarks') {
      return '/bookmarks/entries?page=' + page + '&limit=' + LIMIT;
    }
    return '/profile/entries?page=' + page + '&limit=' + LIMIT;
  }

  function loadMore(sentinel) {
    var listType = sentinel.getAttribute('data-list');
    var nextPage = sentinel.getAttribute('data-next-page');
    var hasMore = sentinel.getAttribute('data-has-more') === 'true';

    if (!hasMore || !nextPage || sentinel.getAttribute('data-loading') === 'true') return;

    var container = getListContainer();
    if (!container) return;

    sentinel.setAttribute('data-loading', 'true');
    var url = getFragmentUrl(listType, nextPage);

    fetch(url)
      .then(function (res) { return res.text(); })
      .then(function (html) {
        sentinel.remove();
        container.insertAdjacentHTML('beforeend', html);
        var newSentinel = getSentinel();
        if (newSentinel) observeSentinel(newSentinel);
      })
      .catch(function () {
        sentinel.removeAttribute('data-loading');
      });
  }

  function observeSentinel(sentinel) {
    if (!sentinel || !window.IntersectionObserver) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) loadMore(entry.target);
        });
      },
      { rootMargin: '200px', threshold: 0 }
    );

    observer.observe(sentinel);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var sentinel = getSentinel();
    if (sentinel) observeSentinel(sentinel);
  });
})();
