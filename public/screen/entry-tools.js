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
          const cities = document.querySelector('#sky-city').cloneNode(true);
          cities.removeAttribute('id');
          cities.prepend(new Option(milogLanguage === 'tr' ? 'Şehir seç' : 'Choose a city', '', true, true));
          cities.addEventListener('change', () => {
            if (cities.value) input.value = cities.selectedOptions[0].textContent;
          });
          pickerForm.append(cities);
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
        pickerForm.append(input, done);
        dialog.append(pickerForm);
        document.body.append(dialog);
        dialog.addEventListener('close', () => dialog.remove(), { once: true });
        pickerForm.addEventListener('submit', () => {
          state[key] = input.value.trim();
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
