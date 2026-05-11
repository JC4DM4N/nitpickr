(function () {
  var BASE = 'https://nitpickr.dev';

  function render(el, data) {
    var figure = document.createElement('figure');
    figure.style.cssText = 'margin:0;padding:0';

    var blockquote = document.createElement('blockquote');
    blockquote.style.cssText = 'margin:0';
    blockquote.textContent = '“' + data.quote_text + '”';

    var figcaption = document.createElement('figcaption');
    figcaption.style.cssText = 'margin-top:10px';

    var link = document.createElement('a');
    link.href = BASE;
    link.target = '_blank';
    link.rel = 'noopener';
    link.style.cssText = 'display:inline-block;text-decoration:none';

    var img = document.createElement('img');
    img.src = BASE + '/nitpickr_verified.svg';
    img.alt = 'NitPickr Verified';
    img.width = 140;
    img.height = 32;
    img.style.cssText = 'display:block';

    link.appendChild(img);
    figcaption.appendChild(link);
    figure.appendChild(blockquote);
    figure.appendChild(figcaption);

    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(figure);
  }

  function init() {
    document.querySelectorAll('[data-nitpickr]').forEach(function (el) {
      var id = el.getAttribute('data-nitpickr');
      fetch(BASE + '/testimonials/' + encodeURIComponent(id))
        .then(function (r) {
          if (!r.ok) throw new Error('not found');
          return r.json();
        })
        .then(function (data) { render(el, data); })
        .catch(function () {});
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
