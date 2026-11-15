function openSpecialDays() {
  const dialog = document.querySelector('#special-days');
  renderSpecialDays();
  openWorkPanel(dialog);
  void refreshPersonalListsWeb();
}

function specialDays() {
  const days = activeSession?.user.user_metadata?.milog_special_days;
  return Array.isArray(days) ? days : [];
}

function savedPlacesFromUser(user) {
  const places = user?.user_metadata?.milog_saved_places;
  return Array.isArray(places) ? places.filter((place) => typeof place === 'string') : [];
}

async function refreshPersonalListsWeb() {
  const userId = activeSession?.user.id;
  if (!userId) return null;
  try {
    const { data, error } = await client.auth.getUser();
    if (error || data.user.id !== userId || activeSession?.user.id !== userId) return null;
    const changed = JSON.stringify(specialDays()) !== JSON.stringify(data.user.user_metadata?.milog_special_days ?? []);
    activeSession.user = data.user;
    if (changed) {
      renderSpecialDays();
      if (accountLogs) renderLogs(accountLogs);
    }
    return data.user;
  } catch { return null; }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void refreshPersonalListsWeb();
});

function specialDayTitle(day, year) {
  const label = day.type === 'anniversary' ? (milogLanguage === 'tr' ? 'Yıl dönümü' : 'Anniversary') : (milogLanguage === 'tr' ? 'Doğum günü' : 'Birthday');
  const age = day.year && year >= day.year ? ' · ' + (year - day.year) : '';
  return day.name + ' · ' + label + age;
}

function appendCelebrations(page, date) {
  for (const day of specialDays()) {
    if (day.month !== date.getMonth() || day.day !== date.getDate() || (day.year && day.year > date.getFullYear())) continue;
    const banner = document.createElement('div');
    banner.className = 'celebration';
    banner.textContent = (day.type === 'anniversary' ? '♥ ' : '🎂 ') + specialDayTitle(day, date.getFullYear());
    page.append(banner);
  }
}

async function saveSpecialDaysWeb(change) {
  if (!await refreshPersonalListsWeb()) {
    document.querySelector('#special-days-status').textContent = 'Could not connect. Try again.';
    return false;
  }
  const session = activeSession;
  if (!session) return false;
  const { data, error } = await client.auth.updateUser({ data: { milog_special_days: change(specialDays()) } });
  if (activeSession?.user.id !== session.user.id) return false;
  document.querySelector('#special-days-status').textContent = error ? 'Could not save special days.' : '';
  if (error) return false;
  activeSession.user = data.user;
  renderSpecialDays();
  if (accountLogs) renderLogs(accountLogs);
  return true;
}

function renderSpecialDays() {
  const list = document.querySelector('#special-days-list');
  list.replaceChildren();
  for (const day of specialDays()) {
    const row = document.createElement('li');
    const date = new Date(2000, day.month, day.day);
    row.textContent = specialDayTitle(day, new Date().getFullYear()) + ' · ' + date.toLocaleDateString(milogLocale, { day: 'numeric', month: 'long' });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', async () => {
      if (!confirm('Remove this special day?')) return;
      remove.disabled = true;
      try { await saveSpecialDaysWeb((days) => days.filter((entry) => entry.id !== day.id)); }
      finally { remove.disabled = false; }
    });
    row.append(remove);
    list.append(row);
  }
}

document.querySelectorAll('[data-special-days]').forEach((button) => button.addEventListener('click', openSpecialDays));
document.querySelector('#special-days-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.elements.person.value.trim();
  const month = Number(form.elements.month.value) - 1;
  const day = Number(form.elements.day.value);
  if (!name || new Date(2000, month, day).getMonth() !== month) {
    document.querySelector('#special-days-status').textContent = 'Enter a name and a valid date.';
    return;
  }
  const save = form.querySelector('[type=submit]');
  save.disabled = true;
  try {
    if (await saveSpecialDaysWeb((days) => [...days, { id: crypto.randomUUID(), name, type: form.elements.occasion.value, month, day, year: Number(form.elements.year.value) || undefined }])) form.reset();
  } finally { save.disabled = false; }
});

const photoUrls = new Map();
function appendPolaroid(parent, log) {
  if (!log.image_path) return;
  const photo = document.createElement('img');
  photo.className = 'entry-polaroid';
  photo.alt = 'Entry photo';
  photo.classList.add('photo-loading');
  photo.loading = 'lazy';
  const key = log.image_path;
  if (!photoUrls.has(key)) {
    const request = Promise.resolve(client.storage.from('log-images').createSignedUrl(key, 3600));
    photoUrls.set(key, { request, expires: Date.now() + 3300000 });
  }
  const cached = photoUrls.get(key);
  if (cached.expires < Date.now()) {
    photoUrls.delete(key);
    return appendPolaroid(parent, log);
  }
  parent.append(photo);
  cached.request.then(({ data, error }) => {
    if (error) photoUrls.delete(key);
    if (!parent.isConnected || !data?.signedUrl) return;
    photo.addEventListener('load', () => photo.classList.remove('photo-loading'), { once: true });
    photo.addEventListener('error', () => photo.remove(), { once: true });
    photo.src = data.signedUrl;
  }).catch(() => photoUrls.delete(key));
}

function entryPresentation(log) {
  const location = /(?:^|\n\n)📍 ([^\n]+)$/.exec(log.body);
  const withoutPlace = location ? log.body.slice(0, location.index) : log.body;
  const reminder = /\n\n⏰ (\d{4}-\d\d-\d\dT[^\s]+)$/.exec(withoutPlace);
  const due = reminder ? Date.parse(reminder[1]) : NaN;
  return {
    text: Number.isFinite(due) ? withoutPlace.slice(0, reminder.index) : withoutPlace,
    place: location?.[1],
    due: Number.isFinite(due) ? due : null,
  };
}

function shortEntryDate(date) {
  return new Intl.DateTimeFormat(milogLocale, { day: 'numeric', month: 'short' }).format(date);
}

function appendReminderDetails(parent, log, due) {
  if (due === null) return;
  const meta = document.createElement('span');
  meta.className = 'entry-reminder-meta';
  const created = new Date(log.created_at);
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - created.getTime()) / 60000));
  const [unit, divisor] = elapsedMinutes >= 1440 ? ['day', 1440] : elapsedMinutes >= 60 ? ['hour', 60] : ['minute', 1];
  const ago = new Intl.RelativeTimeFormat(milogLocale, { numeric: 'always' }).format(-Math.floor(elapsedMinutes / divisor), unit);
  const label = document.createElement('span');
  label.textContent = milogLanguage === 'tr' ? ago + ' oluşturuldu' : 'Created ' + ago;
  label.title = created.toLocaleString(milogLocale);
  const pill = document.createElement('time');
  pill.className = 'reminder-due';
  const date = new Date(due);
  pill.dateTime = date.toISOString();
  pill.textContent = shortEntryDate(date) + ' - ' + timeFormat.format(date);
  meta.append(label, pill);
  parent.append(meta);
}

function createEntryChecklist(log, text) {
  if (!activeSession) return null;
  const itemPattern = /^- \[([ x])\] (.+)$/i;
  const headingPattern = /^## (.+)$/;
  const lines = text.split('\n');
  if (!lines.every((line) => itemPattern.test(line) || headingPattern.test(line))) return null;
  const list = document.createElement('ul');
  list.className = 'entry-checklist';
  list.dataset.checklistLog = log.id;
  if (!headingPattern.test(lines[0])) {
    const title = document.createElement('li');
    title.className = 'entry-checklist-heading';
    title.textContent = shortEntryDate(new Date(log.created_at)) + (milogLanguage === 'tr' ? ' - Yapılacaklar listesi' : ' - To do List');
    list.append(title);
  }
  for (const [index, line] of lines.entries()) {
    const match = itemPattern.exec(line);
    const row = document.createElement('li');
    if (!match) {
      row.className = 'entry-checklist-heading';
      row.textContent = headingPattern.exec(line)[1];
      list.append(row);
      continue;
    }
    const control = document.createElement('button');
    control.type = 'button';
    control.dataset.checklistIndex = index;
    control.setAttribute('aria-pressed', String(match[1].toLowerCase() === 'x'));
    control.textContent = match[2];
    control.addEventListener('click', async (event) => {
      event.stopPropagation();
      const owner = activeSession?.user.id;
      if (!owner) return;
      const done = control.getAttribute('aria-pressed') !== 'true';
      const previous = log.body;
      const body = previous.split('\n');
      body[index] = '- [' + (done ? 'x' : ' ') + '] ' + match[2];
      const next = body.join('\n');
      control.disabled = true;
      try {
        const { data, error } = await client.from('logs').update({ body: next }).eq('user_id', owner).eq('id', log.id).eq('body', previous).select('id').maybeSingle();
        if (error || !data || activeSession?.user.id !== owner) return;
        log.body = next;
        for (const other of document.querySelectorAll('[data-checklist-log]')) {
          if (other.dataset.checklistLog !== log.id) continue;
          other.querySelector('[data-checklist-index="' + index + '"]')?.setAttribute('aria-pressed', String(done));
        }
      } finally { control.disabled = false; }
    });
    control.addEventListener('dblclick', (event) => event.stopPropagation());
    row.append(control);
    list.append(row);
  }
  return list;
}

let reminderTimer;
function scheduleEntryReminders(logs) {
  clearTimeout(reminderTimer);
  const userId = activeSession?.user.id;
  if (!userId || !window.Notification) return;
  const now = Date.now();
  let next = Infinity;
  for (const log of logs) {
    const { due, text } = entryPresentation(log);
    if (due === null) continue;
    const key = 'milog-reminder:' + userId + ':' + log.id + ':' + due;
    if (!Number.isFinite(due) || localStorage.getItem(key)) continue;
    if (due > now) next = Math.min(next, due);
    else if (Notification.permission === 'granted' && now - due < 86400000) {
      try {
        new Notification('Milog', { body: text, tag: key });
        localStorage.setItem(key, '1');
      } catch { /* Notification delivery can be unavailable on some browsers. */ }
    }
  }
  if (Number.isFinite(next)) reminderTimer = setTimeout(() => {
    if (activeSession?.user.id === userId) scheduleEntryReminders(logs);
  }, Math.min(2147483647, next - now));
}
