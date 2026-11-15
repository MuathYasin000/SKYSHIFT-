/* Tabs switch local panels immediately; arrow keys follow the visible order. */
export function installWorkbenchTabs(tablist, scroller) {
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));

  function select(tab) {
    tabs.forEach((item, index) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      panels[index].hidden = !active;
    });
    scroller.scrollTop = 0;
  }

  tablist.addEventListener('click', event => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) select(tab);
  });
  tablist.addEventListener('keydown', event => {
    const index = tabs.indexOf(event.target);
    if (index < 0) return;
    const destinations = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    const next = tabs[destinations[event.key]];
    if (!next) return;
    event.preventDefault();
    select(next);
    next.focus();
  });

  return select;
}
