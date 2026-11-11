const client = window.supabase.createClient(window.SUPABASE.url, window.SUPABASE.anonKey);
const gate = document.querySelector('#account-gate');
const form = document.querySelector('#auth-form');
const submit = document.querySelector('#auth-submit');
const modeButton = document.querySelector('#auth-switch');
const message = document.querySelector('#auth-status');
const nameField = document.querySelector('#name-field');
const signout = document.querySelector('#web-signout');
const app = [...document.querySelectorAll('.phone > :not(#account-gate):not(#search):not(dialog)')];
let registering = false;
let accountVersion = 0;
let accountLogs = null;
let agenda = false;
const agendaButton = document.querySelector('#agenda-view');
const logButton = document.querySelector('#log-view');
const phone = document.querySelector('.phone');
const drawer = document.querySelector('#profile-drawer');
const avatar = document.querySelector('#profile-toggle');
const citySelect = document.querySelector('#sky-city');
const calendar = document.querySelector('#calendar-dialog');
const calendarSearch = document.querySelector('#calendar-search');
const calendarSearchToggle = document.querySelector('#calendar-search-toggle');
const calendarGrid = document.querySelector('#calendar-grid');
const calendarRecords = document.querySelector('#calendar-records');
const quickSheet = document.querySelector('#quick-sheet');
const quickManager = document.querySelector('#quick-manager');
const quickStatus = document.querySelector('#quick-status');
const compose = document.querySelector('#compose-dialog');
const composeForm = document.querySelector('#compose-form');
const composeBody = document.querySelector('#compose-body');
const composeStatus = document.querySelector('#compose-status');
const dateKey = (date) => date.toLocaleDateString('sv-SE');
let activeSession = null;
let selectedDate = dateKey(new Date());
let calendarDay = selectedDate;
let calendarMonth = new Date();
const { CITIES, DEFAULT_CITY_ID, skyProfileForCity } = window.MilogSky;
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const initialCity = CITIES.find((city) => city.tz === timezone)?.id ?? DEFAULT_CITY_ID;
const cityNames = {
  izmir: 'Izmir', kars: 'Kars', london: 'London', rome: 'Rome', lisbon: 'Lisbon',
  athens: 'Athens', vienna: 'Vienna', moscow: 'Moscow', riyadh: 'Riyadh',
  mecca: 'Mecca', cairo: 'Cairo', beirut: 'Beirut', baghdad: 'Baghdad',
  tashkent: 'Tashkent', bishkek: 'Bishkek', ashgabat: 'Ashgabat',
  dushanbe: 'Dushanbe', baku: 'Baku', newdelhi: 'New Delhi', karachi: 'Karachi',
  islamabad: 'Islamabad', dhaka: 'Dhaka', kathmandu: 'Kathmandu', beijing: 'Beijing',
  shanghai: 'Shanghai', seoul: 'Seoul', singapore: 'Singapore', jakarta: 'Jakarta',
  casablanca: 'Casablanca', tunis: 'Tunis',
};
const regionNames = {
  'Türkiye': 'Türkiye', 'Avrupa': 'Europe', 'Kuzey Amerika & Kanada': 'North America',
  'Güney Amerika': 'South America', 'Orta Doğu': 'Middle East', 'Orta Asya': 'Central Asia',
  'Güney Asya': 'South Asia', 'Doğu Asya': 'East and Southeast Asia',
  'Afrika': 'Africa', 'Okyanusya': 'Oceania',
};
const cityGroups = new Map();
for (const city of CITIES) {
  if (!cityGroups.has(city.group)) {
    const group = document.createElement('optgroup');
    group.label = regionNames[city.group] ?? city.group;
    citySelect.append(group);
    cityGroups.set(city.group, group);
  }
  cityGroups.get(city.group).append(new Option(cityNames[city.id] ?? city.name, city.id));
}
citySelect.value = localStorage.getItem('milog-sky-city') || initialCity;

function updateSky() {
  const sky = skyProfileForCity(citySelect.value || initialCity);
  phone.style.setProperty('--sky-header', 'linear-gradient(' + sky.colors.join(', ') + ')');
  phone.style.setProperty('--sky-bg', sky.darkestColor);
  phone.style.setProperty('--sky-ink', sky.textColor);
  const darkInk = /^#[0-9a-f]{6}$/i.test(sky.textColor) &&
    [1, 3, 5].map((index) => parseInt(sky.textColor.slice(index, index + 2), 16))
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0) < 150;
  phone.classList.toggle('sky-light-logo', !darkInk);
  document.querySelector('#calendar-number').textContent = new Date().getDate();
}
citySelect.addEventListener('change', () => {
  localStorage.setItem('milog-sky-city', citySelect.value);
  updateSky();
});
updateSky();
setInterval(updateSky, 60000);
avatar.addEventListener('click', () => openWorkPanel(drawer));
const detail = document.querySelector('#web-log-detail');
const timelineMenu = document.querySelector('#timeline-menu');
const timelineSettings = document.querySelector('#timeline-settings');
const timelineActivity = document.querySelector('#timeline-activity');
const webAccount = document.querySelector('#web-account');
const sortToggle = document.querySelector('#timeline-sort');
const mobileLayout = document.querySelector('#mobile-layout');
const profileTheme = document.querySelector('#profile-theme');
mobileLayout.checked = localStorage.getItem('milog-mobile-layout') === 'true';
function updateLayout() {
  document.documentElement.classList.toggle('force-mobile', mobileLayout.checked);
}
mobileLayout.addEventListener('change', () => {
  localStorage.setItem('milog-mobile-layout', String(mobileLayout.checked));
  updateLayout();
  timelineMenu.close();
});
updateLayout();
document.querySelector('#settings-mobile-view').addEventListener('click', () => {
  timelineSettings.close();
  mobileLayout.click();
});
profileTheme.value = localStorage.getItem('milog-web-theme') === 'dark' ? 'dark' : 'light';
function updateTheme() {
  phone.classList.toggle('theme-dark', profileTheme.value === 'dark');
}
profileTheme.addEventListener('change', () => {
  localStorage.setItem('milog-web-theme', profileTheme.value);
  updateTheme();
});
updateTheme();
let editedLog = null;
let currentDetail = null;
sortToggle.checked = localStorage.getItem('milog-late-on-top') === 'true';
sortToggle.addEventListener('change', () => {
  localStorage.setItem('milog-late-on-top', String(sortToggle.checked));
  if (agenda && accountLogs) renderLogs(accountLogs);
});
document.querySelector('#settings-toggle').addEventListener('click', () => {
  document.querySelector('#timeline-settings-open').textContent = agenda ? 'Agenda settings' : 'Journal settings';
  if (desktopMode()) {
    document.querySelector('#timeline-settings-title').textContent = 'Settings';
    document.querySelector('#timeline-sort-row').hidden = !agenda;
    openWorkPanel(timelineSettings);
  } else timelineMenu.showModal();
});
timelineMenu.addEventListener('click', (event) => { if (event.target === timelineMenu) timelineMenu.close(); });
document.querySelector('#timeline-settings-open').addEventListener('click', (event) => {
  document.querySelector('#timeline-settings-title').textContent = event.currentTarget.textContent;
  document.querySelector('#timeline-sort-row').hidden = !agenda;
  timelineMenu.close();
  timelineSettings.showModal();
});
document.querySelector('#timeline-activity-open').addEventListener('click', () => {
  timelineMenu.close();
  document.querySelector('#web-activity-list').textContent = 'Mobile activity history is unavailable in this session.';
  timelineActivity.showModal();
});
document.querySelector('#profile-account').addEventListener('click', () => {
  drawer.close();
  openWorkPanel(webAccount);
});

function openLogDetail(log) {
  currentDetail = log;
  const date = new Date(log.created_at);
  document.querySelector('#detail-time').textContent = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  document.querySelector('#detail-date').textContent = date.toLocaleDateString('en-GB', { dateStyle: 'full' });
  document.querySelector('#detail-body').textContent = log.body;
  document.querySelector('#detail-status').textContent = '';
  const attachments = document.querySelector('#detail-attachments');
  attachments.replaceChildren();
  for (const [field, bucket, tag] of [['image_path', 'log-images', 'img'], ['audio_path', 'log-audio', 'audio']]) {
    if (!log[field]) continue;
    client.storage.from(bucket).createSignedUrl(log[field], 300).then(({ data }) => {
      if (!data || currentDetail !== log || !detail.open) return;
      const media = document.createElement(tag);
      media.src = data.signedUrl;
      if (tag === 'img') media.alt = 'Entry photo';
      else media.controls = true;
      attachments.append(media);
    });
  }
  refreshDetailActions();
  openWorkPanel(detail);
}
function entryFlag(log, flag) {
  return 'milog-entry:' + activeSession?.user.id + ':' + log.id + ':' + flag;
}
function refreshDetailActions() {
  for (const [id, flag, off, on] of [
    ['detail-hide', 'hidden', 'Hide', 'Show'],
    ['detail-highlight', 'highlight', 'Highlight of the day', 'Remove highlight'],
  ]) {
    const button = document.getElementById(id);
    const enabled = localStorage.getItem(entryFlag(currentDetail, flag)) === '1';
    button.textContent = enabled ? on : off;
    button.setAttribute('aria-pressed', String(enabled));
  }
}
for (const [id, flag] of [['detail-hide', 'hidden'], ['detail-highlight', 'highlight']]) {
  document.getElementById(id).addEventListener('click', () => {
    if (!currentDetail || !activeSession) return;
    const key = entryFlag(currentDetail, flag);
    if (localStorage.getItem(key)) localStorage.removeItem(key);
    else localStorage.setItem(key, '1');
    refreshDetailActions();
    if (accountLogs) renderLogs(accountLogs);
  });
}
document.querySelector('#detail-share').addEventListener('click', async () => {
  if (!currentDetail?.body || !confirm('Share the text of this entry?')) return;
  const status = document.querySelector('#detail-status');
  try {
    if (navigator.share) await navigator.share({ text: currentDetail.body });
    else {
      await navigator.clipboard.writeText(currentDetail.body);
      status.textContent = 'Entry text copied.';
    }
  } catch (error) {
    if (error.name !== 'AbortError') status.textContent = 'Could not share this entry.';
  }
});
document.querySelector('#detail-edit').addEventListener('click', () => {
  editedLog = currentDetail;
  detail.close();
  openComposeEditor(editedLog.body, editedLog.created_at);
  document.querySelector('#compose-title').textContent = 'Edit entry';
});
document.querySelector('#detail-delete').addEventListener('click', async (event) => {
  const session = activeSession;
  if (!session || !currentDetail || !confirm('Delete this entry?')) return;
  const button = event.currentTarget;
  const id = currentDetail.id;
  button.disabled = true;
  const { error } = await client.from('logs').delete().eq('id', id).eq('user_id', session.user.id);
  button.disabled = false;
  if (activeSession !== session) return;
  if (error) {
    document.querySelector('#detail-status').textContent = 'Could not delete entry.';
    return;
  }
  detail.close();
  await showTimeline(session);
  if (calendar.open) renderCalendar();
});

function populateProfile(user) {
  const name = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Milog';
  if (desktopMode()) {
    const username = String(user.user_metadata?.username || user.email?.split('@')[0] || 'milog').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'milog';
    if (location.pathname !== '/' + username) history.replaceState(null, '', '/' + username);
  }
  document.querySelector('#profile-name').textContent = name;
  document.querySelector('#profile-email').textContent = '@' + (user.user_metadata?.username || user.email?.split('@')[0] || 'milog');
  document.querySelector('#web-account-name').textContent = name;
  document.querySelector('#web-account-email').textContent = user.email ?? '';
  for (const target of [avatar, document.querySelector('#drawer-avatar')]) {
    target.textContent = name.slice(0, 1).toLocaleUpperCase('tr');
    const url = user.user_metadata?.avatar_url;
    if (typeof url === 'string' && url.startsWith('https://')) {
      const image = document.createElement('img');
      image.alt = '';
      image.addEventListener('load', () => target.replaceChildren(image));
      image.src = url;
    }
  }
}

function showAccount() {
  if (location.pathname !== '/') history.replaceState(null, '', '/');
  desktopCalendarDay = null;
  desktopMarkedLog = null;
  desktopMonth = null;
  inlineDate = undefined;
  document.querySelector('#desk-search').value = '';
  renderDesktopSearch();
  document.querySelector('#desk-inline').reset();
  clearEntryTools(document.querySelector('#desk-inline'));
  refreshInlineDirty();
  document.querySelector('#desk-shortcuts').replaceChildren();
  document.documentElement.classList.remove('milog-signed-in');
  accountVersion += 1;
  accountLogs = null;
  rail.hidden = true;
  activeSession = null;
  editedLog = currentDetail = null;
  for (const dialog of [detail, timelineMenu, timelineSettings, timelineActivity, webAccount]) dialog.close();
  selectedAgendaSlot = null;
  document.querySelector('#compose-picker').close();
  for (const dialog of [drawer, calendar, compose, quickSheet, quickManager, document.querySelector('#quick-editor'), document.querySelector('#quick-folder-editor')]) dialog.close();
  composeForm.reset();
  if (panel.open) panel.close();
  search.value = '';
  search.hidden = true;
  app.forEach((element) => { element.hidden = true; });
  gate.hidden = false;
  timeline.replaceChildren();
}

function dateHeading(date) {
  const heading = document.createElement('h2');
  heading.className = 'date';
  const number = document.createElement('span');
  number.className = 'day-number';
  number.textContent = date.getDate();
  const meta = document.createElement('span');
  meta.className = 'date-meta';
  for (const part of ['month', 'weekday']) {
    const label = document.createElement('span');
    label.textContent = date.toLocaleDateString('en-GB', { [part]: 'long' });
    meta.append(label);
  }
  heading.append(number, meta);
  const relative = new Date();
  const today = dateKey(relative);
  relative.setDate(relative.getDate() - 1);
  const caption = dateKey(date) === today ? 'Today' : dateKey(date) === dateKey(relative) ? 'Yesterday' : '';
  if (caption) {
    const badge = document.createElement('span');
    badge.className = 'date-badge';
    badge.textContent = caption;
    heading.append(badge);
  }
  return heading;
}

const rail = document.createElement('nav');
rail.className = 'day-rail';
rail.hidden = true;
rail.setAttribute('aria-label', 'Agenda dates');
phone.append(rail);
let agendaByDate = new Map();
let dragging = false;
let pointerDay;
let railStartDay;

function shiftDate(key, offset) {
  const date = new Date(key + 'T12:00:00');
  date.setDate(date.getDate() + offset);
  return date;
}

function makeAgendaDay(date, scheduled) {
  const day = document.createElement('article');
  day.className = 'day';
  day.dataset.date = dateKey(date);
  day.append(dateHeading(date));
  const slots = document.createElement('div');
  day.append(slots);
  const night = document.createElement('details');
  night.className = 'agenda-night';
  const nightLabel = document.createElement('summary');
  nightLabel.textContent = 'Night · 23:00–06:59';
  night.append(nightLabel);
  const hours = [...Array.from({ length: 16 }, (_, index) => index + 7), 23, ...Array.from({ length: 7 }, (_, index) => index)];
  if (sortToggle.checked) hours.reverse();
  for (const hour of hours) {
    const isNight = hour >= 23 || hour < 7;
    if (isNight && !night.parentNode) slots.append(night);
    const group = isNight ? night : slots;
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'agenda-hour';
    row.dataset.slot = day.dataset.date + 'T' + String(hour).padStart(2, '0') + ':00';
    row.setAttribute('aria-pressed', String(row.dataset.slot === selectedAgendaSlot));
    row.addEventListener('click', () => {
      const previous = timeline.querySelector('.agenda-hour[aria-pressed=true]');
      previous?.setAttribute('aria-pressed', 'false');
      selectedAgendaSlot = selectedAgendaSlot === row.dataset.slot ? null : row.dataset.slot;
      row.setAttribute('aria-pressed', String(Boolean(selectedAgendaSlot)));
      selectedDate = day.dataset.date;
      updateRail();
      if (desktopMode() && compose.open) setComposeAgendaSlot(row.dataset.slot);
    });
    row.addEventListener('dblclick', () => {
      if (!desktopMode()) return;
      selectedAgendaSlot = row.dataset.slot;
      row.setAttribute('aria-pressed', 'true');
      if (compose.open) setComposeAgendaSlot(row.dataset.slot);
      else openCompose();
    });
    const slotRow = document.createElement('div');
    slotRow.className = 'agenda-slot-row';
    slotRow.append(row);
    if (desktopMode()) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'agenda-slot-add';
      add.textContent = '+ Add entry';
      add.addEventListener('click', () => {
        selectedAgendaSlot = row.dataset.slot;
        selectedDate = day.dataset.date;
        timeline.querySelector('.agenda-hour[aria-pressed=true]')?.setAttribute('aria-pressed', 'false');
        row.setAttribute('aria-pressed', 'true');
        if (compose.open) setComposeAgendaSlot(row.dataset.slot);
        else openCompose();
      });
      slotRow.append(add);
    }
    const label = document.createElement('time');
    label.textContent = String(hour).padStart(2, '0') + ':00';
    const entries = scheduled.filter((item) => new Date(item.created_at).getHours() === hour);
    if (!sortToggle.checked) entries.reverse();
    if (!entries.length) label.className = 'empty-hour';
    row.append(label);
    group.append(slotRow);
    for (const log of entries) {
      const button = document.createElement('button');
      button.className = 'agenda-record';
      button.dataset.logId = log.id;
      const time = document.createElement('time');
      time.textContent = new Date(log.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const body = document.createElement('span');
      body.textContent = desktopMode() && localStorage.getItem(entryFlag(log, 'hidden')) ? 'Hidden entry' : [log.emoji, log.body].filter(Boolean).join(' ');
      button.append(time, body);
      button.addEventListener('click', () => openLogDetail(log));
      group.append(button);
    }
  }

  return day;
}

function agendaPage(date) {
  return makeAgendaDay(date, agendaByDate.get(dateKey(date)) ?? []);
}

function jumpToAgendaDay(date) {
  selectedDate = dateKey(date);
  let page = timeline.querySelector('[data-date="' + selectedDate + '"]');
  if (!page) {
    timeline.replaceChildren(...Array.from({ length: 17 }, (_, index) =>
      agendaPage(shiftDate(selectedDate, 8 - index))));
    page = timeline.children[8];
  }
  timeline.scrollTop = page.offsetTop;
  updateRail();
}

function renderAgenda(logs) {
  agendaByDate = new Map();
  for (const log of logs) {
    const key = dateKey(new Date(log.created_at));
    if (!agendaByDate.has(key)) agendaByDate.set(key, []);
    agendaByDate.get(key).push(log);
  }
  rail.hidden = false;
  jumpToAgendaDay(shiftDate(selectedDate, 0));
}

function updateRail() {
  updateDesktop();
  if (dragging) return;
  rail.replaceChildren();
  for (let offset = 7; offset >= -7; offset -= 1) {
    const date = shiftDate(selectedDate, offset);
    const button = document.createElement('button');
    button.textContent = date.getDate();
    button.setAttribute('aria-label', date.toLocaleDateString('en-GB', { dateStyle: 'long' }));
    button.setAttribute('aria-pressed', String(offset === 0));
    button.addEventListener('click', (event) => {
      if (event.detail === 0) jumpToAgendaDay(date);
    });
    rail.append(button);
  }
}

function previewRailDate(event) {
  const buttons = [...rail.querySelectorAll('button')];
  const nearest = buttons.reduce((best, button, index) => {
    const box = button.getBoundingClientRect();
    const distance = Math.abs(event.clientY - box.top - box.height / 2);
    return distance < best.distance ? { index, distance, box } : best;
  }, { distance: Infinity });
  pointerDay = shiftDate(railStartDay, 7 - nearest.index);
  let pill = rail.querySelector('.rail-pill');
  if (!pill) {
    pill = document.createElement('span');
    pill.className = 'rail-pill';
    rail.append(pill);
  }
  pill.style.top = (nearest.box.top + nearest.box.height / 2 - rail.getBoundingClientRect().top) + 'px';
  const number = document.createElement('b');
  number.textContent = pointerDay.getDate();
  const meta = document.createElement('span');
  meta.textContent = pointerDay.toLocaleDateString('en-GB', { month: 'short', weekday: 'short' });
  if (dateKey(pointerDay) === dateKey(new Date())) meta.textContent += ' · Today';
  pill.replaceChildren(number, meta);
}

rail.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  railStartDay = selectedDate;
  const index = [...rail.querySelectorAll('button')].indexOf(event.target.closest('button'));
  dragging = true;
  rail.setPointerCapture(event.pointerId);
  rail.classList.add('expanded');
  const target = rail.children[index];
  const box = target?.getBoundingClientRect();
  previewRailDate(box ? { clientY: box.top + box.height / 2 } : event);
});
rail.addEventListener('pointermove', (event) => {
  if (dragging && rail.hasPointerCapture(event.pointerId)) previewRailDate(event);
});
function finishRail(event) {
  if (!dragging || !event.isPrimary) return;
  dragging = false;
  rail.classList.remove('expanded');
  if (event.type === 'pointerup' && pointerDay) jumpToAgendaDay(pointerDay);
  else updateRail();
  pointerDay = undefined;
}
rail.addEventListener('pointerup', finishRail);
rail.addEventListener('pointercancel', finishRail);
rail.addEventListener('lostpointercapture', finishRail);

timeline.addEventListener('scroll', () => {
  if (!agenda || !timeline.firstElementChild?.dataset.date) return;
  let first = timeline.firstElementChild;
  let last = timeline.lastElementChild;
  if (timeline.scrollTop < timeline.clientHeight) {
    const previousTop = first.offsetTop;
    const pages = Array.from({ length: 7 }, (_, index) => agendaPage(shiftDate(first.dataset.date, 7 - index)));
    timeline.prepend(...pages);
    timeline.scrollTop += first.offsetTop - previousTop;
  }
  if (timeline.scrollHeight - timeline.scrollTop - timeline.clientHeight < timeline.clientHeight) {
    timeline.append(...Array.from({ length: 7 }, (_, index) => agendaPage(shiftDate(last.dataset.date, -index - 1))));
  }
  const y = timeline.scrollTop + 12;
  const current = [...timeline.children].findLast((page) => page.offsetTop <= y);
  if (current && current.dataset.date !== selectedDate) {
    selectedDate = current.dataset.date;
    updateRail();
  }
}, { passive: true });

function renderLogs(logs) {
  updateDesktop();
  timeline.replaceChildren();
  timeline.classList.toggle('agenda-view', agenda);
  timeline.scrollTop = 0;
  if (agenda) {
    renderAgenda(logs);
    markDesktopLog();
    return;
  }
  rail.hidden = true;
  if (!logs.length && !desktopMode()) timeline.textContent = 'No entries yet.';
  const days = new Map();
  for (const log of logs) {
    const date = new Date(log.created_at);
    const key = date.toLocaleDateString('en-GB');
    if (!days.has(key)) {
      const day = document.createElement('article');
      day.className = 'day';
      day.dataset.logDate = dateKey(date);
      day.append(dateHeading(date));
      timeline.append(day);
      days.set(key, day);
    }
    const entry = document.createElement('section');
    entry.className = 'entry';
    entry.dataset.logId = log.id;
    const header = document.createElement('header');
    const time = document.createElement('time');
    time.dateTime = log.created_at;
    time.textContent = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    header.append(time);
    const more = document.createElement('button');
    more.className = 'entry-more';
    more.setAttribute('aria-label', 'Open entry details');
    more.textContent = '•••';
    more.addEventListener('click', () => openLogDetail(log));
    header.append(more);
    const record = document.createElement('button');
    record.className = 'record';
    const body = document.createElement('span');
    body.textContent = desktopMode() && localStorage.getItem(entryFlag(log, 'hidden')) ? 'Hidden entry' : [log.emoji, log.body].filter(Boolean).join(' ');
    if (desktopMode() && localStorage.getItem(entryFlag(log, 'highlight'))) entry.classList.add('entry-highlight');
    record.append(body);
    record.addEventListener('click', () => { if (!desktopMode()) openLogDetail(log); });
    record.addEventListener('dblclick', () => { if (desktopMode()) openLogDetail(log); });
    entry.append(header, record);
    days.get(key).append(entry);
  }
  if (desktopMode() && !days.has(shiftDate(selectedDate, 0).toLocaleDateString('en-GB'))) {
    const day = document.createElement('article');
    day.className = 'day desk-empty-day';
    day.dataset.logDate = selectedDate;
    day.append(dateHeading(shiftDate(selectedDate, 0)));
    const following = [...timeline.children].find((page) => page.dataset.logDate < selectedDate);
    timeline.insertBefore(day, following ?? null);
    timeline.scrollTop = day.offsetTop;
  } else if (desktopMode()) {
    const day = days.get(shiftDate(selectedDate, 0).toLocaleDateString('en-GB'));
    if (day) timeline.scrollTop = day.offsetTop;
  }
  markDesktopLog();
}

async function showTimeline(session) {
  document.documentElement.classList.add('milog-signed-in');
  const version = ++accountVersion;
  const changedUser = activeSession?.user.id !== session.user.id;
  activeSession = session;
  if (changedUser) void window.refreshMilogShortcuts(session);
  populateProfile(session.user);
  gate.hidden = true;
  app.forEach((element) => { element.hidden = false; });
  timeline.textContent = 'Loading entries…';
  const logs = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.from('logs').select('id,body,created_at,emoji,image_path,audio_path')
      .eq('user_id', session.user.id).order('created_at', { ascending: false })
      .order('id').range(offset, offset + pageSize - 1);
    if (version !== accountVersion) return;
    if (error) {
      timeline.textContent = 'Could not load entries. Refresh to try again.';
      return;
    }
    logs.push(...data);
    if (data.length < pageSize) break;
  }
  accountLogs = logs;
  renderLogs(logs);
}

function switchView(showAgenda) {
  if (agenda !== showAgenda) selectedAgendaSlot = null;
  agenda = showAgenda;
  search.value = '';
  search.hidden = true;
  for (const [button, active] of [[agendaButton, agenda], [logButton, !agenda]]) {
    button.classList.toggle('current', active);
    button.setAttribute('aria-pressed', String(active));
  }
  if (accountLogs) renderLogs(accountLogs);
}

agendaButton.addEventListener('click', () => switchView(true));
logButton.addEventListener('click', () => switchView(false));
document.querySelector('#today').addEventListener('click', () => {
  desktopMarkedLog = null;
  desktopMonth = null;
  selectedAgendaSlot = null;
  selectedDate = dateKey(new Date());
  if (accountLogs) renderLogs(accountLogs);
});
function renderCalendar() {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  document.querySelector('#calendar-month').textContent = calendarMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  calendarGrid.replaceChildren();
  const counts = new Map();
  for (const log of accountLogs ?? []) {
    const key = dateKey(new Date(log.created_at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const today = dateKey(new Date());
  for (const label of ['M', 'T', 'W', 'T', 'F', 'S', 'S']) {
    const day = document.createElement('strong');
    day.textContent = label;
    calendarGrid.append(day);
  }
  const shift = (new Date(year, month, 1).getDay() + 6) % 7;
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(year, month, index + 1 - shift);
    const key = dateKey(date);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = date.getDate();
    button.setAttribute('aria-label', date.toLocaleDateString('en-GB', { dateStyle: 'full' }));
    button.setAttribute('aria-pressed', String(key === calendarDay));
    button.classList.toggle('other-month', date.getMonth() !== month);
    button.classList.toggle('calendar-today', key === today);
    button.classList.toggle('has-records', counts.has(key));
    button.addEventListener('click', () => {
      calendarDay = key;
      if (date.getMonth() !== month) renderCalendarAt(date);
      else {
        calendarGrid.querySelector('[aria-pressed=true]')?.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-pressed', 'true');
        renderCalendarRecords();
      }
    });
    calendarGrid.append(button);
  }
  renderCalendarRecords();
}

function renderCalendarAt(date) {
  calendarMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  renderCalendar();
}

function renderCalendarRecords() {
  const query = calendarSearch.value.trim().toLocaleLowerCase('en');
  const results = (accountLogs ?? []).filter((log) => query
    ? log.body.toLocaleLowerCase('en').includes(query)
    : dateKey(new Date(log.created_at)) === calendarDay);
  const count = document.createElement('h3');
  count.textContent = results.length + ' KAYIT';
  calendarRecords.replaceChildren(count);
  for (const log of results) {
    const button = document.createElement('button');
    button.type = 'button';
    const time = document.createElement('time');
    time.textContent = new Date(log.created_at).toLocaleString('en-GB', query
      ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
      : { hour: '2-digit', minute: '2-digit' });
    const body = document.createElement('span');
    body.textContent = log.body;
    button.append(time, body);
    button.addEventListener('click', () => {
      if (desktopMode()) {
        calendar.close();
        revealDesktopLog(log);
      } else openLogDetail(log);
    });
    calendarRecords.append(button);
  }
}

function openCalendar(focusSearch = false) {
  if (desktopMode()) {
    closeWorkPanels();
    if (focusSearch) document.querySelector('#desk-search').focus();
    return;
  }
  calendarDay = selectedDate;
  calendarSearch.value = '';
  renderCalendarAt(new Date(calendarDay + 'T12:00:00'));
  calendar.returnValue = '';
  openWorkPanel(calendar);
  if (focusSearch) calendarSearch.focus();
}
calendarSearch.addEventListener('input', renderCalendarRecords);
document.querySelector('#calendar-view').addEventListener('click', () => openCalendar());
calendarSearchToggle.removeAttribute('aria-expanded');
calendarSearchToggle.removeAttribute('aria-controls');
calendarSearchToggle.addEventListener('click', () => openCalendar(true));
document.querySelector('#month-back').addEventListener('click', () => renderCalendarAt(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)));
document.querySelector('#month-next').addEventListener('click', () => renderCalendarAt(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)));
calendar.addEventListener('close', () => {
  if (calendar.returnValue !== 'open') return;
  selectedAgendaSlot = null;
  selectedDate = calendarDay;
  switchView(true);
});
function openCompose(text) {
  editedLog = null;
  composeStatus.textContent = '';
  openComposeEditor(typeof text === 'string' ? text : '');
}
document.querySelector('#create-log').addEventListener('click', openCompose);
document.querySelector('#compose-cancel').addEventListener('click', () => compose.close());
document.querySelector('#compose-close').addEventListener('click', () => compose.close());
composeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const session = activeSession;
  const body = composeBody.value.trim();
  if (!session || (!body && !hasEntryAttachments(composeForm))) return;
  const timing = composeTiming();
  if (!timing) return;
  const save = composeForm.querySelector('[type=submit]');
  save.disabled = true;
  const editing = editedLog;
  const id = editing?.id ?? crypto.randomUUID();
  let error;
  try {
    const { payload, cleanup } = await entryPayload(composeForm, session.user.id, id, body);
    ({ error } = editing
      ? await client.from('logs').update({ ...payload, ...timing }).eq('id', id).eq('user_id', session.user.id)
      : await client.from('logs').insert({ id, user_id: session.user.id, ...payload, kind: 'text', visibility: 'private', ...timing }));
    if (error) await cleanup();
  } catch (failure) { error = failure; }
  save.disabled = false;
  if (activeSession?.user.id !== session.user.id) return;
  if (error) {
    composeStatus.textContent = error.code === 'PGRST204' && timing.end_at
      ? 'End times require the Supabase end_at migration.'
      : 'Could not save entry. Try again.';
    return;
  }
  composeForm.reset();
  clearEntryTools(composeForm);
  compose.close();
  await showTimeline(session);
  if (calendar.open) renderCalendar();
});

modeButton.addEventListener('click', () => {
  registering = !registering;
  nameField.hidden = !registering;
  form.elements.displayName.required = registering;
  form.elements.password.autocomplete = registering ? 'new-password' : 'current-password';
  form.elements.password.minLength = registering ? 6 : 0;
  document.querySelector('#auth-title').textContent = registering ? 'Create account' : 'Sign in';
  submit.textContent = registering ? 'Create account' : 'Sign in';
  modeButton.textContent = registering ? 'Already have an account? Sign in' : 'New to Milog? Create account';
  message.textContent = '';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const credentials = { email: form.elements.email.value.trim(), password: form.elements.password.value };
  submit.disabled = modeButton.disabled = true;
  message.textContent = '';
  try {
    const { data, error } = registering
      ? await client.auth.signUp({
        ...credentials,
        options: { data: { display_name: form.elements.displayName.value.trim() }, emailRedirectTo: new URL('./', location.href).href },
      })
      : await client.auth.signInWithPassword(credentials);
    if (error) {
      message.textContent = error.code === 'invalid_credentials'
        ? 'Email or password is incorrect.'
        : error.code === 'email_not_confirmed' ? 'Confirm your email first.' : 'Check your details and try again.';
    } else {
      form.elements.password.value = '';
      if (!data.session) message.textContent = 'Check your inbox to confirm your account.';
    }
  } catch {
    message.textContent = 'Could not connect. Try again.';
  } finally {
    submit.disabled = modeButton.disabled = false;
  }
});

signout.addEventListener('click', async () => {
  signout.disabled = true;
  const { error } = await client.auth.signOut({ scope: 'local' });
  signout.disabled = false;
  if (error) showPanel('Could not sign out', 'Try again.');
});

client.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) showAccount();
  if (session && (event === 'INITIAL_SESSION' || (event === 'SIGNED_IN' && !gate.hidden))) {
    setTimeout(() => showTimeline(session), 0);
  }
});

document.querySelector('#auth-fields').disabled = false;
modeButton.disabled = false;
message.textContent = '';



