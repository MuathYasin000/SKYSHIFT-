// Educational mission descriptions, not live pointing, simulated measurements,
// or matched multi-instrument observations. Images retain their native identity.
export const telescopeStories = {
  spherex: {
    short: "SPHEREx",
    color: "#8cd9db",
    position: [0, 0, 0],
    verb: "Map the infrared sky",
    band: "102 infrared colors",
    summary:
      "A surveyor of the whole sky. SPHEREx records infrared light through filters that vary across its detectors.",
    steps: [
      [
        "Collect light",
        "Nearly parallel light from a distant on-axis source enters the cooled telescope inside the shields. The shields block unwanted light and heat; they do not focus the beam. The shown direction follows the illustrative model’s aperture, not measured flight pointing.",
      ],
      [
        "Separate wavelengths",
        "Linear variable filters transmit different wavelengths at different positions. Moving the survey across the sky builds measurements in 102 infrared colors. This drawing groups colors for explanation; it is not a prism inside SPHEREx.",
      ],
      [
        "Explore a real exposure",
        "Choose one of the four supplied fields and inspect its actual calibrated pixels, wavelength information, exclusions and original archive references.",
      ],
    ],
    source:
      "https://www.jpl.nasa.gov/press-kits/spherex/mission-overview/spacecraft/",
    image: "./assets/spherex-all-sky.jpg",
    imageId: "spherex-all-sky",
    imageLabel: "SPHEREx first all-sky infrared composite · May–December 2025",
    credit: "NASA/JPL-Caltech",
    imageSource:
      "https://www.jpl.nasa.gov/images/pia26600-spherexs-first-all-sky-map/",
  },
  "webb-b": {
    short: "Webb",
    color: "#e9bd73",
    position: [-6.7, 0.3, -2.8],
    verb: "Look deeper in infrared",
    band: "Near- & mid-infrared",
    summary:
      "A large, cold mirror gathers faint light for detailed infrared images and spectra. Its sunshield keeps heat away from the instruments.",
    steps: [
      [
        "Gather faint light",
        "Light arrives at the exposed gold primary mirror from the observing side, above the sunshield. The external rays stay parallel until the mirror. Internal reflections are explained separately; this is not an optical ray trace or live pointing.",
      ],
      [
        "Choose an instrument",
        "NIRCam images near-infrared light; MIRI reaches longer infrared wavelengths. Different instruments and filters answer different questions. This is not a simulated filter applied to a photograph.",
      ],
      [
        "See a published result",
        "Explore Webb’s First Deep Field, an official NIRCam composite of SMACS 0723. It is a representative published image, not a live feed or the same target as our Hubble/SPHEREx examples.",
      ],
    ],
    source:
      "https://science.nasa.gov/mission/webb/science-overview/science-explainers/webbs-scientific-instruments/",
    image: "./assets/webb-deep-field.webp",
    imageId: "webb-deep-field",
    imageLabel:
      "Webb’s First Deep Field · NIRCam composite · published 11 July 2022",
    credit: "NASA, ESA, CSA, STScI",
    imageSource:
      "https://science.nasa.gov/asset/webb/webbs-first-deep-field-unveiled-nircam-image/",
  },
  hubble: {
    short: "Hubble",
    color: "#b6b9ed",
    position: [6.7, 0.3, -2.8],
    verb: "Discover light beyond our eyes",
    band: "Ultraviolet · visible · near-infrared",
    summary:
      "Above Earth’s atmosphere, Hubble gathers ultraviolet, visible and near-infrared light to reveal the structure of stars and galaxies.",
    steps: [
      [
        "Gather starlight",
        "Light enters the open tube from its front, travels to the primary mirror, then reflects toward the secondary and through the primary’s central opening to the instruments. The 3D rays show incoming direction only, not Hubble’s field of view or current pointing.",
      ],
      [
        "Reveal different light",
        "Cameras and spectrographs record selected parts of the spectrum. Hubble can study ultraviolet and visible light as well as near-infrared light. Display colors depend on the published filters and processing.",
      ],
      [
        "See a published result",
        "Explore the official Hubble mosaic of M101. Its scale, resolution, filters and acquisition differ from the small SPHEREx cutouts; it is context, not an aligned temporal comparison.",
      ],
    ],
    source:
      "https://science.nasa.gov/mission/hubble/science/science-behind-the-discoveries/wavelengths/",
    image: "./assets/m101-hubble-context.jpg",
    imageId: "m101-hubble-context",
    imageLabel: "M101 · published Hubble mosaic · contextual image",
    credit: "NASA, ESA and the Hubble Heritage Team (STScI/AURA)",
    imageSource:
      "https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-101/",
  },
};
export const observingColors = [
  "#ae9ce8",
  "#7dbbe6",
  "#84cbbd",
  "#e7cf79",
  "#e8a875",
  "#db8581",
];
