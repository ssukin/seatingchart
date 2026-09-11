// Small no-build enhancement for rectangular-table orientation.
// It intentionally lives separately so the core app remains easy to upload.
const flipObserver = new MutationObserver(() => {
  const modal = document.querySelector('.modal');
  if (!modal || modal.querySelector('#flip-table')) return;
  const numberInput = modal.querySelector('#modal-number');
  const table = numberInput && state.tables.find(t => t.number === Number(numberInput.value));
  if (!table || table.shape !== 'rectangle') return;
  const button = document.createElement('button');
  button.id = 'flip-table';
  button.className = 'button secondary';
  button.style.marginTop = '12px';
  button.textContent = 'Flip orientation';
  numberInput.closest('.form-row').after(button);
  button.onclick = () => {
    table.flipped = !table.flipped;
    closeModal();
    render();
    openTable(table.id);
  };
});
flipObserver.observe(document.body, { childList: true, subtree: true });

const originalRender = render;
render = function enhancedRender() {
  originalRender();
  document.querySelectorAll('.table-object.rectangle').forEach(el => {
    const table = state.tables.find(t => t.id === el.dataset.id);
    if (table && table.flipped) {
      el.style.transform = 'rotate(90deg)';
      el.style.transformOrigin = '115px 65px';
    }
  });
};
