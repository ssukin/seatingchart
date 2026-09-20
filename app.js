const $ = selector => document.querySelector(selector);
const state = { tables: [], guests: [], nextTable: 1, selectedGuest: null, shape: 'round', zoom: 1 };
const canvas = $('#canvas');
for (let i = 2; i <= 14; i++) $('#seat-count').insertAdjacentHTML('beforeend', `<option>${i}</option>`);

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const save = () => localStorage.setItem('seatery-project', JSON.stringify({ tables: state.tables, guests: state.guests, nextTable: state.nextTable }));
const closeModal = () => { $('#modal-root').innerHTML = ''; };
const setStatus = text => { $('#assignment-status').textContent = text; };
const showToast = text => { const toast = $('#toast'); toast.textContent = text; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200); };
const snap = value => Math.round(value / 24) * 24;

function chairPositions(shape, seats, flipped = false) {
  if (shape === 'round') return Array.from({length: seats}, (_, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / seats; return { x: 85 + Math.cos(a) * 106 - 12.5, y: 85 + Math.sin(a) * 106 - 12.5, dx: Math.cos(a), dy: Math.sin(a) }; });
  const w = flipped ? 130 : 230, h = flipped ? 230 : 130, step = (2 * (w + h)) / seats;
  return Array.from({length: seats}, (_, i) => { let d = i * step, x, y, dx, dy; if (d < w) { x=d; y=-38; dx=0; dy=-1; } else if ((d-=w) < h) { x=w+14; y=d; dx=1; dy=0; } else if ((d-=h) < w) { x=w-d; y=h+14; dx=0; dy=1; } else { d-=w; x=-38; y=h-d; dx=-1; dy=0; } return {x:x-12.5,y:y-12.5,dx,dy}; });
}

function assignmentFor(name) { for (const table of state.tables) { const seat = table.assignments.indexOf(name); if (seat >= 0) return {table, seat}; } return null; }
function usedNamesExcept(table, seat) { const used = new Set(); state.tables.forEach(t => t.assignments.forEach((name, i) => { if (name && !(t.id === table.id && i === seat)) used.add(name); })); return used; }

function render() {
  canvas.innerHTML = '';
  state.tables.forEach(table => {
    const object = document.createElement('div'); object.className = `table-object ${table.shape} ${table.flipped ? 'flipped' : ''}`; object.dataset.id = table.id; object.style.left = `${table.x}px`; object.style.top = `${table.y}px`;
    const surface = document.createElement('div'); surface.className = 'table-surface';
    surface.addEventListener('click', e => { e.stopPropagation(); openTable(table.id); });
    const label = document.createElement('div'); label.className = 'table-label'; label.innerHTML = `Table ${table.number}<small>${table.seats} seats</small>`; surface.appendChild(label); object.appendChild(surface);
    chairPositions(table.shape, table.seats, table.flipped).forEach((position, index) => {
      const chair = document.createElement('button'); chair.className = `chair ${table.assignments[index] ? 'occupied' : ''} ${state.selectedGuest ? 'pending' : ''}`; chair.style.left = `${position.x}px`; chair.style.top = `${position.y}px`; chair.textContent = index + 1; chair.title = table.assignments[index] || `Seat ${index + 1}`;
      chair.addEventListener('click', e => { e.stopPropagation(); assignGuest(table.id, index); }); object.appendChild(chair);
      if (table.assignments[index]) { const name = document.createElement('span'); name.className='chair-name'; name.textContent=table.assignments[index]; name.style.left=`${position.x+12.5+position.dx*25}px`; name.style.top=`${position.y+12.5+position.dy*25-6}px`; name.style.transform=position.dx<-.2?'translateX(-100%)':''; object.appendChild(name); }
    });
    makeDraggable(object, table); canvas.appendChild(object);
  });
  $('#table-count').textContent = state.tables.length; renderGuests(); renderStats(); save();
}

function makeDraggable(object, table) { let start = null; object.addEventListener('pointerdown', e => { if (e.target.closest('.chair')) return; start = {x:e.clientX,y:e.clientY,tx:table.x,ty:table.y}; object.setPointerCapture(e.pointerId); }); object.addEventListener('pointermove', e => { if (!start) return; table.x=snap(start.tx+(e.clientX-start.x)/state.zoom); table.y=snap(start.ty+(e.clientY-start.y)/state.zoom); object.style.left=`${table.x}px`; object.style.top=`${table.y}px`; }); object.addEventListener('pointerup', () => { if (start) { start=null; save(); } }); }
function renderGuests() { const query=$('#guest-search').value.toLowerCase(), list=$('#guest-list'); list.innerHTML=''; state.guests.filter(g=>g.name.toLowerCase().includes(query)).forEach(guest=>{ const location=assignmentFor(guest.name), row=document.createElement('div'); row.className=`guest-item ${location?'assigned ':''}${state.selectedGuest===guest.name?'selected':''}`; row.innerHTML=`<span class="guest-dot"></span><span class="guest-name">${escapeHtml(guest.name)}</span><span class="guest-location">${location?`T${location.table.number} · S${location.seat+1}`:''}</span>`; row.onclick=()=>{state.selectedGuest=state.selectedGuest===guest.name?null:guest.name; setStatus(state.selectedGuest?`Selected ${state.selectedGuest} — click an open chair`:'Select a guest to assign'); render();}; list.appendChild(row); }); }
function renderStats() { const assigned=state.guests.filter(g=>assignmentFor(g.name)).length; $('#guest-count').textContent=state.guests.length; $('#assigned-count').textContent=`${assigned} / ${state.guests.length}`; $('#unassigned-count').textContent=state.guests.length-assigned; }

function assignGuest(tableId, seatIndex) { const table=state.tables.find(t=>t.id===tableId); if(!state.selectedGuest){openTable(tableId);return;} if(table.assignments[seatIndex]&&table.assignments[seatIndex]!==state.selectedGuest){showToast('That seat is already assigned.');return;} const old=assignmentFor(state.selectedGuest); if(old&&old.table.id!==table.id){showDuplicate(table,seatIndex,old);return;} table.assignments[seatIndex]=state.selectedGuest; state.selectedGuest=null; setStatus('Guest assigned'); render(); }
function showDuplicate(table, seatIndex, old) { const root=$('#modal-root'); root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-header"><div><h2>Guest already assigned</h2><p class="modal-subtitle">${escapeHtml(state.selectedGuest)} is at Table ${old.table.number}, Seat ${old.seat+1}.</p></div><button class="modal-close">×</button></div><div class="warning-box">Choose what to do with the existing assignment.</div><div class="modal-actions"><button class="button secondary" data-action="cancel">Cancel</button><div><button class="button secondary" data-action="keep">Keep both</button><button class="button primary" data-action="remove">Remove other seat</button></div></div></div></div>`; root.querySelector('.modal-close').onclick=closeModal; root.querySelector('[data-action="cancel"]').onclick=closeModal; root.querySelector('[data-action="keep"]').onclick=()=>{table.assignments[seatIndex]=state.selectedGuest;state.selectedGuest=null;closeModal();render();}; root.querySelector('[data-action="remove"]').onclick=()=>{old.table.assignments[old.seat]=null;table.assignments[seatIndex]=state.selectedGuest;state.selectedGuest=null;closeModal();render();}; }

function openTable(id) { const table=state.tables.find(t=>t.id===id), root=$('#modal-root'); root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-header"><div><h2>Edit table</h2><p class="modal-subtitle">Assign names to individual seats.</p></div><button class="modal-close">×</button></div><div class="form-row"><div><label>Table number</label><input id="modal-number" type="number" min="1" value="${table.number}"></div><div><label>Seats</label><select id="modal-seats">${Array.from({length:13},(_,i)=>`<option ${i+2===table.seats?'selected':''}>${i+2}</option>`).join('')}</select></div></div>${table.shape==='rectangle'?'<button id="flip-table" class="button secondary" style="margin-top:12px">Flip orientation</button>':''}<div id="seat-rows"></div><div class="modal-actions"><button id="delete-table" class="button secondary">Delete table</button><button id="save-table" class="button primary">Save changes</button></div></div></div>`;
  const rows=$('#seat-rows');
  const redrawRows=()=>{ rows.innerHTML=''; for(let i=0;i<table.seats;i++) rows.appendChild(makeSeatRow(table,i)); };
  redrawRows(); root.querySelector('.modal-close').onclick=closeModal;
  if($('#flip-table')) $('#flip-table').onclick=()=>{table.flipped=!table.flipped;render();openTable(table.id);};
  $('#modal-seats').onchange=e=>{const n=+e.target.value;if(n<table.seats&&table.assignments.slice(n).some(Boolean)&&!confirm('Guests in removed seats will be cleared. Continue?')){e.target.value=table.seats;return;}table.assignments=table.assignments.slice(0,n);while(table.assignments.length<n)table.assignments.push(null);table.seats=n;redrawRows();};
  $('#modal-number').onchange=e=>{const n=+e.target.value;if(state.tables.some(t=>t.id!==table.id&&t.number===n)){showToast('Table numbers must be unique.');e.target.value=table.number;}else table.number=n;};
  $('#delete-table').onclick=()=>{if(confirm(`Delete Table ${table.number}?`)){state.tables=state.tables.filter(t=>t.id!==table.id);closeModal();render();}}; $('#save-table').onclick=()=>{closeModal();render();};
}

function makeSeatRow(table,index) { const row=document.createElement('div'); row.className='seat-row'; const number=document.createElement('span');number.className='seat-number';number.textContent=`Seat ${index+1}`; const combo=makeCombobox(table,index); const controls=document.createElement('span');controls.className='seat-move-controls';controls.innerHTML=`<button type="button" title="Move up" ${index===0?'disabled':''}>↑</button><button type="button" title="Move down" ${index===table.seats-1?'disabled':''}>↓</button>`; const move=direction=>{const target=index+direction;if(target<0||target>=table.seats)return;const moved=table.assignments.splice(index,1)[0]||null;table.assignments.splice(target,0,moved);closeModal();render();openTable(table.id);};controls.children[0].onclick=()=>move(-1);controls.children[1].onclick=()=>move(1); const clear=document.createElement('button');clear.className='remove-seat';clear.title='Clear seat';clear.textContent='×';clear.onclick=()=>{table.assignments[index]=null;closeModal();render();openTable(table.id);}; row.append(number,combo,controls,clear); return row; }
function makeCombobox(table,index) { const wrapper=document.createElement('div');wrapper.className='searchable-combobox'; const input=document.createElement('input');input.className='guest-combobox';input.placeholder='Select or search names';input.value=table.assignments[index]||''; const menu=document.createElement('div');menu.className='combobox-menu'; wrapper.append(input,menu);
  const refresh=()=>{const query=input.value.toLowerCase(),used=usedNamesExcept(table,index);menu.innerHTML='';state.guests.filter(g=>g.name.toLowerCase().includes(query)).forEach(g=>{const option=document.createElement('button');option.type='button';option.className=`combobox-option ${used.has(g.name)?'unavailable':''}`;option.disabled=used.has(g.name);option.textContent=g.name;option.onclick=()=>{table.assignments[index]=g.name;input.value=g.name;menu.classList.remove('open');refreshAllComboboxes();};menu.appendChild(option);});menu.classList.add('open');}; input.addEventListener('focus',refresh);input.addEventListener('click',refresh);input.addEventListener('input',refresh); return wrapper; }
function refreshAllComboboxes(){const modal=document.querySelector('.modal');if(!modal)return;const table=state.tables.find(t=>t.number===Number($('#modal-number').value));if(!table)return;modal.querySelectorAll('.seat-row').forEach((row,i)=>{const input=row.querySelector('.guest-combobox'),menu=row.querySelector('.combobox-menu');if(!input||!menu)return;const used=usedNamesExcept(table,i);menu.innerHTML='';state.guests.filter(g=>g.name.toLowerCase().includes(input.value.toLowerCase())).forEach(g=>{const option=document.createElement('button');option.type='button';option.className=`combobox-option ${used.has(g.name)?'unavailable':''}`;option.disabled=used.has(g.name);option.textContent=g.name;option.onclick=()=>{table.assignments[i]=g.name;input.value=g.name;menu.classList.remove('open');refreshAllComboboxes();};menu.appendChild(option);});});}

$('#add-table').onclick=()=>{const seats=+$('#seat-count').value,index=state.tables.length;state.tables.push({id:crypto.randomUUID(),number:state.nextTable++,shape:state.shape,seats,flipped:false,assignments:Array(seats).fill(null),x:480+(index%4)*330,y:300+Math.floor(index/4)*300});setStatus('Drag tables into place, or click a table to edit');render();}; document.querySelectorAll('.shape-choice').forEach(button=>button.onclick=()=>{document.querySelectorAll('.shape-choice').forEach(b=>b.classList.remove('active'));button.classList.add('active');state.shape=button.dataset.shape;}); $('#guest-search').oninput=renderGuests;
$('#add-guest').onclick=()=>{const name=prompt('Guest full name:');if(name&&name.trim()&&!state.guests.some(g=>g.name.toLowerCase()===name.trim().toLowerCase())){state.guests.push({name:name.trim()});render();}};$('#clear-guests').onclick=()=>{if(confirm('Remove all guests and assignments?')){state.guests=[];state.tables.forEach(t=>t.assignments=t.assignments.map(()=>null));render();}};$('#clear-chart').onclick=()=>{if(confirm('Clear all tables and guests?')){state.tables=[];state.guests=[];state.nextTable=1;localStorage.removeItem('seatery-project');render();setStatus('Add a table to begin');}};
function setZoom(value){state.zoom=Math.max(.5,Math.min(1.6,value));canvas.style.transform=`scale(${state.zoom})`;$('#zoom-value').textContent=`${Math.round(state.zoom*100)}%`;}
$('#zoom-in').onclick=()=>setZoom(state.zoom+.1);$('#zoom-out').onclick=()=>setZoom(state.zoom-.1);$('#zoom-reset').onclick=()=>setZoom(1);
$('#excel-input').onchange=async e=>{const file=e.target.files[0];if(!file)return;const rows=XLSX.utils.sheet_to_json(XLSX.read(await file.arrayBuffer()).Sheets[XLSX.read(await file.arrayBuffer()).SheetNames[0]],{header:1});const headers=rows[0]||[];const root=$('#modal-root');root.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>Choose name column</h2><p class="modal-subtitle">Select the full-name column to import.</p><select id="name-column">${headers.map((h,i)=>`<option value="${i}">${escapeHtml(h||`Column ${i+1}`)}</option>`).join('')}</select><div class="modal-actions"><button class="button secondary modal-cancel">Cancel</button><button id="import-names" class="button primary">Import names</button></div></div></div>`;root.querySelector('.modal-cancel').onclick=closeModal;$('#import-names').onclick=()=>{const col=+$('#name-column').value;rows.slice(1).map(r=>String(r[col]||'').trim()).filter(Boolean).forEach(name=>{if(!state.guests.some(g=>g.name.toLowerCase()===name.toLowerCase()))state.guests.push({name});});closeModal();render();showToast('Guests imported');};};
function download(name,data,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);} $('#export-project').onclick=()=>download('seatery-project.json',JSON.stringify({tables:state.tables,guests:state.guests,nextTable:state.nextTable},null,2),'application/json');$('#import-project').onclick=()=>$('#project-input').click();$('#project-input').onchange=async e=>{try{Object.assign(state,JSON.parse(await e.target.files[0].text()));render();showToast('Project restored');}catch{showToast('Could not open project file');}};
$('#export-png').onclick=()=>{
  // Derive the export rectangle from the actual content. The visible viewport
  // and the CSS canvas size are intentionally not used here: tables may be
  // dragged anywhere on the infinite-feeling workspace.
  const pad=70, labelPadX=150, labelPadY=28;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  const include=(x,y,w,h)=>{minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x+w);maxY=Math.max(maxY,y+h);};
  state.tables.forEach(t=>{
    const round=t.shape==='round',tw=round?170:(t.flipped?130:230),th=round?170:(t.flipped?230:130);
    include(t.x,t.y,tw,th);
    chairPositions(t.shape,t.seats,t.flipped).forEach((p,i)=>{
      include(t.x+p.x,t.y+p.y,25,25);
      if(t.assignments[i]) include(t.x+p.x+12.5+p.dx*25-labelPadX/2,t.y+p.y+12.5+p.dy*25-labelPadY/2,labelPadX,labelPadY);
    });
  });
  if(!Number.isFinite(minX)){minX=0;minY=0;maxX=800;maxY=500;}
  minX-=pad; minY-=pad; maxX+=pad; maxY+=pad;
  const w=Math.max(1,Math.ceil(maxX-minX)),h=Math.max(1,Math.ceil(maxY-minY));
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#f6f8fa"/>`;
  state.tables.forEach(t=>{
    const x=t.x-minX,y=t.y-minY,round=t.shape==='round',cw=t.flipped?130:230,ch=t.flipped?230:130;
    svg+=`<g transform="translate(${x},${y})"><${round?'circle':'rect'} ${round?'cx="85" cy="85" r="85"':'x="0" y="0" width="'+cw+'" height="'+ch+'" rx="8"'} fill="white" stroke="#8795a4" stroke-width="2"/><text x="${round?85:cw/2}" y="${round?82:ch/2}" text-anchor="middle" font-family="Arial" font-size="15" font-weight="bold">Table ${t.number}</text>`;
    chairPositions(t.shape,t.seats,t.flipped).forEach((p,i)=>{
      const cx=p.x+12.5,cy=p.y+12.5;
      svg+=`<rect x="${cx-12.5}" y="${cy-12.5}" width="25" height="25" rx="5" fill="${t.assignments[i]?'#dce8ff':'white'}" stroke="#8c9aaa"/><text x="${cx}" y="${cy+4}" text-anchor="middle" font-family="Arial" font-size="10">${i+1}</text>${t.assignments[i]?`<text x="${cx+p.dx*25}" y="${cy+p.dy*25+4}" text-anchor="${p.dx<-.2?'end':p.dx>.2?'start':'middle'}" font-family="Arial" font-size="10">${escapeHtml(t.assignments[i])}</text>`:''}`;
    });
    svg+='</g>';
  });
  svg+='</svg>';
  const image=new Image();
  image.onload=()=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(image,0,0);c.toBlob(blob=>download('seatery-chart.png',blob,'image/png'))};
  image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
};
const saved=localStorage.getItem('seatery-project');if(saved)try{Object.assign(state,JSON.parse(saved))}catch{}setZoom(1);render();
