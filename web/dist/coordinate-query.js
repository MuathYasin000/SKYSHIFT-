// Explicit units: decimal values are degrees; sexagesimal RA is hours.
export function parseCoordinate(value, axis) {
  if (!['ra', 'dec'].includes(axis)) throw Error('Unknown coordinate axis.');
  const text = String(value).trim().replaceAll('−', '-');
  let degrees;
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) degrees = Number(text);
  else {
    const pattern = axis === 'ra'
      ? /^(\d{1,2})h(\d{1,2})m(\d{1,2}(?:\.\d*)?)s$/i
      : /^([+-]?\d{1,2})d(\d{1,2})m(\d{1,2}(?:\.\d*)?)s$/i;
    const parts = text.match(pattern) || text.match(/^([+-]?\d{1,2})[:\s]+(\d{1,2})[:\s]+(\d{1,2}(?:\.\d*)?)$/);
    if (!parts || (axis === 'ra' && /^[+-]/.test(parts[1])))
      throw Error('Use decimal degrees, or ' + (axis === 'ra' ? '08h55m10.831s.' : '-07d14m42.53s.'));
    const first = Math.abs(Number(parts[1])), minutes = Number(parts[2]), seconds = Number(parts[3]);
    if (minutes >= 60 || seconds >= 60 || (axis === 'ra' && first >= 24) ||
        (axis === 'dec' && (first > 90 || (first === 90 && (minutes || seconds)))))
      throw Error('Coordinate components are outside their valid ranges.');
    degrees = (first + minutes / 60 + seconds / 3600) * (axis === 'ra' ? 15 : 1);
    if (parts[1].startsWith('-')) degrees = -degrees;
  }
  if (!Number.isFinite(degrees) || (axis === 'ra' ? degrees < 0 || degrees >= 360 : Math.abs(degrees) > 90))
    throw Error(axis === 'ra' ? 'RA must be at least 0 and less than 360 degrees.' : 'Declination must be between -90 and +90 degrees.');
  return degrees;
}

export function observationRequest({ra, dec, fov, release = 'qr3'}) {
  if (String(fov).trim() === '' || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(fov).trim()))
    throw Error('Enter a field width between 1 and 30 arcminutes.');
  const width = Number(fov);
  if (!Number.isFinite(width) || width < 1 || width > 30) throw Error('Field width must be between 1 and 30 arcminutes.');
  if (!['qr2', 'qr3'].includes(release)) throw Error('Choose a supported SPHEREx release.');
  return {schema_version: '1.0', kind: 'skyshift-observation-request', release,
    region: {ra_deg: parseCoordinate(ra, 'ra'), dec_deg: parseCoordinate(dec, 'dec'), size_deg: width / 60, frame: 'icrs'}};
}

export function requestFromURL(url) {
  const p = new URL(url).searchParams;
  if (!['ra', 'dec', 'fov', 'release', 'detector'].some(key => p.has(key))) return null;
  for (const key of ['ra', 'dec', 'fov', 'release', 'detector','selection','wavelength','start','end','frames','deep']) if (p.getAll(key).length > 1) throw Error('Duplicate sky search parameters are ambiguous.');
  const request=observationRequest({ra: p.get('ra') ?? '', dec: p.get('dec') ?? '', fov: p.get('fov') ?? '12', release: p.get('release') ?? 'qr3'});
  if(p.has('detector')){if(!/^[1-6]$/.test(p.get('detector')))throw Error('Invalid wavelength group.');request.detector=Number(p.get('detector'));}
  if(p.has('frames')){if(!/^[1-6]$/.test(p.get('frames')))throw Error('Choose between one and six observations.');request.max_frames=Number(p.get('frames'));}
  if(p.has('deep')){if(p.get('deep')!=='1')throw Error('Deep collection must be explicitly selected.');request.deep=true;}
  Object.assign(request,selectionOptions({selection:p.get('selection')||'compatible',wavelength:p.get('wavelength')||'',start:p.get('start')||'',end:p.get('end')||''}));
  return request;
}

export function selectionOptions({selection='compatible',wavelength='',start='',end=''}) {
  if(!['compatible','chronological'].includes(selection))throw Error('Choose matching wavelengths or chronological browsing.');
  const result={};
  if(selection!=='compatible')result.selection=selection;
  if(String(wavelength).trim()) {
    const number=Number(wavelength);
    if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(wavelength))||!Number.isFinite(number)||number<.75||number>5)throw Error('Wavelength must be between 0.75 and 5 micrometres.');
    result.wavelength_um=number;
  }
  for(const [key,value] of [['start_date',start],['end_date',end]])if(value) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw Error('Use a valid UTC calendar date.');
    result[key]=value;
  }
  if(start&&end&&start>end)throw Error('Start date must not follow end date.');
  return result;
}

export function requestURL(request, base) {
  const url = new URL(base);
  url.search = '';
  const r = request.region;
  for (const [key, value] of Object.entries({ra: r.ra_deg, dec: r.dec_deg, fov: r.size_deg * 60, release: request.release})) url.searchParams.set(key, value);
  if(request.detector)url.searchParams.set('detector',request.detector);
  if(request.deep===true)url.searchParams.set('deep','1');
  if(request.max_frames!==undefined){if(!Number.isInteger(request.max_frames)||request.max_frames<1||request.max_frames>6)throw Error('Choose between one and six observations.');url.searchParams.set('frames',request.max_frames);}
  if(request.selection&&request.selection!=='compatible')url.searchParams.set('selection',request.selection);
  if(request.wavelength_um!=null)url.searchParams.set('wavelength',request.wavelength_um);
  if(request.start_date)url.searchParams.set('start',request.start_date);
  if(request.end_date)url.searchParams.set('end',request.end_date);
  url.hash = 'sky-search';
  return url.href;
}

export function archiveURL(request) {
  const r = request.region, url = new URL('https://irsa.ipac.caltech.edu/applications/spherex/');
  // The archive takes a circular radius; enclose the requested square's corners.
  for (const [key, value] of Object.entries({api: 'spectral-images', ra: r.ra_deg, dec: r.dec_deg, sr: r.size_deg / Math.sqrt(2) + 'd'})) url.searchParams.set(key, value);
  return url.href;
}

export function nearbyFields(request, catalogue) {
  const rad = Math.PI / 180, r = request.region;
  // Centres only. Catalogued widths are not measured coverage or usable masks.
  return catalogue.fields.map(field => {
    const a = (field.dec_deg - r.dec_deg) * rad / 2, b = (field.ra_deg - r.ra_deg) * rad / 2;
    const h = Math.sin(a) ** 2 + Math.cos(r.dec_deg * rad) * Math.cos(field.dec_deg * rad) * Math.sin(b) ** 2;
    return {field, separation_deg: 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h)))) / rad};
  }).filter(item => item.separation_deg <= (item.field.size_deg + r.size_deg) / Math.sqrt(2))
    .sort((a, b) => a.separation_deg - b.separation_deg);
}
