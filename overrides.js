// Interaction upgrades layered onto the no-build app.
// The original popup sorted guest objects in place; preserve spreadsheet order.
const nativeSort = Array.prototype.sort;
Array.prototype.sort = function preservedGuestOrder(compareFn) {
  if (this.length && this.every(item => item && typeof item.name === 'string')) return this;
  return nativeSort.call(this, compareFn);
};
// Block the legacy row drag handlers completely. Reordering is arrow-only.
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
  if (!modal || modal.dataset.enhanced) return;
  const numberInput = modal.querySelector('#modal-number');
  const table = numberInput && state.tables.find(t => t.number === Number(numberInput.value));
  if (!table) return;
  modal.dataset.enhanced = 'true';
  enhanceSeatInputs(modal, table);
  addMoveButtons(modal, table);
});
uiObserver.observe(document.body, {childList:true, subtree:true});
function allAssignedNames(exceptTable, exceptSeat) { const used=new Set(); state.tables.forEach(t=>t.assignments.forEach((name,i)=>{if(name&&!(t.id===exceptTable&&i===exceptSeat))used.add(name)})); return used; }
function enhanceSeatInputs(modal, table) { [...modal.querySelectorAll('.seat-row')].forEach((row,index)=>{ const select=row.querySelector('select'); if(!select||row.dataset.enhanced)return; row.dataset.enhanced='true'; row.draggable=true; row.title='Drag this person to another seat to reorder'; const input=document.createElement('input'); const listId=`guest-options-${table.id}-${index}`; input.setAttribute('list',listId); input.placeholder='Type to search names'; input.value=select.value||''; input.className='guest-combobox'; const datalist=document.createElement('datalist'); datalist.id=listId; refreshOptions(datalist,table,index,input.value); select.hidden=true; select.after(input,datalist); input.addEventListener('input',()=>{const match=[...state.guests].find(g=>g.name.toLowerCase()===input.value.trim().toLowerCase()); select.value=match?match.name:''; select.dispatchEvent(new Event('change',{bubbles:true})); refreshAllComboboxes(modal,table)}); row.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',String(index));row.classList.add('dragging')}); row.addEventListener('dragend',()=>row.classList.remove('dragging')); row.addEventListener('dragover',e=>e.preventDefault()); row.addEventListener('drop',e=>{e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain'));if(Number.isNaN(from)||from===index)return;const moved=table.assignments.splice(from,1)[0]||null;table.assignments.splice(index,0,moved);closeModal();render();openTable(table.id)}); }); }
function addMoveButtons(modal, table) {
  modal.querySelectorAll('.seat-row').forEach((row, index) => {
    row.draggable = false;
    row.title = 'Use the arrows to move this person';
    if (row.querySelector('.seat-move-controls')) return;
    const controls = document.createElement('span');
    controls.className = 'seat-move-controls';
    controls.innerHTML = `<button type="button" title="Move up" ${index===0?'disabled':''}>↑</button><button type="button" title="Move down" ${index===table.seats-1?'disabled':''}>↓</button>`;
    const clear = row.querySelector('.remove-seat');
    row.insertBefore(controls, clear);
    const move = direction => {
      const target = index + direction;
      if (target < 0 || target >= table.seats) return;
      const moved = table.assignments.splice(index, 1)[0] || null;
      table.assignments.splice(target, 0, moved);
      closeModal();
      render();
      openTable(table.id);
    };
    controls.children[0].onclick = () => move(-1);
    controls.children[1].onclick = () => move(1);
  });
}
function refreshOptions(datalist,table,seatIndex,current){const used=allAssignedNames(table.id,seatIndex);datalist.innerHTML='';state.guests.forEach(g=>{if(!used.has(g.name)||g.name===current){const option=document.createElement('option');option.value=g.name;datalist.appendChild(option)}})}
function refreshAllComboboxes(modal,table){modal.querySelectorAll('.seat-row').forEach((row,index)=>{const input=row.querySelector('.guest-combobox'),datalist=row.querySelector('datalist');if(input&&datalist)refreshOptions(datalist,table,index,input.value)})}

// Preserve import order in the guest list; only the search filter changes it.
renderGuests = function orderedRenderGuests() {
  const q = $('#guest-search').value.toLowerCase();
  const list = $('#guest-list');
  list.innerHTML = '';
  state.guests.filter(g => g.name.toLowerCase().includes(q)).forEach(g => {
    const loc = findAssignment(g.name);
    const row = document.createElement('div');
    row.className = `guest-item ${loc ? 'assigned ' : ''}${state.selectedGuest === g.name ? 'selected' : ''}`;
    row.innerHTML = `<span class="guest-dot"></span><span class="guest-name">${escapeHtml(g.name)}</span><span class="guest-location">${loc ? `T${loc.table} · S${loc.seat}` : ''}</span>`;
    row.onclick = () => {
      state.selectedGuest = state.selectedGuest === g.name ? null : g.name;
      setStatus(state.selectedGuest ? `Selected ${state.selectedGuest} — click an open chair` : 'Select a guest to assign');
      render();
    };
    list.appendChild(row);
  });
};
