/* A shared frame picker for both archive routes. Arrow keys move through the
   available dates. Enter or Space chooses a frame and returns to the trigger. */
export function createFramePicker({dialog, list, title, close, frames, selection, choose, thumbnail, discard, label}) {
  let trigger;
  close.onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    trigger?.focus();
    list.querySelectorAll('canvas').forEach(discard);
    list.replaceChildren();
  });
  list.addEventListener('keydown', event => {
    const index = [...list.children].indexOf(document.activeElement);
    const next = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: list.children.length - 1,
      PageDown: index + 5,
      PageUp: index - 5,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    focusOption(list.children[Math.max(0, Math.min(list.children.length - 1, next))]);
  });

  function focusOption(option) {
    if (!option) return;
    list.querySelector('[tabindex="0"]')?.setAttribute('tabindex', '-1');
    option.tabIndex = 0;
    option.focus({preventScroll:true});
    option.scrollIntoView({block:'nearest'});
  }

  return function open(side, source) {
    const selected = selection(side);
    title.textContent = 'Choose frame ' + side.slice(-1).toUpperCase();
    trigger = source;
    const options = [...frames()];
    if (side === 'frame-b') options.unshift(['', null]);
    let initial;
    list.replaceChildren(...options.map(([id, frame]) => {
      const option = document.createElement('button');
      const name = document.createElement('span');
      option.type = 'button';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(id === selected));
      option.tabIndex = -1;
      option.dataset.sound = 'date';
      name.textContent = frame ? label(frame) : 'Clear frame B';
      if (frame) option.append(thumbnail(frame));
      option.append(name);
      if (id === selected) initial = option;
      option.onclick = () => {
        choose(side, id);
        dialog.close();
      };
      return option;
    }));
    dialog.showModal();
    focusOption(initial ?? list.firstElementChild);
  };
}
