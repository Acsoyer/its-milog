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

function renderChecklist(record, log) {
  if (!activeSession || localStorage.getItem(entryFlag(log, 'hidden'))) return;
  const lines = log.body.split('\n');
  const item = /^- \[([ x])\] (.+)$/i;
  if (!lines.length || !lines.every((line) => item.test(line))) return;
  const list = document.createElement('ul');
  list.className = 'entry-checklist';
  for (const [index, line] of lines.entries()) {
    const match = item.exec(line);
    const row = document.createElement('li');
    const control = document.createElement('button');
    control.type = 'button';
    control.setAttribute('aria-pressed', String(match[1].toLowerCase() === 'x'));
    control.textContent = match[2];
    control.addEventListener('click', async (event) => {
      event.stopPropagation();
      const owner = activeSession?.user.id;
      if (!owner) return;
      const done = control.getAttribute('aria-pressed') !== 'true';
      const body = log.body.split('\n');
      body[index] = '- [' + (done ? 'x' : ' ') + '] ' + match[2];
      const next = body.join('\n');
      const { data, error } = await client.from('logs').update({ body: next }).eq('user_id', owner).eq('id', log.id).eq('body', log.body).select('id').maybeSingle();
      if (error || !data || activeSession?.user.id !== owner) return;
      log.body = next;
      control.setAttribute('aria-pressed', String(done));
    });
    control.addEventListener('dblclick', (event) => event.stopPropagation());
    row.append(control);
    list.append(row);
  }
  record.querySelector('span')?.setAttribute('hidden', '');
  record.after(list);
}

let reminderTimer;
function scheduleEntryReminders(logs) {
  clearTimeout(reminderTimer);
  const userId = activeSession?.user.id;
  if (!userId || !window.Notification) return;
  const now = Date.now();
  let next = Infinity;
  for (const log of logs) {
    const match = /\n\n⏰ (\d{4}-\d\d-\d\dT[^\s]+)$/.exec(log.body);
    if (!match) continue;
    const due = Date.parse(match[1]);
    const key = 'milog-reminder:' + userId + ':' + log.id + ':' + due;
    if (!Number.isFinite(due) || localStorage.getItem(key)) continue;
    if (due > now) next = Math.min(next, due);
    else if (Notification.permission === 'granted' && now - due < 86400000) {
      try {
        new Notification('Milog', { body: log.body.slice(0, match.index), tag: key });
        localStorage.setItem(key, '1');
      } catch { /* Notification delivery can be unavailable on some browsers. */ }
    }
  }
  if (Number.isFinite(next)) reminderTimer = setTimeout(() => {
    if (activeSession?.user.id === userId) scheduleEntryReminders(logs);
  }, Math.min(2147483647, next - now));
}
