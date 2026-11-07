(async () => {
  const note = document.querySelector('#session-note');
  note.value = '我，我都唔知點解我會去';
  note.dispatchEvent(new Event('input', { bubbles: true }));
  const mode = document.querySelector('#run-mode-select');
  mode.value = 'pomodoro';
  mode.dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelector('.start-button').click();
  await new Promise((r) => setTimeout(r, 1200));
  return {
    mode: document.querySelector('.widget').dataset.mode,
    state: document.querySelector('.widget').dataset.state,
    time: document.querySelector('#time-display').textContent,
    label: document.querySelector('#timer-label').textContent,
    status: document.querySelector('#timer-status').textContent,
    note: document.querySelector('#timer-note').textContent,
    noteHidden: document.querySelector('#timer-note').hidden,
    extendHidden: document.querySelector('#extend-row').hidden,
    inner: [innerWidth, innerHeight]
  };
})()
