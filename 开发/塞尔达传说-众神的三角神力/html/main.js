(function () {
    var tocLinks = document.querySelectorAll('.page-toc-list a');
    if (!tocLinks.length) return;

    var sections = [];
    tocLinks.forEach(function (link) {
        var id = link.getAttribute('href').slice(1);
        var el = document.getElementById(id);
        if (el) sections.push({ id: id, el: el, link: link });
    });
    if (!sections.length) return;

    var current = '';

    function onScroll() {
        var scrollY = window.scrollY;
        var found = '';
        for (var i = sections.length - 1; i >= 0; i--) {
            if (scrollY >= sections[i].el.offsetTop - 120) {
                found = sections[i].id;
                break;
            }
        }
        if (found !== current) {
            current = found;
            tocLinks.forEach(function (link) {
                link.classList.toggle('active', link.getAttribute('href') === '#' + found);
            });
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
})();
