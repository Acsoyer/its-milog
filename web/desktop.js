const desktopQuery = matchMedia('(min-width: 980px) and (hover: hover) and (pointer: fine)');
function desktopMode() {
  return desktopQuery.matches && !mobileLayout.checked;
}

function openWorkPanel(dialog) {
  if (!desktopMode()) {
    dialog.showModal();
    return;
  }
  for (const other of [calendar, detail, compose, quickManager, webAccount, drawer, timelineSettings]) {
    if (other !== dialog && other.open) other.close();
  }
  if (!dialog.open) dialog.show();
  dialog.classList.remove('desk-panel-flash');
  requestAnimationFrame(() => dialog.classList.add('desk-panel-flash'));
  dialog.querySelector('button, input')?.focus({ preventScroll: true });
}

let desktopMarkedLog = null;
let desktopMonth = null;
let desktopCalendarDay = null;
const desktopCalendarMode = document.querySelector('#desk-calendar-mode');
desktopCalendarMode.value = localStorage.getItem('milog-calendar-mode') === 'agenda' ? 'agenda' : 'journal';
desktopCalendarMode.addEventListener('change', () => localStorage.setItem('milog-calendar-mode', desktopCalendarMode.value));
function renderDesktopCalendarSelection() {
  document.querySelector('#desk-calendar-selection').hidden = !desktopCalendarDay;
  if (!desktopCalendarDay) return;
  const date = shiftDate(desktopCalendarDay, 0);
  document.querySelector('#desk-calendar-day').textContent = date.toLocaleDateString(milogLocale, { dateStyle: 'full' });
  const list = document.querySelector('#desk-calendar-entries');
  list.replaceChildren();
  for (const log of (accountLogs ?? []).filter((entry) => dateKey(new Date(entry.created_at)) === desktopCalendarDay)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = timeFormat.format(new Date(log.created_at)) + ' · ' + log.body;
    const show = () => {
      desktopMarkedLog = log;
      selectedDate = desktopCalendarDay;
      switchView(desktopCalendarMode.value === 'agenda');
    };
    button.addEventListener('dblclick', show);
    button.addEventListener('keydown', (event) => { if (event.key === 'Enter') show(); });
    list.append(button);
  }
  if (!list.childElementCount) list.textContent = 'No entries on this day.';
}
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
    button.textContent = new Date(log.created_at).toLocaleDateString(milogLocale) + ' · ' + log.body;
    button.addEventListener('click', () => revealDesktopLog(log));
    results.append(button);
  }
  if (!results.childElementCount) results.textContent = 'No entries found.';
}
document.querySelector('#desk-search').addEventListener('input', renderDesktopSearch);
function updateDesktopClock() {
  const date = shiftDate(selectedDate, 0).toLocaleDateString(milogLocale, { dateStyle: 'full' });
  document.querySelector('#desk-date').textContent = date + ' · ' + new Date().toLocaleTimeString(milogLocale, { hour: '2-digit', minute: '2-digit' });
  refreshInlineDates();
}
setInterval(updateDesktopClock, 1000);

desktopQuery.addEventListener('change', closeWorkPanels);
mobileLayout.addEventListener('change', closeWorkPanels);
function closeWorkPanels() {
  closeEntryDetail();
  for (const dialog of [calendar, detail, compose, quickManager, webAccount, drawer, timelineSettings]) dialog.close();
}

for (const button of document.querySelectorAll('[data-click]')) {
  const source = document.getElementById(button.dataset.click);
  const icon = source.querySelector('svg');
  if (icon && button.closest('.desktop-sidebar nav, .desk-tabs')) {
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
  document.querySelector('#desk-inline').hidden = !activeSession;
  document.querySelector('#desk-inline-title').textContent = agenda ? 'Plan an entry' : 'New entry';
  document.querySelector('#desk-inline-text').placeholder = agenda ? 'What are you planning?' : 'What’s happening?';
  for (const button of document.querySelectorAll('.desktop-sidebar nav [data-click], .desk-tabs [data-click]')) {
    const active = button.dataset.click === (agenda ? 'agenda-view' : 'log-view');
    button.setAttribute('aria-pressed', String(active));
  }
  const month = document.querySelector('#desk-month');
  const caption = document.createElement('p');
  caption.textContent = date.toLocaleDateString(milogLocale, { month: 'long', year: 'numeric' });
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
    button.setAttribute('aria-label', day.toLocaleDateString(milogLocale, { dateStyle: 'full' }));
    button.setAttribute('aria-pressed', String(dateKey(day) === (desktopCalendarDay ?? selectedDate)));
    button.classList.toggle('other-month', day.getMonth() !== index);
    button.classList.toggle('has-records', (accountLogs ?? []).some((log) => dateKey(new Date(log.created_at)) === dateKey(day)));
    button.addEventListener('click', () => {
      desktopCalendarDay = dateKey(day);
      updateDesktop();
      month.querySelector('[aria-pressed=true]')?.focus({ preventScroll: true });
    });
    days.append(button);
  }
  month.replaceChildren(caption, days);
  renderDesktopCalendarSelection();
}

for (const [id, direction] of [['desk-month-prev', -1], ['desk-month-next', 1]]) {
  document.querySelector('#' + id).addEventListener('click', () => {
    const date = desktopMonth ?? shiftDate(selectedDate, 0);
    desktopMonth = new Date(date.getFullYear(), date.getMonth() + direction, 1);
    updateDesktop();
  });
}
const inline = document.querySelector('#desk-inline-form');
const inlineText = document.querySelector('#desk-inline-text');
const inlinePreview = document.querySelector('#desk-entry-preview');
const detailCard = detail.querySelector('article');
const entryMenu = document.querySelector('#desk-entry-menu');
function showDesktopEntryPreview() {
  inline.hidden = true;
  inlinePreview.hidden = false;
  inlinePreview.append(detailCard);
}
function isEntryDetailVisible() {
  return detail.open || !inlinePreview.hidden;
}
function closeEntryDetail() {
  entryMenu.close();
  detail.close();
  detail.append(detailCard);
  inlinePreview.hidden = true;
  inline.hidden = false;
}
detailCard.querySelector('form').addEventListener('submit', (event) => {
  if (inlinePreview.hidden) return;
  event.preventDefault();
  closeEntryDetail();
});
function openDesktopEntryMenu(log, anchor) {
  currentDetail = log;
  refreshDetailActions();
  entryMenu.replaceChildren();
  for (const action of detailCard.querySelectorAll('footer button')) {
    const option = document.createElement('button');
    option.type = 'button';
    option.textContent = action.textContent;
    option.addEventListener('click', () => {
      entryMenu.close();
      openLogDetail(log);
      action.click();
    });
    entryMenu.append(option);
  }
  const box = anchor.getBoundingClientRect();
  entryMenu.style.left = Math.max(8, box.right - 190) + 'px';
  entryMenu.style.top = Math.min(box.bottom + 4, innerHeight - 220) + 'px';
  entryMenu.showModal();
}
entryMenu.addEventListener('click', (event) => {
  if (event.target === entryMenu) entryMenu.close();
});
setupEntryTools(composeForm, composeBody, updateComposeDirty);
setupEntryTools(inline, inlineText, refreshInlineDirty);
inline.querySelector('footer').prepend(inline.querySelector('.entry-tools'));
inlineText.required = false;
composeBody.required = false;
let inlineDate;
let inlineEnd;
function selectInlineAgendaSlot(slot) {
  inlineDate = new Date(slot);
  if (inlineEnd && inlineEnd <= inlineDate) inlineEnd = null;
  refreshInlineDates();
  refreshInlineDirty();
}
const inlineReset = document.querySelector('#desk-inline-reset');
function refreshInlineDirty() {
  const attached = hasEntryAttachments(inline);
  inlineReset.hidden = !inlineText.value && !inlineDate && !attached;
  inline.querySelector('[type=submit]').disabled = !inlineText.value.trim() && !attached;
}
inlineText.addEventListener('input', refreshInlineDirty);
inlineReset.addEventListener('click', () => {
  inline.reset();
  inlineDate = undefined;
  inlineEnd = null;
  clearEntryTools(inline);
  refreshInlineDates();
  refreshInlineDirty();
});
refreshInlineDirty();
function inlineDefaultDate() {
  const now = new Date();
  const date = shiftDate(selectedDate, 0);
  date.setHours(now.getHours(), now.getMinutes(), 0, 0);
  return date;
}
function refreshInlineDates() {
  const date = inlineDate ?? inlineDefaultDate();
  document.querySelector('#desk-inline-day').textContent = date.toLocaleDateString(milogLocale, { day: 'numeric', month: 'short' });
  document.querySelector('#desk-inline-time').textContent = timeFormat.format(date) + (inlineEnd ? ' – ' + formatEnd(date, inlineEnd) : '');
}
for (const [id, mode] of [['desk-inline-day', 'date'], ['desk-inline-time', 'time']]) {
  document.querySelector('#' + id).addEventListener('click', (event) => {
    const previousStart = start;
    const previousEnd = end;
    start = inlineDate ?? inlineDefaultDate();
    end = inlineEnd;
    showComposePicker(mode === 'time' && agenda ? 'quarters' : mode, event.currentTarget, (date, finish) => {
      inlineDate = date;
      inlineEnd = finish;
      refreshInlineDates();
      refreshInlineDirty();
    });
    start = previousStart;
    end = previousEnd;
  });
}
inline.addEventListener('submit', async (event) => {
  event.preventDefault();
  const session = activeSession;
  const body = inlineText.value.trim();
  if (!session || (!body && !hasEntryAttachments(inline))) return;
  const button = inline.querySelector('[type=submit]');
  button.disabled = true;
  const date = inlineDate ?? inlineDefaultDate();
  const id = crypto.randomUUID();
  let error;
  try {
    const { payload, cleanup } = await entryPayload(inline, session.user.id, id, body);
    const timing = { created_at: date.toISOString(), ...(inlineEnd ? { end_at: inlineEnd.toISOString() } : {}) };
    ({ error } = await client.from('logs').insert({ id, user_id: session.user.id, ...payload, kind: 'text', visibility: 'private', ...timing }));
    if (error) await cleanup();
  } catch (failure) { error = failure; }
  button.disabled = false;
  if (activeSession !== session) return;
  document.querySelector('#desk-inline-status').textContent = error ? 'Could not save entry. Try again.' : '';
  if (!error) {
    inline.reset();
    clearEntryTools(inline);
    inlineDate = undefined;
    inlineEnd = null;
    refreshInlineDirty();
    selectedDate = dateKey(date);
    closeWorkPanels();
    await showTimeline(session);
  }
});

