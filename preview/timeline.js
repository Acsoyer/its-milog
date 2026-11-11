const search = document.querySelector('#search');
const searchToggle = document.querySelector('#search-toggle');
const timeline = document.querySelector('.timeline');
const panel = document.querySelector('#panel');
const title = document.querySelector('#panel-title');
const copy = document.querySelector('#panel-copy');

searchToggle?.addEventListener('click', () => {
  search.hidden = !search.hidden;
  searchToggle.setAttribute('aria-expanded', String(!search.hidden));
  if (!search.hidden) search.focus();
});

search.addEventListener('input', () => {
  const entries = [...timeline.querySelectorAll('.entry')];
  const query = search.value.trim().toLocaleLowerCase('tr');
  for (const entry of entries) {
    entry.hidden = !entry.textContent.toLocaleLowerCase('tr').includes(query);
  }
  const empty = document.querySelector('#empty');
  if (empty) empty.hidden = entries.some((entry) => !entry.hidden);
});

function showPanel(heading, description) {
  title.textContent = heading;
  copy.textContent = description;
  panel.showModal();
}

for (const record of document.querySelectorAll('.record')) {
  record.addEventListener('click', () => {
    showPanel(record.firstElementChild.textContent, record.querySelector('.excerpt')?.textContent ?? '');
  });
}
document.querySelector('#quick')?.addEventListener('click', () => {
  showPanel('Hızlı kayıt', 'Bu panel, açılış ve kapanış akışını denemek için hazırlandı.');
});
document.querySelector('#today').addEventListener('click', () => timeline.scrollTo({ top: 0 }));
