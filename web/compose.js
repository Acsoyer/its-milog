let selectedAgendaSlot = null;
const picker = document.querySelector('#compose-picker');
const pickerContent = document.querySelector('#compose-picker-content');
const pickerStatus = document.querySelector('#picker-status');
const endLink = document.querySelector('#picker-end-link');
const dateButton = document.querySelector('#compose-date');
const timeButton = document.querySelector('#compose-time');
const agendaDateButton = document.querySelector('#agenda-compose-date');
const agendaControls = document.querySelector('#compose-agenda');
const quarters = document.querySelector('#quarter-times');
const composeSave = composeForm.querySelector('[type=submit]');
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const twoDigits = (value) => String(value).padStart(2, '0');
let start;
let end;
let draftStart;
let draftEnd;
let pickerMode;
let month;
let readWheels;
let pickerCommit;

function openComposeEditor(text, existingDate) {
  const now = new Date();
  const slot = agenda && selectedAgendaSlot?.startsWith(selectedDate + 'T') ? selectedAgendaSlot : null;
  start = existingDate ? new Date(existingDate) : slot ? new Date(slot) : now;
  if (agenda && !slot && !existingDate) {
    start = new Date(selectedDate + 'T' + timeFormat.format(now));
    start.setMinutes(Math.floor(start.getMinutes() / 15) * 15);
  }
  start.setSeconds(0, 0);
  end = null;
  composeBody.value = text;
  composeSave.disabled = !text.trim();
  document.querySelector('#compose-title').textContent = agenda ? 'Agenda Entry' : 'New log';
  document.querySelector('#compose-date-row').hidden = agenda;
  agendaControls.hidden = !agenda;
  composeBody.placeholder = agenda ? 'What are you planning?' : 'What’s happening?';
  openWorkPanel(compose);
  updateComposeFields();
}

function setComposeAgendaSlot(slot) {
  if (!agenda) return;
  start = new Date(slot);
  if (end && end <= start) end = null;
  updateComposeFields();
}

function updateComposeFields() {
  dateButton.textContent = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = timeFormat.format(start) + (end ? ' – ' + formatEnd(start, end) : '');
  timeButton.textContent = time;
  agendaDateButton.querySelector('strong').textContent = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', weekday: 'long' });
  document.querySelector('#agenda-end').textContent = end ? 'Ends at ' + formatEnd(start, end) : 'Add end time';
  document.querySelector('#agenda-manual').textContent = 'Set time manually · ' + timeFormat.format(start);
  if (agenda) drawQuarters();
}

function formatEnd(from, to) {
  return timeFormat.format(to) + (dateKey(from) !== dateKey(to) ? ' (+1 day)' : '');
}

function drawQuarters() {
  const startMinute = start.getHours() * 60 + start.getMinutes();
  quarters.replaceChildren();
  let active;
  for (let minute = 0; minute < 1440; minute += 15) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = twoDigits(Math.floor(minute / 60)) + ':' + twoDigits(minute % 60);
    button.setAttribute('aria-pressed', String(minute === startMinute));
    if (minute === Math.floor(startMinute / 15) * 15) active = button;
    button.addEventListener('click', () => {
      start.setHours(Math.floor(minute / 60), minute % 60);
      if (end && end <= start) end = null;
      updateComposeFields();
      quarters.querySelector('[aria-pressed=true]')?.focus({ preventScroll: true });
    });
    quarters.append(button);
  }
  if (active) quarters.scrollLeft = active.offsetLeft - (quarters.clientWidth - active.offsetWidth) / 2;
}

function showComposePicker(mode, anchor, onCommit) {
  pickerCommit = onCommit;
  draftStart = new Date(start);
  draftEnd = end && new Date(end);
  pickerMode = mode;
  month = new Date(start.getFullYear(), start.getMonth(), 1);
  picker.style.top = anchor.getBoundingClientRect().bottom + 8 + 'px';
  picker.showModal();
  if (mode === 'end' && !draftEnd) draftEnd = new Date(+draftStart + 3600000);
  renderPicker();
  picker.style.maxHeight = 'calc(100dvh - ' + picker.style.top + ' - 8px)';
}

function makePickerButton(label, handler, description) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (description) button.setAttribute('aria-label', description);
  button.addEventListener('click', handler);
  return button;
}

function renderDatePicker() {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const header = document.createElement('header');
  header.className = 'screen-header';
  const heading = document.createElement('strong');
  heading.textContent = month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const moveMonth = (direction) => {
    month = new Date(year, monthIndex + direction, 1);
    renderDatePicker();
  };
  header.append(makePickerButton('‹', () => moveMonth(-1), 'Previous month'), heading,
    makePickerButton('›', () => moveMonth(1), 'Next month'));
  const grid = document.createElement('div');
  grid.className = 'compose-calendar-grid';
  const offset = (month.getDay() + 6) % 7;
  for (let index = 0; index < 42; index += 1) {
    const day = new Date(year, monthIndex, index + 1 - offset);
    const button = makePickerButton(day.getDate(), () => {
      draftStart.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
      grid.querySelector('[aria-pressed=true]')?.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-pressed', 'true');
    }, day.toLocaleDateString('en-GB', { dateStyle: 'full' }));
    button.setAttribute('aria-pressed', String(dateKey(day) === dateKey(draftStart)));
    button.classList.toggle('other-month', day.getMonth() !== monthIndex);
    grid.append(button);
  }
  pickerContent.replaceChildren(header, grid);
}

function timeWheel(count, initial, label) {
  const wheel = document.createElement('div');
  wheel.className = 'compose-wheel cyclic-wheel';
  wheel.tabIndex = 0;
  wheel.setAttribute('role', 'spinbutton');
  wheel.setAttribute('aria-label', label);
  wheel.setAttribute('aria-valuemin', '0');
  wheel.setAttribute('aria-valuemax', String(count - 1));
  let value = initial;
  let remainder = 0;
  let previousY;
  const rows = Array.from({ length: 5 }, () => document.createElement('div'));
  rows[2].className = 'selected';
  wheel.append(...rows);
  function move(delta) {
    value = ((value + delta) % count + count) % count;
    rows.forEach((row, index) => { row.textContent = twoDigits((value + index - 2 + count) % count); });
    wheel.setAttribute('aria-valuenow', String(value));
  }
  function pan(distance) {
    remainder += distance;
    const step = rows[2].offsetHeight || 40;
    const change = Math.trunc(remainder / step);
    if (change) {
      remainder -= change * step;
      move(change);
    }
  }
  wheel.addEventListener('wheel', (event) => {
    event.preventDefault();
    pan(Math.max(-60, Math.min(60, event.deltaY * (event.deltaMode ? 16 : 1))));
  }, { passive: false });
  wheel.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    previousY = event.clientY;
    remainder = 0;
    wheel.setPointerCapture(event.pointerId);
  });
  wheel.addEventListener('pointermove', (event) => {
    if (!wheel.hasPointerCapture(event.pointerId)) return;
    pan(previousY - event.clientY);
    previousY = event.clientY;
  });
  wheel.addEventListener('keydown', (event) => {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'Home' ? -value : event.key === 'End' ? count - 1 - value : event.key === 'ArrowUp' ? -1 : 1);
  });
  return { wheel, read: () => value, initialize: () => move(0) };
}
function renderPicker() {
  pickerStatus.textContent = '';
  endLink.hidden = pickerMode !== 'time' || Boolean(pickerCommit);
  if (pickerMode === 'date') {
    renderDatePicker();
    return;
  }
  const range = pickerMode === 'end';
  const time = range ? draftEnd : draftStart;
  const hours = timeWheel(24, time.getHours(), range ? 'End time' : 'Start time');
  const minutes = timeWheel(60, time.getMinutes(), range ? 'End minute' : 'Start minute');
  const wheels = document.createElement('div');
  wheels.className = 'compose-wheels';
  wheels.append(hours.wheel, minutes.wheel);
  readWheels = () => {
    const value = new Date(time);
    value.setHours(hours.read(), minutes.read(), 0, 0);
    return value;
  };
  pickerContent.replaceChildren();
  if (range) {
    const panel = document.createElement('div');
    panel.className = 'compose-range';
    const presets = document.createElement('section');
    const label = document.createElement('small');
    label.textContent = 'START TIME';
    presets.append(label, makePickerButton(timeFormat.format(draftStart) + ' ✎', () => {
      draftEnd = readWheels();
      pickerMode = 'time';
      renderPicker();
    }, 'Edit start time'));
    for (const [length, caption] of [[15, '15 dk'], [30, '30 dk'], [60, '1 saat'], [120, '2 saat']]) {
      presets.append(makePickerButton(caption, () => {
        draftEnd = new Date(+draftStart + length * 60000);
        renderPicker();
      }));
    }
    const finish = document.createElement('section');
    const finishLabel = document.createElement('small');
    finishLabel.textContent = 'END TIME' + (dateKey(draftEnd) !== dateKey(draftStart) ? ' (+1 DAY)' : '');
    finish.append(finishLabel, makePickerButton('×', () => {
      draftEnd = null;
      pickerMode = 'time';
      renderPicker();
    }, 'Remove end time'), wheels);
    panel.append(presets, finish);
    pickerContent.append(panel);
  } else pickerContent.append(wheels);
  hours.initialize();
  minutes.initialize();
}

dateButton.addEventListener('click', () => showComposePicker('date', dateButton));
agendaDateButton.addEventListener('click', () => showComposePicker('date', agendaDateButton));
timeButton.addEventListener('click', () => showComposePicker(end ? 'end' : 'time', timeButton));
document.querySelector('#agenda-manual').addEventListener('click', (event) => showComposePicker('time', event.currentTarget));
document.querySelector('#agenda-end').addEventListener('click', (event) => showComposePicker('end', event.currentTarget));
endLink.addEventListener('click', () => {
  draftStart = readWheels();
  if (!draftEnd || draftEnd <= draftStart) draftEnd = new Date(+draftStart + 3600000);
  pickerMode = 'end';
  renderPicker();
});
document.querySelector('#picker-confirm').addEventListener('click', () => {
  if (pickerMode === 'time') draftStart = readWheels();
  if (pickerMode === 'end') draftEnd = readWheels();
  if (pickerMode === 'date' && !pickerCommit && end) draftEnd = new Date(+draftStart + (+end - +start));
  if (draftEnd && draftEnd <= draftStart) {
    pickerStatus.textContent = 'End time must be after start time.';
    return;
  }
  if (pickerCommit) {
    pickerCommit(draftStart);
    picker.close();
    return;
  }
  start = draftStart;
  end = draftEnd;
  picker.close();
  updateComposeFields();
});
picker.addEventListener('click', (event) => {
  if (event.target !== picker) return;
  const box = picker.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) picker.close();
});
for (const [id, direction] of [['quarter-back', -1], ['quarter-next', 1]]) {
  document.querySelector('#' + id).addEventListener('click', () => quarters.scrollBy({ left: direction * quarters.clientWidth * .75, behavior: 'smooth' }));
}
quarters.addEventListener('wheel', (event) => {
  if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
  event.preventDefault();
  quarters.scrollLeft += event.deltaY;
}, { passive: false });
composeBody.addEventListener('input', () => { composeSave.disabled = !composeBody.value.trim(); });
document.querySelector('#compose-clear').addEventListener('click', () => {
  composeBody.value = '';
  composeSave.disabled = true;
  composeBody.focus();
});

function composeTiming() {
  if (!start || !Number.isFinite(+start) || (end && end <= start)) return null;
  return { created_at: start.toISOString(), ...(end ? { end_at: end.toISOString() } : {}) };
}


