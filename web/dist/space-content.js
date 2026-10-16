// Display layout is deliberately schematic: these are NOT ephemerides or spacecraft orbits.
export const bodies = [
  {
    id: "sun",
    name: "Sun",
    radius: 3,
    orbit: 0,
    angle: 0,
    model: "sun",
    kind: "OUR STAR",
    description:
      "The Sun powers our planetary system. Its light contains many wavelengths, including the infrared light that SPHEREx measures.",
    source: "https://science.nasa.gov/sun/",
  },
  {
    id: "mercury",
    name: "Mercury",
    radius: 0.38,
    orbit: 6,
    angle: 0.6,
    model: "mercury",
    kind: "ROCKY WORLD",
    description:
      "The smallest major planet and the closest to the Sun. This NASA model is an educational surface visualization.",
    source: "https://science.nasa.gov/mercury/",
  },
  {
    id: "venus",
    name: "Venus",
    radius: 0.72,
    orbit: 9,
    angle: 2.6,
    texture: "venus",
    kind: "ROCKY WORLD",
    description:
      "A rocky planet wrapped in a dense atmosphere. This published planetary map is contextual; its colors are not SPHEREx measurements.",
    source: "https://science.nasa.gov/venus/",
  },
  {
    id: "earth",
    name: "Earth",
    radius: 0.8,
    orbit: 13,
    angle: 5.4,
    texture: "earth",
    kind: "OUR HOME WORLD",
    description:
      "SPHEREx surveys the infrared sky from Earth orbit. Explore this textured globe as planetary context, then visit the observatory to learn how its measurements are made.",
    source: "https://science.nasa.gov/earth/",
  },
  {
    id: "mars",
    name: "Mars",
    radius: 0.55,
    orbit: 17,
    angle: 3.9,
    texture: "mars",
    kind: "ROCKY WORLD",
    description:
      "Iron minerals help give Mars its reddish appearance. This NASA/JPL planetary map is a contextual surface visualization, not a live view.",
    source: "https://science.nasa.gov/mars/",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    radius: 1.75,
    orbit: 24,
    angle: 1.1,
    texture: "jupiter",
    kind: "GAS GIANT",
    description:
      "The largest planet in our solar system. Its bands trace the structure of its atmosphere. The displayed size and separation are compressed for exploration.",
    source: "https://science.nasa.gov/jupiter/",
  },
  {
    id: "saturn",
    name: "Saturn",
    radius: 1.65,
    orbit: 32,
    angle: 3.2,
    model: "saturn",
    kind: "RINGED GAS GIANT",
    description:
      "Explore the rings and globe in NASA’s reusable Saturn model. Their geometry is contextual; this scene does not calculate ring illumination or a current ephemeris.",
    source: "https://science.nasa.gov/saturn/",
  },
  {
    id: "uranus",
    name: "Uranus",
    radius: 1.15,
    orbit: 40,
    angle: 5.7,
    model: "uranus",
    kind: "ICE GIANT",
    description:
      "Uranus is an ice giant with an unusually tilted rotation axis. The model is a visual introduction, not a physical simulation of its atmosphere or orientation.",
    source: "https://science.nasa.gov/uranus/",
  },
  {
    id: "neptune",
    name: "Neptune",
    radius: 1.1,
    orbit: 48,
    angle: 2,
    texture: "neptune",
    kind: "ICE GIANT",
    description:
      "Neptune is the outermost major planet. The NASA/JPL map helps show its appearance; no live position or weather is implied.",
    source: "https://science.nasa.gov/neptune/",
  },
  {
    id: "moon",
    name: "Moon",
    radius: 0.35,
    orbit: 0,
    angle: 0,
    texture: "moon",
    kind: "EARTH’S NATURAL SATELLITE",
    description:
      "The Moon’s cratered surface preserves a long impact history. Its distance from Earth is enlarged here so you can select it easily.",
    source: "https://science.nasa.gov/moon/",
  },
];
export const hardware = {
  spherex: {
    name: "SPHEREx",
    kind: "THE INFRARED OBSERVATORY",
    description:
      "Three nested photon shields and reflective radiators help keep the telescope cold. A single fixed solar panel supplies power. Inspect the components, then enter a genuine infrared observation.",
    source:
      "https://www.jpl.nasa.gov/press-kits/spherex/mission-overview/spacecraft/",
    credit:
      "Original SKYSHIFT educational model, informed by NASA/JPL spacecraft references. Artistic visualization; not an engineering digital twin.",
  },
  "webb-b": {
    name: "James Webb Space Telescope",
    kind: "INFRARED OBSERVATORY",
    description:
      "Explore a reusable NASA model of Webb. Its mirror and sunshield support detailed infrared observations. This contextual model supplies no SPHEREx science pixels.",
    source:
      "https://science.nasa.gov/3d-resources/james-webb-space-telescope-b/",
    credit: "Model: NASA/Christopher R. Meaney · NASA 3D Resources.",
  },
  hubble: {
    name: "Hubble Space Telescope",
    kind: "ORBITING OBSERVATORY",
    description:
      "Hubble studies the universe across ultraviolet, visible and near-infrared wavelengths. Orbit this official downloadable model; it is educational context, not a SPHEREx observation.",
    source: "https://science.nasa.gov/3d-resources/hubble-space-telescope-a/",
    credit: "Model: NASA/Goddard Space Flight Center · NASA 3D Resources.",
  },
};
export const components = {
  shields: {
    name: "Photon shields",
    description:
      "Three nested cones block unwanted light and heat from the Sun and Earth. The exterior of the outer shield is white; reflective inner surfaces help reject heat.",
  },
  radiators: {
    name: "V-groove radiators",
    description:
      "Nested reflective surfaces help radiate heat into space. Keeping the telescope cold prevents its own infrared glow from overwhelming faint cosmic light.",
  },
  telescope: {
    name: "Telescope aperture",
    description:
      "The actual telescope uses three mirrors and a 20-centimetre effective primary aperture. The internal optical path is not reproduced in this model.",
  },
  panel: {
    name: "Fixed solar panel",
    description:
      "A single fixed solar panel provides electrical power. The reference dimensions are 2.67 × 1.02 metres; cell pattern and mounting details here are illustrative.",
  },
  bus: {
    name: "Spacecraft bus",
    description:
      "The bus contains computers, communications and pointing-control equipment. Small fittings and internal hardware are simplified in this educational visualization.",
  },
};
export function fieldVector(ra, dec, radius = 25) {
  const a = (ra * Math.PI) / 180,
    d = (dec * Math.PI) / 180;
  return [
    radius * Math.cos(d) * Math.cos(a),
    radius * Math.sin(d),
    -radius * Math.cos(d) * Math.sin(a),
  ];
}
export function bodyPosition(body) {
  return [
    Math.cos(body.angle) * body.orbit,
    0,
    Math.sin(body.angle) * body.orbit,
  ];
}
