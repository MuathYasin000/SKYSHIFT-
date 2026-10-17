// Educational copy is separate from calibrated observations and suitability decisions.
export const stories = {
  m42: {
    name:'The Orion Nebula',kind:'Star-forming nebular region',constellation:'Orion',
    short:'A single infrared view into a region of gas and young stars. This cutout covers part of the nebula.',
    story:'The Orion Nebula is a star-forming region in Orion. This is one real SPHEREx exposure of part of it, at a much coarser resolution than familiar Hubble photographs. The displayed light can include both stars and extended emission; individual sources are not identified here.',
    look:'Tap a bright or faint part of the image to inspect its measured wavelength. Hatched areas are excluded measurements, not empty space.',
    caution:'Several measurements near the bright centre are excluded by quality checks. The hatched areas are missing usable data, not nebular structure. No time comparison has been validated here.',
    source:'https://science.nasa.gov/asset/hubble/the-orion-nebula-handout/'
  },
  m101: {
    name: 'The Pinwheel Galaxy', kind: 'Spiral galaxy', constellation: 'Ursa Major',
    short: 'A galaxy seen almost face-on. Our small infrared view explores its bright central region.',
    story: 'M101 is a spiral galaxy: a vast system of stars, gas and dust. This SPHEREx cutout covers part of its central region and does not show the galaxy’s full spiral structure.',
    look: 'Start with the bright central glow. Zoom in, then inspect the prepared pixels to see how much detail the telescope actually recorded.',
    caution: 'A bright patch is measured light, not an automatically identified star or a discovery.',
    source: 'https://science.nasa.gov/photojournal/m-101-the-pinwheel-galaxy/'
  },
  m67: {
    name: 'Around the M67 star cluster', kind: 'Open-cluster outskirts', constellation: 'Cancer',
    short: 'A field near a group of stars born together. Explore the points of infrared light around its outskirts.',
    story: 'M67 is an open cluster, a loosely bound group of stars. Our curated field sits near its outskirts. Some points of light may be foreground or background objects; this viewer does not establish cluster membership.',
    look: 'Look for bright and faint points in this one exposure. Notice the hatched areas: they are excluded data, not empty areas of space.',
    caution: 'Different brightness within one picture does not tell us that an object changed over time.',
    source: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-67/'
  },
  ngc188: {
    name: 'The NGC 188 region', kind: 'Open-cluster region', constellation: 'Cepheus',
    short: 'A star-cluster region near the north celestial pole. Explore a real infrared exposure of this northern field.',
    story: 'NGC 188 is an open cluster in Cepheus, close to the north celestial pole. A cluster groups stars with a shared origin, but proximity on this image alone does not prove that a particular source belongs to it.',
    look: 'Explore the spread of light across the frame. Try a different brightness setting while keeping the measured pixels unchanged.',
    caution: 'We offer one curated exposure here. A supported time comparison is not available.',
    source: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-caldwell-catalog/caldwell-1/'
  }
};

export function availability(field) {
  const limited = field.comparison_status === 'provisional_restricted';
  if(field.comparison_status==='unavailable')return {limited:false,label:'Single-exposure exploration',action:'Explore this exposure',explanation:'No time comparison has been validated for this field. Explore this real exposure; a single image cannot establish change over time.',technical:'Temporal screening and independent source registration have not been performed for this single-exposure context.'};
  if(!limited&&field.comparison_status!=='incompatible_tested_pairs')return {limited:false,label:'Time comparison unavailable',action:'Inspect available exposure',explanation:'No supported time comparison is available for this field. Inspect its source records and suitability status before drawing conclusions.',technical:'No eligible curated temporal pair declared.'};
  return {
    limited,
    label: limited ? 'Limited time comparison' : 'Single-exposure exploration',
    action: limited ? 'Explore, then compare a small area' : 'Explore this exposure',
    explanation: limited
      ? 'Two dates can be inspected in a small, wavelength-screened M101 area. The larger image stays single-exposure only. Qualified scientific review is still pending.'
      : 'The tested wider pairs measured infrared light that differed too much for our comparison screen. You can explore a real exposure, but cannot use those pairs to infer change.',
    technical: limited ? 'Restricted engineering-screened pair; scientific approval PENDING.' : 'All tested wider pairs failed the wavelength screen; no temporal comparison offered.'
  };
}

export function friendlyDate(utc, time = false) {
  const date = new Date(utc);
  if (!Number.isFinite(date.getTime())) throw Error('Invalid observation time');
  const day = new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(date);
  return time ? `${day} · ${date.toISOString().slice(11,19)} UTC` : day;
}

export const help = {
  infrared: ['What is infrared light?', 'Infrared is light our eyes cannot see. SPHEREx records its intensity. The grayscale or false colors on this screen help display one band of infrared light; they are not the colors you would see with your eyes.'],
  wavelength: ['Why does the kind of light matter?', 'Wavelength describes a kind of light. SPHEREx records slightly different wavelengths across an image. A change between two pictures could come from that difference instead of a change in the sky. Our screen limits the mismatch, but does not prove identical response.'],
  mask: ['Why are there hatched gaps?', 'Neutral dark hatching marks pixels excluded by quality checks or lacking usable coverage. Those gaps do not mean the sky is empty. Comparison notes must sit in an area with usable data on both dates.'],
  pixels: ['Why can the image look blocky?', 'The comparison contains only 24 × 24 prepared pixels, sampled at 6.15 arcseconds per pixel. A larger area failed the wavelength screen. Smooth display interpolation changes appearance only; it adds no measured detail.'],
  review: ['What does pending scientific review mean?', 'Software checks and source records are available. A qualified astronomical reviewer has not yet approved the interpretation of this pair. You can inspect it and save questions, but it does not establish motion, brightness variability or a discovery.'],
  stretch: ['What do brightness controls change?', 'The controls map measured intensity to screen brightness. Faint-light settings make weaker structure easier to see. Both dates always share the same limits and transform. These controls do not change the data or establish that an object brightened.'],
  notes: ['What am I saving?', 'A comparison ZIP keeps your sky-coordinate notes, scientific data references, prepared images, settings and checksums. Open it again in SKYSHIFT to restore your view. Notes stay in this tab until exported; no note is uploaded to a server.']
};
