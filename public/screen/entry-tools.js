const entryToolStates = new Map();

function setupEntryTools(form, textarea, onChange) {
  const toolbar = document.createElement('div');
  toolbar.className = 'entry-tools';
  const preview = document.createElement('div');
  preview.className = 'entry-tools-preview';
  const state = { files: {}, emoji: '', location: '' };
  entryToolStates.set(form, state);
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
        const input = document.createElement('input');
        input.setAttribute('aria-label', label);
        input.placeholder = key === 'emoji' ? '🙂' : 'City or place';
        input.value = state[key];
        const done = document.createElement('button');
        done.textContent = 'Done';
        if (key === 'location') {
          locationOptions(pickerForm, input);
        } else {
          const segments = document.createElement('nav');
          const grid = document.createElement('div');
          segments.className = 'emoji-segments';
          grid.className = 'emoji-grid';
          const categories = Object.entries(window.MilogEmoji ?? {});
          const labels = { Tümü: 'All', Günlük: 'Daily', Aktivite: 'Activities', Duygu: 'Feelings', Yerler: 'Places' };
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
          };
          for (const [category, items] of [...categories].sort(([a], [b]) => Number(b === 'Tümü') - Number(a === 'Tümü'))) {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.textContent = milogLanguage === 'tr' ? category : labels[category] ?? category;
            tab.setAttribute('aria-pressed', String(category === 'Tümü'));
            tab.addEventListener('click', () => {
              segments.querySelector('[aria-pressed=true]')?.setAttribute('aria-pressed', 'false');
              tab.setAttribute('aria-pressed', 'true');
              render(items);
            });
            segments.append(tab);
          }
          render(window.MilogEmoji?.Tümü ?? []);
          pickerForm.append(segments, grid);
        }
        const heading = document.createElement('h2');
        heading.textContent = key === 'location' ? (milogLanguage === 'tr' ? 'Konum ekle' : 'Add location') : (milogLanguage === 'tr' ? 'Emoji ekle' : 'Add emoji');
        pickerForm.prepend(heading);
        if (key === 'emoji') {
          dialog.classList.add('entry-emoji-picker');
          input.type = 'hidden';
          done.type = 'button';
          done.addEventListener('click', () => dialog.close());
          pickerForm.append(input);
        }
        pickerForm.append(done);
        dialog.append(pickerForm);
        document.body.append(dialog);
        dialog.addEventListener('close', () => dialog.remove(), { once: true });
        pickerForm.addEventListener('submit', () => {
          if (key === 'emoji') {
            const start = textarea.selectionStart;
            const finish = textarea.selectionEnd;
            if (input.value) textarea.setRangeText(input.value, start, finish, 'end');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            queueMicrotask(() => textarea.focus());
          } else state[key] = input.value.trim();
          draw();
          onChange();
        });
        dialog.showModal();
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
  let saved;
  try { saved = JSON.parse(localStorage.getItem(key) || '[]'); } catch { saved = []; }
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
  const actions = document.createElement('div');
  actions.className = 'location-actions';
  const current = makeButton(tr ? 'Anlık konum ekle' : 'Use current location', async () => {
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
      input.focus();
    } catch {
      status.textContent = tr ? 'Konum belirlenemedi. Konumu elle ekleyin.' : 'Could not determine your location. Enter it manually.';
    } finally { current.disabled = false; }
  });
  current.title = tr ? 'Koordinatlar yer adı için BigDataCloud’a gönderilir.' : 'Coordinates are sent to BigDataCloud to find a place name.';
  actions.append(current, makeButton(tr ? 'Konum listesine ekle' : 'Add to saved locations', () => {
    const place = input.value.trim();
    if (!place) return input.focus();
    if (!saved.includes(place)) {
      saved = [...saved, place];
      localStorage.setItem(key, JSON.stringify(saved));
      draw();
    }
  }));
  form.append(list, input, status, actions);
}

