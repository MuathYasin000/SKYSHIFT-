import { decodeArray, intensity } from './science.js';
import { displayLimits } from './observations-render.js';
import { friendlyDate } from './field-guide.js';

async function readJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error('Could not load the cached preview.');
  return response.json();
}

async function firstCachedFrame(id) {
  const index = await readJSON(`./data/observation-targets/${id}/preview-8.json`);
  const selected = new Set(index.preview_frame_urls);
  const row = index.observations.find(observation => selected.has(observation.frame_url));
  if (index.target_id !== id || index.field_arcmin !== 8 || !row) throw Error('No matching cached preview.');
  const frame = await readJSON(row.frame_url);
  if (frame.dataset_kind !== 'real' || frame.archive_id !== row.observation_id ||
      frame.release !== row.release || frame.detector !== row.detector ||
      frame.archive_source_url !== row.access_url) {
    throw Error('The cutout does not match the archive record.');
  }
  return frame;
}

function paintCutout(canvas, frame) {
  const SCI = decodeArray(frame.arrays.SCI);
  const VALID = decodeArray(frame.arrays.VALID);
  const [height, width] = frame.shape;
  const {background, lower, upper} = displayLimits({arraysDecoded:{SCI,VALID}}, {subtract:true});
  const display = {vmin:lower, vmax:upper, stretch:'asinh', asinh_a:.06};
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(width, height);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const src = row * width + col;
      if (!VALID[src] || !Number.isFinite(SCI[src])) continue;
      const i = ((height - 1 - row) * width + col) * 4;
      const gray = intensity(SCI[src] - background, display);
      pixels.data.set([gray, gray, gray, 255], i);
    }
  }
  context.putImageData(pixels, 0, 0);
}

export async function installChallengeFields({gallery, filter, suggestions, status, retry, template}) {
  const cards = new Map();
  const observer = new IntersectionObserver(entries => {
    for (const {isIntersecting, target} of entries) {
      if (!isIntersecting) continue;
      observer.unobserve(target);
      loadPreview(target);
    }
  }, {rootMargin:'240px'});

  async function loadPreview(card) {
    const image = card.querySelector('.field-image');
    const feedback = card.querySelector('.field-image-status');
    try {
      const frame = await firstCachedFrame(card.dataset.target);
      paintCutout(card.querySelector('canvas'), frame);
      image.dataset.previewReady = 'true';
      feedback.hidden = true;
      const date = card.querySelector('time');
      date.dateTime = frame.time_start_utc;
      date.textContent = friendlyDate(frame.time_start_utc);
      card.querySelector('.field-band').textContent = ` · ${frame.release.toUpperCase()} · D${frame.detector}` +
        (Number.isFinite(frame.wavelength_center_um) ? ` · ${frame.wavelength_center_um.toFixed(3)} µm${frame.target?.valid ? '' : ' nominal'}` : '');
      card.querySelector('.field-mask').hidden = frame.target?.valid === true;
      const source = card.querySelector('.field-source');
      source.href = frame.archive_source_url;
      source.title = frame.archive_id;
      source.hidden = false;
    } catch {
      feedback.textContent = 'Cached image unavailable. Open Compare to view this target.';
    }
  }

  function updateFilter() {
    const query = filter.value.trim().toLowerCase();
    let count = 0;
    for (const [card, name] of cards) {
      card.hidden = !name.includes(query);
      if (!card.hidden) count++;
    }
    status.textContent = query ? (count ? `${count} of ${cards.size} challenge targets` : 'No challenge targets match this filter.') : '';
  }

  async function loadTargets() {
    retry.hidden = true;
    try {
      const {targets} = await readJSON('./observations-targets.json');
      for (const {id, name} of targets) {
        const card = template.content.firstElementChild.cloneNode(true);
        card.dataset.target = id;
        card.querySelector('h3').textContent = name;
        card.querySelector('.field-compare').href = `./compare.html?${new URLSearchParams({target:id})}`;
        card.querySelector('.field-source').setAttribute('aria-label', `IRSA archive source for ${name}`);
        cards.set(card, `${id} ${name}`.toLowerCase());
        gallery.append(card);
        suggestions.append(new Option(name, name));
        observer.observe(card);
      }
      updateFilter();
    } catch {
      status.textContent = 'Could not load challenge targets. Use the target links above or try again.';
      retry.hidden = false;
    }
  }

  filter.addEventListener('input', updateFilter);
  retry.addEventListener('click', loadTargets);
  await loadTargets();
}
