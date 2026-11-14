(() => {
  const get = (id) => document.getElementById(id);
  const sheet = get('quick-sheet');
  const manager = get('quick-manager');
  const editor = get('quick-editor');
  const grid = get('quick-grid');
  const list = get('quick-list');
  const searchBox = get('quick-search');
  const editButton = get('quick-manage-edit');
  const expanded = new Set();
  let data;
  let owner;
  let folder;
  let editing = false;
  let original;
  let actionId;
  let order;
  let busy = false;
  let drag;
  let suppressClick = false;

  function icon(value) {
    const node = document.createElement('span');
    node.className = 'quick-icon';
    node.setAttribute('aria-hidden', 'true');
    const mdi = /^mdi:([a-z0-9-]+)$/.exec(value || '');
    const emoji = typeof value === 'string' && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(value);
    if (!mdi && !emoji) return node;
    const image = document.createElement('img');
    image.alt = '';
    image.draggable = false;
    image.referrerPolicy = 'no-referrer';
    if (mdi) {
      image.src = 'https://api.iconify.design/mdi/' + mdi[1] + '.svg';
      image.addEventListener('error', () => { node.textContent = '◇'; });
    } else {
      const code = [...value.replace(/\uFE0F/g, '')].map((char) => char.codePointAt(0).toString(16)).join('-');
      image.src = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@16.0.1/assets/svg/' + code + '.svg';
      image.addEventListener('error', () => { node.textContent = value; });
    }
    node.append(image);
    return node;
  }

  function button(label, handler) {
    const node = document.createElement('button');
    node.type = 'button';
    node.textContent = label;
    node.addEventListener('click', handler);
    return node;
  }

  function items() {
    const organization = data.organization;
    const actions = [...data.actions].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const all = new Map([
      ...actions.map((action) => ['action:' + action.id, { ...action, category: false }]),
      ...(organization.categories ?? []).map((category) => ['category:' + category.id, { ...category, category: true }]),
    ]);
    const tokens = [...new Set([...(order ?? organization.quickOrder ?? []), ...all.keys()])];
    return tokens.filter((token) => all.has(token)).map((token) => ({ ...all.get(token), token }));
  }

  function children(category) {
    const ids = data.organization.categoryOrders?.[category] ?? [];
    const rank = (item) => ids.includes(item.id) ? ids.indexOf(item.id) : Infinity;
    return items().filter((item) => !item.category && data.organization.assignments?.[item.id]?.includes(category))
      .sort((a, b) => rank(a) - rank(b));
  }

  function topItems() {
    return items().filter((item) => item.category || !data.organization.assignments?.[item.id]?.length);
  }

  function renderGrid() {
    grid.replaceChildren();
    const current = folder ? children(folder) : topItems();
    const category = folder && items().find((item) => item.category && item.id === folder);
    get('quick-title').textContent = category?.label ?? 'quick log';
    for (const item of current.slice(0, 7)) {
      const tile = button('', () => {
        if (item.category) {
          folder = item.id;
          renderGrid();
        } else choose(item);
      });
      tile.className = item.category ? 'quick-category' : '';
      const label = document.createElement('strong');
      label.textContent = item.label;
      tile.append(icon(item.category ? item.icon || 'mdi:folder-open-outline' : item.emoji), label);
      grid.append(tile);
    }
    while (grid.childElementCount < 7) {
      const empty = document.createElement('span');
      empty.className = 'quick-empty';
      grid.append(empty);
    }
    const more = button('•••', () => openManager(false));
    more.className = 'quick-more';
    more.setAttribute('aria-label', 'Manage quick logs');
    grid.append(more);
  }

  async function choose(action) {
    const values = action.measurementOptions?.length ? action.measurementOptions : action.durationOptions;
    const unit = { duration: 'dk', volume: 'ml', count: 'adet' }[action.measurementUnit];
    if (!values?.length || !unit) return addLog(action);
    showPanel(action.label, '');
    const options = document.createElement('div');
    options.className = 'quick-measures';
    for (const value of values) options.append(button(value + ' ' + unit, () => addLog(action, value + ' ' + unit)));
    options.append(button('Add without measurement', () => addLog(action)));
    copy.after(options);
    panel.addEventListener('close', () => options.remove(), { once: true });
  }

  async function addLog(action, measure) {
    const session = activeSession;
    if (busy || session?.user.id !== owner) return;
    busy = true;
    const body = (action.entryText || action.label) + (measure ? ' · ' + measure : '');
    const slot = agenda && selectedAgendaSlot?.startsWith(selectedDate + 'T') ? selectedAgendaSlot : null;
    const { error } = await client.from('logs').insert({
      id: crypto.randomUUID(), user_id: owner, body, emoji: action.emoji || null, kind: 'quick',
      visibility: 'private', created_at: (slot ? new Date(slot) : new Date()).toISOString(),
    });
    busy = false;
    if (activeSession !== session) return;
    panel.close();
    if (error) return showPanel('Could not add entry', 'Try again.');
    sheet.close();
    manager.close();
    await showTimeline(session);
  }

  function renderManager() {
    const query = searchBox.value.trim().toLocaleLowerCase('en');
    list.replaceChildren();
    for (const item of topItems()) {
      const nested = item.category ? children(item.id) : [];
      const matches = (value) => [value.label, value.entryText].some((text) => text?.toLocaleLowerCase('en').includes(query));
      if (query && !matches(item) && !nested.some(matches)) continue;
      list.append(makeRow(item, false));
      if (item.category && (expanded.has(item.id) || query)) {
        for (const child of nested.filter((value) => !query || matches(item) || matches(value))) list.append(makeRow(child, item.id));
      }
    }
    editButton.textContent = editing ? 'Save' : 'Edit';
    manager.classList.toggle('editing', editing);
    get('quick-footer-add').hidden = !editing;
    get('quick-folder-add').hidden = !editing;
    get('quick-manager-add').hidden = editing;
    get('quick-manage-close').textContent = editing ? 'Cancel' : 'Close';
    get('quick-help').textContent = editing ? 'Drag the handle to reorder.' : 'Select a quick log to add an entry. Drag its handle to reorder.';
  }

  function makeRow(item, folderId) {
    const row = document.createElement('div');
    row.className = 'quick-row' + (item.category ? ' quick-category' : '') + (folderId ? ' quick-nested' : '');
    row.dataset.token = item.token;
    row.dataset.folder = folderId || '';
    const control = button('', () => {
      if (suppressClick) return;
      if (item.category) {
        if (!expanded.delete(item.id)) expanded.add(item.id);
        renderManager();
      } else if (editing) openEditor(item);
      else choose(item);
    });
    const label = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = item.label;
    if (editing) {
      name.className = 'quick-edit-name';
      control.setAttribute('aria-label', 'Edit ' + item.label);
    }
    label.append(name);
    if (!item.category) {
      const description = document.createElement('small');
      description.textContent = item.entryText;
      label.append(description);
    }
    control.append(icon(item.category ? item.icon || 'mdi:folder-open-outline' : item.emoji), label);
    const unit = { duration: 'TIME', volume: 'ML', count: 'COUNT' }[item.measurementUnit];
    if (unit) {
      const badge = document.createElement('b');
      badge.textContent = unit;
      control.append(badge);
    }
    row.append(control);
    if (editing) {
      for (const [label, symbol, handler] of [
        ['Duplicate', 'mdi:content-copy', () => duplicate(item)],
        ['Delete', 'mdi:trash-can-outline', () => remove(item)],
      ]) {
        const action = button('', handler);
        action.className = 'quick-row-action ' + (label === 'Delete' ? 'quick-delete' : 'quick-copy');
        action.setAttribute('aria-label', item.label + ' · ' + label);
        action.title = label;
        action.append(icon(symbol));
        row.append(action);
      }
    }
    {
      const handle = button('', () => {
        if (item.category && !editing && !suppressClick) control.click();
      });
      handle.className = 'quick-grip';
      handle.addEventListener('dragstart', (event) => event.preventDefault());
      handle.setAttribute('aria-label', item.label + ' reorder handle');
      handle.append(icon(item.category && !editing ? 'mdi:chevron-down' : 'mdi:dots-grid'));
      handle.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || busy || searchBox.value.trim()) return;
        drag = { item, y: event.clientY, target: item.token };
        handle.setPointerCapture(event.pointerId);
      });
      handle.addEventListener('pointermove', (event) => {
        if (!drag || (!drag.ghost && Math.abs(event.clientY - drag.y) < 5)) return;
        suppressClick = true;
        if (!drag.ghost) {
          drag.ghost = row.cloneNode(true);
          drag.ghost.classList.add('quick-drag-ghost');
          drag.ghost.setAttribute('aria-hidden', 'true');
          drag.ghost.style.width = row.getBoundingClientRect().width + 'px';
          drag.ghost.style.height = row.getBoundingClientRect().height + 'px';
          drag.ghost.inert = true;
          row.classList.add('quick-drag-source');
          manager.append(drag.ghost);
        }
        drag.ghost.style.left = row.getBoundingClientRect().left + 'px';
        drag.ghost.style.top = event.clientY - row.offsetHeight / 2 + 'px';
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-token]');
        if (!target || target.dataset.folder !== row.dataset.folder) return;
        list.querySelector('.drop-target')?.classList.remove('drop-target');
        const bounds = target.getBoundingClientRect();
        drag.after = event.clientY > bounds.top + bounds.height / 2;
        target.classList.toggle('drop-after', drag.after);
        target.classList.add('drop-target');
        drag.target = target.dataset.token;
      });
      handle.addEventListener('pointerup', () => {
        const pending = drag;
        pending?.ghost?.remove();
        row.classList.remove('quick-drag-source');
        drag = null;
        list.querySelector('.drop-target')?.classList.remove('drop-target');
        if (pending && suppressClick) void move(item.token, pending.target, folderId, pending.after);
        setTimeout(() => { suppressClick = false; }, 0);
      });
      handle.addEventListener('pointercancel', () => {
        drag?.ghost?.remove();
        row.classList.remove('quick-drag-source');
        drag = null;
        suppressClick = false;
        list.querySelector('.drop-target')?.classList.remove('drop-target');
      });
      handle.addEventListener('keydown', (event) => {
        if (!['ArrowUp', 'ArrowDown'].includes(event.key) || busy || searchBox.value.trim()) return;
        event.preventDefault();
        const visible = folderId ? children(folderId) : topItems();
        const index = visible.findIndex((value) => value.token === item.token);
        const target = visible[index + (event.key === 'ArrowUp' ? -1 : 1)];
        if (target) void move(item.token, target.token, folderId);
      });
      row.append(handle);
    }
    return row;
  }

  async function move(from, to, folderId, after) {
    if (from === to) return;
    if (folderId) {
      const ids = children(folderId).map((item) => item.id);
      const source = from.slice('action:'.length);
      const targetId = to.slice('action:'.length);
      const target = ids.indexOf(targetId);
      ids.splice(ids.indexOf(source), 1);
      ids.splice(after === undefined ? target : ids.indexOf(targetId) + Number(after), 0, source);
      const organization = { ...data.organization, categoryOrders: { ...data.organization.categoryOrders, [folderId]: ids } };
      if (editing) {
        data.organization = organization;
        renderManager();
      } else await persist(data.actions, organization);
      return;
    }
    const tokens = items().map((item) => item.token);
    const target = tokens.indexOf(to);
    tokens.splice(tokens.indexOf(from), 1);
    tokens.splice(after === undefined ? target : tokens.indexOf(to) + Number(after), 0, from);
    order = tokens;
    renderManager();
    if (!editing) {
      if (!await persist(data.actions, { ...data.organization, quickOrder: order })) {
        order = null;
        renderManager();
      }
    }
    [...list.querySelectorAll('[data-token]')].find((row) => row.dataset.token === from)?.querySelector('.quick-grip')?.focus({ preventScroll: true });
  }

  function startEditing() {
    original = data;
    data = structuredClone(data);
    editing = true;
  }

  function cancelEditing() {
    if (!editing) return;
    data = original;
    original = null;
    order = null;
    editing = false;
  }

  function duplicate(item) {
    const id = crypto.randomUUID();
    const { token, category, ...fields } = item;
    const nextToken = (category ? 'category:' : 'action:') + id;
    const tokens = items().map((entry) => entry.token);
    tokens.splice(tokens.indexOf(token) + 1, 0, nextToken);
    order = tokens;
    const organization = data.organization;
    const copy = { ...fields, id, label: fields.label + ' (kopya)' };
    organization.assignments ??= {};
    organization.categories ??= [];
    organization.categoryOrders ??= {};
    if (category) {
      const members = children(item.id);
      organization.categories.push(copy);
      organization.categoryOrders[id] = members.map((entry) => entry.id);
      for (const member of members) organization.assignments[member.id].push(id);
    } else {
      data.actions.push(copy);
      organization.assignments[id] = [...(organization.assignments[item.id] ?? [])];
      for (const folderId of organization.assignments[id]) {
        const ids = organization.categoryOrders[folderId] ?? [];
        const index = ids.indexOf(item.id);
        if (index !== -1) ids.splice(index + 1, 0, id);
      }
    }
    renderManager();
  }

  function remove(item) {
    const organization = data.organization;
    order = items().map((entry) => entry.token).filter((token) => token !== item.token);
    if (item.category) {
      organization.categories = organization.categories.filter((entry) => entry.id !== item.id);
      for (const [action, folders] of Object.entries(organization.assignments ?? {})) {
        organization.assignments[action] = folders.filter((id) => id !== item.id);
      }
      if (organization.categoryOrders) delete organization.categoryOrders[item.id];
      if (organization.pinnedCategoryId === item.id) delete organization.pinnedCategoryId;
    } else {
      data.actions = data.actions.filter((entry) => entry.id !== item.id);
      if (organization.assignments) delete organization.assignments[item.id];
      for (const [folderId, ids] of Object.entries(organization.categoryOrders ?? {})) {
        organization.categoryOrders[folderId] = ids.filter((id) => id !== item.id);
      }
    }
    renderManager();
  }

  async function persist(actions, organization) {
    if (busy || owner !== activeSession?.user.id) return false;
    const userId = owner;
    busy = true;
    const update = { actions, organization, updated_at: new Date().toISOString() };
    const result = data.updated_at
      ? await client.from('quick_log_settings').update(update).eq('user_id', userId).eq('updated_at', data.updated_at).select().maybeSingle()
      : await client.from('quick_log_settings').insert({ user_id: userId, ...update }).select().single();
    busy = false;
    if (owner !== userId || activeSession?.user.id !== userId) return false;
    if (result.error || !result.data) {
      get('quick-manager-status').textContent = 'Could not save changes. Reopen the list and try again.';
      return false;
    }
    get('quick-manager-status').textContent = '';
    data = result.data;
    order = null;
    renderManager();
    renderGrid();
    return true;
  }

  function openManager(edit) {
    if (!data) return;
    sheet.close();
    editing = false;
    if (edit) startEditing();
    order = null;
    searchBox.value = '';
    searchBox.hidden = true;
    get('quick-manager-status').textContent = '';
    renderManager();
    openWorkPanel(manager);
  }

  function openEditor(item) {
    actionId = item?.id;
    get('quick-editor-title').textContent = item ? 'Edit quick log' : 'New quick log';
    get('quick-label').value = item?.label ?? '';
    get('quick-text').value = item?.entryText ?? '';
    get('quick-emoji').value = item?.emoji ?? '';
    get('quick-unit').value = item?.measurementUnit ?? 'none';
    get('quick-values').value = (item?.measurementOptions?.length ? item.measurementOptions : item?.durationOptions ?? []).join(', ');
    const assignments = data.organization.assignments?.[item?.id] ?? [];
    const list = get('quick-editor-lists');
    list.replaceChildren();
    for (const category of data.organization.categories ?? []) {
      const chip = button(category.label, () => chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true')));
      chip.dataset.category = category.id;
      chip.setAttribute('aria-pressed', String(assignments.includes(category.id)));
      list.append(chip);
    }
    if (!list.childElementCount) list.textContent = 'Create a list in Manage quick logs to assign entries.';
    editor.showModal();
  }

  get('quick-editor-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const label = get('quick-label').value.trim();
    if (!label) return;
    const previous = data.actions.find((action) => action.id === actionId);
    const measurementUnit = get('quick-unit').value;
    const measurementOptions = measurementUnit === 'none' ? [] : [...new Set(get('quick-values').value.split(',').map(Number).filter((value) => Number.isFinite(value) && value > 0))];
    const action = { id: crypto.randomUUID(), position: data.actions.length, timePeriod: 'all', ...previous,
      measurementUnit, measurementOptions, durationOptions: measurementUnit === 'duration' ? measurementOptions : [],
      label, entryText: get('quick-text').value.trim() || label, emoji: get('quick-emoji').value.trim() };
    const actions = previous ? data.actions.map((item) => item.id === actionId ? action : item) : [...data.actions, action];
    const folders = [...get('quick-editor-lists').querySelectorAll('[aria-pressed=true]')].map((chip) => chip.dataset.category);
    const organization = { ...data.organization, assignments: { ...data.organization.assignments, [action.id]: folders }, ...(order ? { quickOrder: order } : {}) };
    if (editing) {
      data.actions = actions;
      data.organization = organization;
      editor.close();
      renderManager();
    } else if (await persist(actions, organization)) editor.close();
    else if (editor.open) showPanel('Could not save quick log', 'Reopen the list and try again.');
  });

  const trigger = get('quick-logs');
  async function loadQuickSettings(session) {
    const userId = session.user.id;
    let result;
    try {
      result = await client.from('quick_log_settings').select('actions, organization, updated_at').eq('user_id', userId)
        .abortSignal(AbortSignal.timeout(12000)).maybeSingle();
    } catch {
      return false;
    }
    const { data: row, error } = result;
    if (activeSession?.user.id !== userId) return false;
    if (error) return false;
    owner = userId;
    data = { actions: Array.isArray(row?.actions) ? row.actions : [], organization: row?.organization ?? {}, updated_at: row?.updated_at };
    return true;
  }
  let desktopFolder = null;
  function drawDesktopShortcuts() {
    const shortcuts = get('desk-shortcuts');
    shortcuts.replaceChildren();
    const category = desktopFolder && items().find((item) => item.category && item.id === desktopFolder);
    get('desk-quick-title').textContent = category?.label ?? 'Quick logs';
    get('desk-quick-back').hidden = !category;
    for (const item of (category ? children(category.id) : topItems().slice(0, 7))) {
      const shortcut = button('', () => {
        if (!item.category) return choose(item);
        desktopFolder = item.id;
        drawDesktopShortcuts();
      });
      shortcut.append(icon(item.category ? item.icon || 'mdi:folder-open-outline' : item.emoji), document.createTextNode(item.label));
      shortcuts.append(shortcut);
    }
  }
  get('desk-quick-back').addEventListener('click', () => {
    desktopFolder = null;
    drawDesktopShortcuts();
  });
  window.refreshMilogShortcuts = async (session) => {
    const shortcuts = get('desk-shortcuts');
    shortcuts.textContent = 'Loading quick logs…';
    desktopFolder = null;
    const loaded = await loadQuickSettings(session);
    if (activeSession?.user.id !== session.user.id) return;
    if (loaded) {
      drawDesktopShortcuts();
      if (!shortcuts.childElementCount) shortcuts.textContent = 'Add a quick log to get started.';
    } else shortcuts.textContent = 'Could not load quick logs.';
  };
  trigger.setAttribute('aria-expanded', 'false');
  sheet.addEventListener('close', () => trigger.setAttribute('aria-expanded', 'false'));
  trigger.addEventListener('click', async () => {
    const session = activeSession;
    if (!session) return;
    if (desktopMode()) {
      if (!data || owner !== session.user.id) {
        if (!await loadQuickSettings(session)) return showPanel('Could not load quick logs', 'Try again.');
      }
      if (!manager.open) openManager(false);
      return;
    }
    const userId = session.user.id;
    data = null;
    owner = userId;
    folder = null;
    order = null;
    expanded.clear();
    grid.replaceChildren();
    get('quick-status').textContent = 'Loading…';
    sheet.showModal();
    trigger.setAttribute('aria-expanded', 'true');
    const loaded = await loadQuickSettings(session);
    if (activeSession?.user.id !== session.user.id || !sheet.open) return;
    get('quick-status').textContent = loaded ? '' : 'Could not load quick logs.';
    if (!loaded) return;
    if (desktopMode()) return openManager(false);
    renderGrid();
  });

  get('quick-edit').append(icon('mdi:pencil-outline'));
  get('quick-search-toggle').append(icon('mdi:magnify'));
  get('quick-close').addEventListener('click', () => folder ? (folder = null, renderGrid()) : sheet.close());
  get('quick-add').addEventListener('click', () => { if (data) { openManager(true); openEditor(); } });
  get('quick-edit').addEventListener('click', () => openManager(true));
  get('quick-back').addEventListener('click', () => manager.close());
  get('quick-manager-x').addEventListener('click', () => manager.close());
  manager.addEventListener('close', cancelEditing);
  get('quick-manage-close').addEventListener('click', () => {
    if (!editing) return manager.close();
    cancelEditing();
    renderManager();
  });
  get('quick-manage-edit').addEventListener('click', async () => {
    if (editing) {
      if (!await persist(data.actions, { ...data.organization, ...(order ? { quickOrder: order } : {}) })) return;
      original = null;
      editing = false;
      drawDesktopShortcuts();
    } else startEditing();
    renderManager();
  });
  get('quick-manager-add').addEventListener('click', () => openEditor());
  get('quick-footer-add').addEventListener('click', () => openEditor());
  const folderEditor = get('quick-folder-editor');
  const folderForm = get('quick-folder-form');
  get('quick-folder-add').addEventListener('click', () => {
    folderForm.reset();
    folderEditor.showModal();
  });
  get('quick-folder-close').addEventListener('click', () => folderEditor.close());
  folderForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const label = get('quick-folder-label').value.trim();
    if (!editing || !label) return;
    data.organization.categories ??= [];
    data.organization.categories.push({ id: crypto.randomUUID(), label, timePeriod: get('quick-folder-period').value });
    folderEditor.close();
    renderManager();
  });
  get('quick-editor-close').addEventListener('click', () => editor.close());
  get('quick-editor-x').addEventListener('click', () => editor.close());
  get('quick-search-toggle').addEventListener('click', () => {
    searchBox.hidden = !searchBox.hidden;
    if (!searchBox.hidden) searchBox.focus();
    else { searchBox.value = ''; renderManager(); }
  });
  searchBox.addEventListener('input', renderManager);
})();

