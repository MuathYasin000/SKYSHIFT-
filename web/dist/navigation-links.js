// Shared by static chrome and tests; preserve native modified/new-tab clicks.
export function pageName(pathname) {
  const name=pathname.replace(/\/+$/, '').split('/').pop().replace(/\.html$/i, '') || 'index';
  if(pathname.endsWith('/')&&!['index','explore','compare','discover','methodology','guide','classic-home'].includes(name))return 'index';
  return name;
}
export function isPlainLinkClick(event, anchor) {
  return !event.defaultPrevented && event.button === 0 &&
    !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey &&
    !anchor.hasAttribute('target') && !anchor.hasAttribute('download');
}
export function navigationRoute(pathname, hash) {
  const name=pageName(pathname);
  return name==='index' ? hash.slice(1).split('/')[0] || 'home' :
    ({explore:'observations',compare:'compare',discover:'discover',methodology:'methodology'})[name] || '';
}
