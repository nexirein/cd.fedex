/* Clearance Desk mockup — flow helpers (design only, no real logic) */
document.addEventListener('click', function (e) {
  // clickable table rows -> data-href
  var tr = e.target.closest('tr[data-href]');
  if (tr) { window.location.href = tr.getAttribute('data-href'); return; }

  // tabs
  var tab = e.target.closest('.tab');
  if (tab) {
    var bar = tab.closest('.tabbar');
    bar.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
    tab.classList.add('active');
    var scope = document.querySelector(tab.getAttribute('data-scope')) || document;
    scope.querySelectorAll('.tabpane').forEach(function (p) { p.classList.remove('active'); });
    var pane = document.querySelector(tab.getAttribute('data-target'));
    if (pane) pane.classList.add('active');
  }
});
