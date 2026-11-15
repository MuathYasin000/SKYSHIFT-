// Native adaptation of Vengeance UI's MIT Kinetic Text Loader.
// Source and license: vendor/ui-patterns/sources.json and Vengeance-LICENSE.txt.
const loadingWord = /\bloading\b/i;
const busyText = /^(?:opening|preparing|checking|decoding|reading|downloading|verifying)\b/i;
const busyTarget = '[role="status"], [aria-live], button, #mission-model-status';
const alwaysBusy = '.viewer-loading strong, .instrument-loading strong, #universe-loading h2';
const excluded = 'script, style, noscript, code, pre, textarea, option, .kinetic-text-loader, [data-kinetic-ignore]';

export function createKineticLoader(label = 'Loading', doc = document) {
  const loader = doc.createElement('span');
  loader.className = 'kinetic-text-loader';
  // Keep the original status text and accessible name intact. Decorative glyphs
  // use CSS content, so textContent consumers never receive duplicate letters.
  const readable = doc.createElement('span');
  readable.className = 'ktl-label';
  readable.textContent = label;
  const visual = doc.createElement('span');
  visual.className = 'ktl-visual';
  visual.setAttribute('aria-hidden', 'true');
  for (const [index, character] of [...'Loading'].entries()) {
    const glyph = doc.createElement('span');
    glyph.className = 'ktl-letter' + (index === 0 ? ' ktl-bounce' : index === 4 ? ' ktl-stretch' : '');
    glyph.dataset.letter = index === 4 ? 'ı' : character;
    visual.append(glyph);
  }
  const dot = doc.createElement('span');
  dot.className = 'ktl-dot';
  visual.append(dot);
  loader.append(readable, visual);
  return loader;
}

export function installKineticLoaders(root = document.body) {
  const doc = root.ownerDocument;
  function enhanceText(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest(excluded)) return;
    const text = node.data;
    const match = loadingWord.exec(text);
    if (match) {
      const before = text.slice(0, match.index), after = text.slice(match.index + match[0].length);
      node.replaceWith(doc.createTextNode(before), createKineticLoader(match[0], doc), doc.createTextNode(after));
    } else if (text.trim() && (parent.matches(alwaysBusy) ||
      (parent.matches(busyTarget) && busyText.test(text.trim())))) {
      // Some existing busy states say "Checking" or "Opening" instead of Loading.
      // Preserve that useful detail below/beside the shared loader.
      if (!parent.querySelector('.kinetic-text-loader')) {
        const loader = createKineticLoader('Loading ', doc);
        loader.classList.add('ktl-prefixed');
        parent.insertBefore(loader, node);
      }
    }
  }
  function scan(node) {
    if (node.nodeType === 3) { enhanceText(node); return; }
    if (node.nodeType !== 1 || node.closest(excluded)) return;
    const walker = doc.createTreeWalker(node, 4);
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach(enhanceText);
  }
  scan(root);
  const observer = new MutationObserver(records => {
    // Disconnect only for our synchronous decoration to avoid observing our
    // own glyphs. Existing controller updates are always handled afresh.
    observer.disconnect();
    for (const record of records) {
      if (record.type === 'characterData') scan(record.target);
      else record.addedNodes.forEach(scan);
    }
    observe();
  });
  function observe() { observer.observe(root, { childList: true, characterData: true, subtree: true }); }
  observe();
  return () => observer.disconnect();
}

if (typeof document !== 'undefined' && document.body) installKineticLoaders();
