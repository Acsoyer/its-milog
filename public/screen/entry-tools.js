const entryToolStates = new Map();

function growEntryField(textarea) {
  if (!textarea.hidden && desktopMode()) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
}

function anchorEntryPicker(dialog, button) {
  const anchor = button.getBoundingClientRect();
  const { width, height } = dialog.getBoundingClientRect();
  const below = innerHeight - anchor.bottom;
  const above = anchor.top;
  dialog.style.left = Math.max(8, Math.min(anchor.left, innerWidth - width - 8)) + 'px';
  dialog.style.top = Math.max(8, below >= height + 8 || below >= above ? anchor.bottom + 8 : anchor.top - height - 8) + 'px';
  dialog.style.maxHeight = Math.max(100, (below >= height + 8 || below >= above ? below : above) - 16) + 'px';
}

function setupEntryTools(form, textarea, onChange) {
  const toolbar = document.createElement('div');
  toolbar.className = 'entry-tools';
  const preview = document.createElement('div');
  preview.className = 'entry-tools-preview';
  const state = { files: {}, emoji: '', location: '' };
  entryToolStates.set(form, state);
  let writingField = textarea;
  form.addEventListener('focusin', (event) => {
    if (event.target === textarea || event.target.matches('#desk-list-items input:not([type=checkbox])')) writingField = event.target;
  });
  textarea.addEventListener('input', () => growEntryField(textarea));
  const icons = {
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
    audio: '<path d="M3 10v4m4-8v12m5-15v18m5-15v12m4-8v4"/>',
    emoji: '<circle cx="12" cy="12" r="9"/><path d="M8 14a4 4 0 0 0 8 0M9 9h.1m5.9 0h.1"/>',
    location: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  };
  function draw() {
    preview.replaceChildren();
    for (const [key, value] of Object.entries({ ...state.files, emoji: state.emoji, location: state.location })) {
      if (!value) continue;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = (value.name ?? value) + ' ×';
      chip.setAttribute('aria-label', 'Remove ' + key);
      chip.addEventListener('click', () => {
        if (key in state.files) delete state.files[key];
        else state[key] = '';
        draw();
        onChange();
      });
      preview.append(chip);
    }
  }
  state.clear = () => {
    state.files = {};
    state.emoji = state.location = '';
    draw();
  };
  for (const [key, label] of Object.entries({ image: 'Add photo', audio: 'Add audio', emoji: 'Add emoji', location: 'Add location' })) {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[key] + '</svg>';
    if (key === 'image' || key === 'audio') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = key + '/*';
      input.hidden = true;
      input.addEventListener('change', () => {
        if (input.files[0]) state.files[key] = input.files[0];
        input.value = '';
        draw();
        onChange();
      });
      toolbar.append(input);
      button.addEventListener('click', () => input.click());
    } else {
      button.addEventListener('click', () => {
        const dialog = document.createElement('dialog');
        dialog.className = 'entry-tool-picker';
        const pickerForm = document.createElement('form');
        pickerForm.method = 'dialog';
        const editor = textarea.hidden && writingField.isConnected ? writingField : textarea;
        const input = document.createElement('input');
        input.setAttribute('aria-label', label);
        input.placeholder = key === 'emoji' ? '🙂' : 'City or place';
        input.value = state[key];
        if (key === 'location') {
          locationOptions(pickerForm, input);
        } else {
          const segments = document.createElement('nav');
          const grid = document.createElement('div');
          segments.className = 'emoji-segments';
          grid.className = 'emoji-grid';
          const categories = Object.entries(window.MilogEmoji ?? {});
          const labels = { Tümü: 'All', Günlük: 'Daily', Aktivite: 'Activities', Duygu: 'Feelings', Yerler: 'Places' };
          const search = document.createElement('input');
          search.type = 'search';
          search.placeholder = milogLanguage === 'tr' ? 'Emoji ara' : 'Search emoji';
          search.setAttribute('aria-label', search.placeholder);
          search.autofocus = true;
          let category = 'Tümü';
          const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f\uFE0F]/g, '').toLowerCase().trim();
          const render = (items) => {
            grid.replaceChildren(...items.map((emoji) => {
              const choice = document.createElement('button');
              choice.type = 'button';
              choice.textContent = emoji;
              choice.addEventListener('click', () => {
                input.value = emoji;
                pickerForm.requestSubmit();
              });
              return choice;
            }));
            if (!items.length) grid.textContent = milogLanguage === 'tr' ? 'Emoji bulunamadı.' : 'No emoji found.';
          };
          const filter = () => {
            const query = normalize(search.value);
            const items = window.MilogEmoji?.[category] ?? [];
            render(query ? items.filter((emoji) => normalize(emoji + ' ' + (window.MilogEmojiKeywords?.[emoji] ?? '')).includes(query)) : items);
          };
          for (const [name] of [...categories].sort(([a], [b]) => Number(b === 'Tümü') - Number(a === 'Tümü'))) {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.textContent = milogLanguage === 'tr' ? name : labels[name] ?? name;
            tab.setAttribute('aria-pressed', String(name === 'Tümü'));
            tab.addEventListener('click', () => {
              segments.querySelector('[aria-pressed=true]')?.setAttribute('aria-pressed', 'false');
              tab.setAttribute('aria-pressed', 'true');
              category = name;
              filter();
            });
            segments.append(tab);
          }
          search.addEventListener('input', filter);
          search.addEventListener('keydown', (event) => { if (event.key === 'Enter') event.preventDefault(); });
          filter();
          pickerForm.append(search, segments, grid);
        }
        const heading = document.createElement('h2');
        heading.textContent = key === 'location' ? (milogLanguage === 'tr' ? 'Konum ekle' : 'Add location') : (milogLanguage === 'tr' ? 'Emoji ekle' : 'Add emoji');
        {
          const header = document.createElement('header');
          header.className = 'entry-picker-heading';
          const close = document.createElement('button');
          close.type = 'button';
          close.textContent = '×';
          close.setAttribute('aria-label', milogLanguage === 'tr' ? 'Kapat' : 'Close');
          close.addEventListener('click', () => dialog.close());
          header.append(heading, close);
          pickerForm.prepend(header);
        }
        if (key === 'emoji') {
          dialog.classList.add('entry-emoji-picker');
          input.type = 'hidden';
          pickerForm.append(input);
        }
        dialog.append(pickerForm);
        document.body.append(dialog);
        dialog.addEventListener('close', () => dialog.remove(), { once: true });
        dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
        pickerForm.addEventListener('submit', () => {
          if (key === 'emoji') {
            if (input.value) editor.setRangeText(input.value, editor.selectionStart, editor.selectionEnd, 'end');
            editor.dispatchEvent(new Event('input', { bubbles: true }));
            queueMicrotask(() => editor.focus());
          } else state[key] = input.value.trim();
          draw();
          onChange();
        });
        dialog.showModal();
        anchorEntryPicker(dialog, button);
      });
    }
    toolbar.append(button);
  }
  textarea.insertAdjacentElement('afterend', toolbar);
  toolbar.after(preview);
}

async function entryPayload(form, userId, id, body) {
  const state = entryToolStates.get(form);
  const payload = { body };
  const uploaded = [];
  const cleanup = () => Promise.allSettled(uploaded.map(([bucket, path]) => client.storage.from(bucket).remove([path])));
  if (state?.emoji) payload.emoji = state.emoji;
  if (state?.location) payload.body += (body ? '\n\n' : '') + '📍 ' + state.location;
  try {
    for (const [kind, file] of Object.entries(state?.files ?? {})) {
      const bucket = kind === 'image' ? 'log-images' : 'log-audio';
      const extension = /\.[a-z0-9]{1,8}$/i.exec(file.name)?.[0] ?? (kind === 'image' ? '.jpg' : '.m4a');
      const path = userId + '/' + id + '-' + crypto.randomUUID() + extension.toLowerCase();
      const { error } = await client.storage.from(bucket).upload(path, file);
      if (error) throw error;
      uploaded.push([bucket, path]);
      payload[kind + '_path'] = path;
    }
    return { payload, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

function hasEntryAttachments(form) {
  const state = entryToolStates.get(form);
  return Boolean(state && (state.emoji || state.location || Object.keys(state.files).length));
}

function clearEntryTools(form) {
  entryToolStates.get(form)?.clear();
}
function locationOptions(form, input) {
  const tr = milogLanguage === 'tr';
  const key = 'milog-saved-places:' + activeSession?.user.id;
  let local = [];
  try {
    const cached = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(cached)) local = cached;
  } catch {}
  let saved = [...new Set([...savedPlacesFromUser(activeSession?.user), ...local])];
  const list = document.createElement('div');
  list.className = 'saved-locations';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  const makeButton = (title, action) => {
    const control = document.createElement('button');
    control.type = 'button';
    control.textContent = title;
    control.addEventListener('click', action);
    return control;
  };
  const draw = () => list.replaceChildren(...saved.map((place) => makeButton(place, () => {
    input.value = place;
    form.requestSubmit();
  })));
  draw();
  void refreshPersonalListsWeb().then((user) => {
    if (!user || !form.isConnected) return;
    saved = [...new Set([...savedPlacesFromUser(user), ...local])];
    draw();
  });
  const actions = document.createElement('div');
  actions.className = 'location-actions';
  const current = makeButton(tr ? 'Anlık' : 'Current', async () => {
    current.disabled = true;
    status.textContent = tr ? 'Konum belirleniyor…' : 'Finding location…';
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
      if (!form.isConnected) return;
      const params = new URLSearchParams({ latitude: position.coords.latitude, longitude: position.coords.longitude, localityLanguage: milogLanguage });
      const response = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?' + params, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Geocoding failed');
      const place = await response.json();
      input.value = [...new Set([place.city, place.locality].filter(Boolean))].join(', ');
      if (!input.value) throw new Error('No locality');
      status.textContent = '';
      form.requestSubmit();
    } catch {
      status.textContent = tr ? 'Konum belirlenemedi. Konumu elle ekleyin.' : 'Could not determine your location. Enter it manually.';
    } finally { current.disabled = false; }
  });
  current.title = tr ? 'Koordinatlar yer adı için BigDataCloud’a gönderilir.' : 'Coordinates are sent to BigDataCloud to find a place name.';
  const add = makeButton(tr ? 'Ekle' : 'Add', async () => {
    const place = input.value.trim();
    if (!place) return input.focus();
    add.disabled = true;
    try {
      const user = await refreshPersonalListsWeb();
      if (!user || !form.isConnected) throw new Error('Account unavailable');
      const updated = [...new Set([...savedPlacesFromUser(user), ...local, place])];
      const { data, error } = await client.auth.updateUser({ data: { milog_saved_places: updated } });
      if (error || activeSession?.user.id !== user.id) throw error ?? new Error('Account changed');
      activeSession.user = data.user;
      localStorage.removeItem(key);
      if (form.isConnected) form.requestSubmit();
    } catch {
      status.textContent = tr ? 'Konum kaydedilemedi. Tekrar deneyin.' : 'Could not save the location. Try again.';
    } finally {
      add.disabled = false;
    }
  });
  actions.append(current, add);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); add.click(); }
  });
  form.append(list, input, status, actions);
}

