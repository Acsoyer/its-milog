const desktopQuery = matchMedia('(min-width: 980px) and (hover: hover) and (pointer: fine)');
function desktopMode() {
  return desktopQuery.matches && !mobileLayout.checked;
}

function openWorkPanel(dialog) {
  if (!desktopMode()) {
    dialog.showModal();
    return;
  }
  for (const other of [calendar, detail, compose, quickManager, webAccount]) {
    if (other !== dialog && other.open) other.close();
  }
  if (!dialog.open) dialog.show();
  dialog.classList.remove('desk-panel-flash');
  requestAnimationFrame(() => dialog.classList.add('desk-panel-flash'));
  dialog.querySelector('button, input')?.focus({ preventScroll: true });
}

let desktopMarkedLog = null;
let desktopMonth = null;
function revealDesktopLog(log) {
  desktopMarkedLog = log;
  selectedDate = dateKey(new Date(log.created_at));
  renderLogs(accountLogs ?? []);
}

function markDesktopLog() {
  if (!desktopMode() || !desktopMarkedLog) return;
  const target = [...timeline.querySelectorAll('[data-log-id]')].find((node) => node.dataset.logId === desktopMarkedLog.id);
  if (!target) return;
  target.closest('details')?.setAttribute('open', '');
  timeline.scrollTop += target.getBoundingClientRect().top - timeline.getBoundingClientRect().top - Math.max(4, (timeline.clientHeight - target.offsetHeight) / 2);
  target.classList.add('desk-entry-flash');
  setTimeout(() => target.classList.remove('desk-entry-flash'), 1000);
}

function renderDesktopSearch() {
  const query = document.querySelector('#desk-search').value.trim().toLocaleLowerCase('en');
  const results = document.querySelector('#desk-search-results');
  results.hidden = !query;
  results.replaceChildren();
  if (!query) return;
  for (const log of (accountLogs ?? []).filter((item) => item.body.toLocaleLowerCase('en').includes(query)).slice(0, 30)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = new Date(log.created_at).toLocaleDateString('en-GB') + ' · ' + log.body;
    button.addEventListener('click', () => revealDesktopLog(log));
    results.append(button);
  }
  if (!results.childElementCount) results.textContent = 'No entries found.';
}
document.querySelector('#desk-search').addEventListener('input', renderDesktopSearch);
function updateDesktopClock() {
  const date = shiftDate(selectedDate, 0).toLocaleDateString('en-GB', { dateStyle: 'full' });
  document.querySelector('#desk-date').textContent = date + ' · ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  refreshInlineDates();
}
setInterval(updateDesktopClock, 1000);

desktopQuery.addEventListener('change', closeWorkPanels);
mobileLayout.addEventListener('change', closeWorkPanels);
function closeWorkPanels() {
  for (const dialog of [calendar, detail, compose, quickManager, webAccount]) dialog.close();
}

for (const button of document.querySelectorAll('[data-click]')) {
  const source = document.getElementById(button.dataset.click);
  const icon = source.querySelector('svg');
  if (icon && button.closest('.desktop-sidebar nav')) {
    const graphic = icon.cloneNode(true);
    graphic.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    graphic.setAttribute('aria-hidden', 'true');
    button.replaceChildren(graphic, button.querySelector('span'));
  }
  button.addEventListener('click', () => source.click());
}

function focusDesktopDate(date) {
  desktopMarkedLog = null;
  desktopMonth = null;
  selectedAgendaSlot = null;
  selectedDate = dateKey(date);
  if (agenda || !accountLogs) {
    switchView(true);
    return;
  }
  const entry = [...timeline.querySelectorAll('[data-log-date]')].find((day) => day.dataset.logDate === selectedDate);
  if (entry) {
    timeline.scrollTop = entry.offsetTop;
    updateDesktop();
  } else switchView(true);
}
document.querySelector('#desk-prev').addEventListener('click', () => focusDesktopDate(shiftDate(selectedDate, -1)));
document.querySelector('#desk-next').addEventListener('click', () => focusDesktopDate(shiftDate(selectedDate, 1)));

function updateDesktop() {
  const date = desktopMonth ?? shiftDate(selectedDate, 0);
  updateDesktopClock();
  document.querySelector('#desk-inline').hidden = agenda || !activeSession;
  for (const button of document.querySelectorAll('.desktop-sidebar nav [data-click], .desk-tabs [data-click]')) {
    const active = button.dataset.click === (agenda ? 'agenda-view' : 'log-view');
    button.setAttribute('aria-pressed', String(active));
  }
  const month = document.querySelector('#desk-month');
  const caption = document.createElement('p');
  caption.textContent = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const days = document.createElement('div');
  days.className = 'desk-days';
  for (const day of ['M', 'T', 'W', 'T', 'F', 'S', 'S']) {
    const label = document.createElement('small');
    label.textContent = day;
    days.append(label);
  }
  const year = date.getFullYear();
  const index = date.getMonth();
  const offset = (new Date(year, index, 1).getDay() + 6) % 7;
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(year, index, i - offset + 1);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = day.getDate();
    button.setAttribute('aria-label', day.toLocaleDateString('en-GB', { dateStyle: 'full' }));
    button.setAttribute('aria-pressed', String(dateKey(day) === selectedDate));
    button.classList.toggle('other-month', day.getMonth() !== index);
    button.classList.toggle('has-records', (accountLogs ?? []).some((log) => dateKey(new Date(log.created_at)) === dateKey(day)));
    button.addEventListener('click', () => focusDesktopDate(day));
    days.append(button);
  }
  month.replaceChildren(caption, days);
}

for (const [id, direction] of [['desk-month-prev', -1], ['desk-month-next', 1]]) {
  document.querySelector('#' + id).addEventListener('click', () => {
    const date = desktopMonth ?? shiftDate(selectedDate, 0);
    desktopMonth = new Date(date.getFullYear(), date.getMonth() + direction, 1);
    updateDesktop();
  });
}
const inline = document.querySelector('#desk-inline');
const inlineText = document.querySelector('#desk-inline-text');
let inlineDate;
function inlineDefaultDate() {
  const now = new Date();
  const date = shiftDate(selectedDate, 0);
  date.setHours(now.getHours(), now.getMinutes(), 0, 0);
  return date;
}
function refreshInlineDates() {
  const date = inlineDate ?? inlineDefaultDate();
  document.querySelector('#desk-inline-day').textContent = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  document.querySelector('#desk-inline-time').textContent = timeFormat.format(date);
}
for (const [id, mode] of [['desk-inline-day', 'date'], ['desk-inline-time', 'time']]) {
  document.querySelector('#' + id).addEventListener('click', (event) => {
    const previousStart = start;
    const previousEnd = end;
    start = inlineDate ?? inlineDefaultDate();
    end = null;
    showComposePicker(mode, event.currentTarget, (date) => {
      inlineDate = date;
      refreshInlineDates();
    });
    start = previousStart;
    end = previousEnd;
  });
}
document.querySelector('#desk-inline-options').addEventListener('click', () => openCompose(inlineText.value));
inline.addEventListener('submit', async (event) => {
  event.preventDefault();
  const session = activeSession;
  const body = inlineText.value.trim();
  if (!session || !body) return;
  const button = inline.querySelector('[type=submit]');
  button.disabled = true;
  const date = inlineDate ?? inlineDefaultDate();
  const { error } = await client.from('logs').insert({
    id: crypto.randomUUID(), user_id: session.user.id, body, kind: 'text', visibility: 'private', created_at: date.toISOString(),
  });
  button.disabled = false;
  if (activeSession !== session) return;
  document.querySelector('#desk-inline-status').textContent = error ? 'Could not save entry. Try again.' : '';
  if (!error) {
    inline.reset();
    inlineDate = undefined;
    selectedDate = dateKey(date);
    closeWorkPanels();
    await showTimeline(session);
  }
});
