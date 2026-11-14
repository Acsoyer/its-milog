function openSpecialDays() {
  const dialog = document.querySelector('#special-days');
  renderSpecialDays();
  openWorkPanel(dialog);
}

function specialDays() {
  const days = activeSession?.user.user_metadata?.milog_special_days;
  return Array.isArray(days) ? days : [];
}

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

async function saveSpecialDaysWeb(days) {
  const session = activeSession;
  if (!session) return false;
  const { data, error } = await client.auth.updateUser({ data: { milog_special_days: days } });
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
      try { await saveSpecialDaysWeb(specialDays().filter((entry) => entry.id !== day.id)); }
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
    if (await saveSpecialDaysWeb([...specialDays(), { id: crypto.randomUUID(), name, type: form.elements.occasion.value, month, day, year: Number(form.elements.year.value) || undefined }])) form.reset();
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
