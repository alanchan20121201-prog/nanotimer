(() => {
  const selectors = {
    widget: '.widget',
    titlebar: '.titlebar',
    brand: '.brand',
    viewTitle: '.view-title',
    setupControls: '.setup-controls',
    preset: '[data-preset-select]',
    language: '.setup-controls .language-select',
    background: '#background-button',
    runModeRow: '.run-mode-row',
    runModeLabel: '.run-mode-label',
    runModeSelect: '.run-mode-select',
    timeFields: '.time-fields',
    timeField: '.time-field',
    timeInput: '.time-input',
    noteField: '.note-field',
    noteHead: '.note-head',
    noteInput: '.note-input',
    form: '.timer-form',
    actions: '.form-actions',
    start: '.start-button',
    export: '.export-button',
    message: '.form-message',
    statusbar: '.statusbar',
    footerStatus: '#footer-status',
    dragNote: '.drag-note'
  };
  const out = {};
  for (const [name, selector] of Object.entries(selectors)) {
    const el = document.querySelector(selector);
    if (!el) { out[name] = null; continue; }
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out[name] = {
      x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2),
      bottom: +r.bottom.toFixed(2), right: +r.right.toFixed(2),
      display: cs.display, gap: cs.gap, marginTop: cs.marginTop, marginBottom: cs.marginBottom,
      paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, flex: cs.flex,
      overflow: cs.overflow, fontSize: cs.fontSize, lineHeight: cs.lineHeight
    };
  }
  const widget = document.querySelector('.widget').getBoundingClientRect();
  const overflow = [];
  for (const el of document.querySelectorAll('.view--setup *')) {
    const r = el.getBoundingClientRect();
    if (r.height === 0) continue;
    if (r.bottom > widget.bottom - 1 || r.right > widget.right - 1 || r.left < widget.left + 1) {
      overflow.push({ cls: el.className || el.tagName, right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1) });
    }
  }
  return { widget: { x: widget.x, y: widget.y, w: widget.width, h: widget.height }, out, overflow, scrollHeight: document.querySelector('.view--setup').scrollHeight, clientHeight: document.querySelector('.view--setup').clientHeight };
})()
