// Seating-chart interaction upgrades.
const nativeSort = Array.prototype.sort;
Array.prototype.sort = function preservedGuestOrder(compareFn) {
  if (this.length && this.every(item => item && typeof item.name === 'string')) return this;
  return nativeSort.call(this, compareFn);
};

document.addEventListener('dragstart', event => {
  if (event.target.closest && event.target.closest('.seat-row')) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

const uiObserver = new MutationObserver(() => {
  document.querySelectorAll('.table-object').forEach(el => {
    const t = state.tables.find(x => x.id === el.dataset.id);
    if (!t) return;
    const scale = 0.82 + (t.seats * 0.035);
    el.style.transform = t.flipped ? `scale(${scale}) rotate(90deg)` : `scale(${scale})`;
    el.style.transformOrigin = 'center center';
    const surface = el.querySelector('.table-surface');
    if (surface && !surface.dataset.opensEditor) {
      surface.dataset.opensEditor = 'true';
      surface.addEventListener('click', e => { e.stopPropagation(); openTable(t.id); });
    }
  });
  const modal = document.querySelector('.modal');
  if (!modal) return;
  const numberInput = modal.querySelector('#modal-number');
  const table = numberInput && state.tables.find(t => t.number === Number(numberInput.value));
  if (!table) return;
  enhanceSeatInputs(modal, table);
  addMoveButtons(modal, table);
});
uiObserver.observe(document.body, {childList:true, subtree:true});

function assignedElsewhere(table, seatIndex) {
  const names = new Set();
  state.tables.forEach(t => t.assignments.forEach((name, i) => {
    if (name && !(t.id === table.id && i === seatIndex)) names.add(name);
  }));
  return names;
}

function enhanceSeatInputs(modal, table) {
  [...modal.querySelectorAll('.seat-row')].forEach((row, index) => {
    const select = row.querySelector('select');
    if (!select || row.dataset.enhanced) return;
    row.dataset.enhanced = 'true';
    row.draggable = false;
    const wrapper = document.createElement('div');
    wrapper.className = 'searchable-combobox';
    const input = document.createElement('input');
    input.className = 'guest-combobox';
    input.placeholder = 'Search names';
    input.value = select.value || '';
    const menu = document.createElement('div');
    menu.className = 'combobox-menu';
    wrapper.append(input, menu);
    select.hidden = true;
    select.after(wrapper);

    const refresh = () => {
      const query = input.value.trim().toLowerCase();
      const used = assignedElsewhere(table, index);
      menu.innerHTML = '';
      state.guests.filter(g => g.name.toLowerCase().includes(query)).forEach(g => {
        const unavailable = used.has(g.name);
        const option = document.createElement('button');
        option.type = 'button';
        option.className = `combobox-option ${unavailable ? 'unavailable' : ''}`;
        option.textContent = g.name;
        option.disabled = unavailable;
        option.onclick = () => {
          input.value = g.name;
          select.value = g.name;
          select.dispatchEvent(new Event('change', {bubbles:true}));
          menu.classList.remove('open');
          refreshAllComboboxes(modal, table);
        };
        menu.appendChild(option);
      });
      menu.classList.add('open');
    };
    input.addEventListener('focus', refresh);
    input.addEventListener('click', refresh);
    input.addEventListener('input', () => {
      const exact = state.guests.find(g => g.name.toLowerCase() === input.value.trim().toLowerCase());
      select.value = exact ? exact.name : '';
      select.dispatchEvent(new Event('change', {bubbles:true}));
      refresh();
    });
    document.addEventListener('click', e => { if (!wrapper.contains(e.target)) menu.classList.remove('open'); });
  });
}

function refreshAllComboboxes(modal, table) {
  modal.querySelectorAll('.guest-combobox').forEach(input => {
    const wrapper = input.closest('.searchable-combobox');
    const menu = wrapper && wrapper.querySelector('.combobox-menu');
    const row = input.closest('.seat-row');
    if (!menu || !row) return;
    const index = [...modal.querySelectorAll('.seat-row')].indexOf(row);
    const used = assignedElsewhere(table, index);
    menu.innerHTML = '';
    state.guests.filter(g => g.name.toLowerCase().includes(input.value.toLowerCase())).forEach(g => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = `combobox-option ${used.has(g.name) ? 'unavailable' : ''}`;
      option.textContent = g.name;
      option.disabled = used.has(g.name);
      option.onclick = () => { input.value=g.name; const select=row.querySelector('select'); select.value=g.name; select.dispatchEvent(new Event('change',{bubbles:true})); menu.classList.remove('open'); refreshAllComboboxes(modal,table); };
      menu.appendChild(option);
    });
  });
}

function addMoveButtons(modal, table) {
  modal.querySelectorAll('.seat-row').forEach((row, index) => {
    if (row.querySelector('.seat-move-controls')) return;
    const controls = document.createElement('span');
    controls.className = 'seat-move-controls';
    controls.innerHTML = `<button type="button" title="Move up" ${index===0?'disabled':''}>↑</button><button type="button" title="Move down" ${index===table.seats-1?'disabled':''}>↓</button>`;
    row.insertBefore(controls, row.querySelector('.remove-seat'));
    const move = direction => {
      const target = index + direction;
      if (target < 0 || target >= table.seats) return;
      const moved = table.assignments.splice(index, 1)[0] || null;
      table.assignments.splice(target, 0, moved);
      closeModal(); render(); openTable(table.id);
    };
    controls.children[0].onclick = () => move(-1);
    controls.children[1].onclick = () => move(1);
  });
}

renderGuests = function orderedRenderGuests() {
  const q = $('#guest-search').value.toLowerCase();
  const list = $('#guest-list'); list.innerHTML = '';
  state.guests.filter(g => g.name.toLowerCase().includes(q)).forEach(g => {
    const loc = findAssignment(g.name); const row = document.createElement('div');
    row.className = `guest-item ${loc ? 'assigned ' : ''}${state.selectedGuest === g.name ? 'selected' : ''}`;
    row.innerHTML = `<span class="guest-dot"></span><span class="guest-name">${escapeHtml(g.name)}</span><span class="guest-location">${loc ? `T${loc.table} · S${loc.seat}` : ''}</span>`;
    row.onclick = () => { state.selectedGuest = state.selectedGuest === g.name ? null : g.name; setStatus(state.selectedGuest ? `Selected ${state.selectedGuest} — click an open chair` : 'Select a guest to assign'); render(); };
    list.appendChild(row);
  });
};

// Give new charts room to scroll in every direction from the beginning.
$('#add-table').addEventListener('click', () => {
  const table = state.tables[state.tables.length - 1];
  if (!table || table.x >= 200 || table.y >= 200) return;
  const index = state.tables.length - 1;
  table.x = 480 + (index % 4) * 330;
  table.y = 300 + Math.floor(index / 4) * 300;
  render();
});
