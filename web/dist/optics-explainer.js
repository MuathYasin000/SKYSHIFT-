// Original teaching diagrams based on linked NASA optics descriptions. Layout,
// angles and lengths are schematic; no focal lengths or ray-traced performance.
export const opticalLessons = {
  spherex: [
    [
      "Collect",
      "Light enters the small cooled telescope inside the photon shields. The shields reject unwanted light and heat; they are not the collecting mirror.",
    ],
    [
      "Reflect",
      "Three mirrors deliver the image to the focal-plane optics. Their actual surface shapes and positions are not reconstructed here.",
    ],
    [
      "Split",
      "A dichroic separates the light into two detector paths; this is not a prism spreading colors into a rainbow fan.",
    ],
    [
      "Measure",
      "Six detector arrays use linear variable filters. Wavelength changes with detector position; repeated sky coverage builds 102 spectral channels.",
    ],
  ],
  "webb-b": [
    [
      "Primary",
      "Nearly parallel light from a distant on-axis target reaches the 18-segment primary mirror from its exposed observing side.",
    ],
    [
      "Secondary",
      "The primary reflects light toward the secondary mirror in front of it. The incoming bundle does not focus in empty space before the primary.",
    ],
    [
      "Aft optics",
      "The secondary directs light into the aft optics, including the tertiary and fine-steering mirrors. This inset simplifies their geometry.",
    ],
    [
      "Instruments",
      "The instruments behind the primary record images or spectra. The sunshield blocks heat; it does not collect the astronomical beam.",
    ],
  ],
  hubble: [
    [
      "Aperture",
      "Light enters the open end of the tube. The solar arrays supply power and are not the light-collecting aperture.",
    ],
    [
      "Primary",
      "Light travels down the tube to the large primary mirror at the rear.",
    ],
    [
      "Secondary",
      "The primary reflects light back toward the smaller secondary mirror near the front.",
    ],
    [
      "Instruments",
      "The secondary sends light back through the central opening in the primary toward the scientific instruments.",
    ],
  ],
};
const opticalSources = {
  spherex:
    "https://www.jpl.nasa.gov/press-kits/spherex/mission-overview/spacecraft/",
  "webb-b":
    "https://science.nasa.gov/mission/webb/optical-telescope-element-ote/",
  hubble: "https://science.nasa.gov/mission/hubble/observatory/design/optics/",
};
function graphic(mission, step, prefix) {
  const marker = prefix + "-arrow",
    common = `<defs><marker id="${marker}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>`;
  let paths = [],
    hardware = "",
    labels = "";
  if (mission === "hubble") {
    hardware =
      '<path d="M120 50H365V185H120" class="optics-outline"/><path d="M330 65Q355 88 338 103M338 127Q355 152 330 170" class="optics-mirror"/><path d="M185 98Q174 115 185 132" class="optics-mirror"/><rect x="405" y="93" width="58" height="44" rx="6" class="optics-detector"/>';
    paths = [
      "M20 75H120 M20 155H120",
      "M120 75H330 M120 155H330",
      "M330 75L185 115 M330 155L185 115",
      "M185 115H405",
    ];
    labels =
      '<text x="18" y="40">Space</text><text x="120" y="211">Open tube</text><text x="148" y="88">Secondary</text><text x="290" y="40">Primary</text><text x="381" y="166">Instruments</text>';
  } else if (mission === "webb-b") {
    hardware =
      '<path d="M310 55Q333 77 319 102M319 128Q333 157 310 177" class="optics-mirror"/><path d="M178 96Q167 115 178 134" class="optics-mirror"/><rect x="355" y="95" width="34" height="42" rx="3" class="optics-detector"/><rect x="418" y="95" width="55" height="42" rx="6" class="optics-detector"/><path d="M124 187L380 187" class="optics-outline"/>';
    paths = [
      "M20 65H310 M20 165H310",
      "M310 65L178 115 M310 165L178 115",
      "M178 115H355 M355 115L369 128L382 115",
      "M389 115H418",
    ];
    labels =
      '<text x="18" y="38">Space</text><text x="135" y="83">Secondary</text><text x="275" y="38">Primary</text><text x="342" y="160">Aft optics</text><text x="402" y="83">Instruments</text><text x="161" y="215">Sunshield / heat protection</text>';
  } else {
    hardware =
      '<rect x="95" y="81" width="121" height="68" rx="8" class="optics-outline"/><rect x="259" y="92" width="41" height="46" rx="5" class="optics-detector"/><path d="M330 65H458V90H330z M330 155H458V180H330z" class="optics-detector"/><path d="M369 65V90 M410 65V90 M369 155V180 M410 155V180" class="optics-outline"/>';
    paths = [
      "M18 115H95",
      "M105 125L135 95L162 130L205 115",
      "M216 115H280 M280 115L330 78 M280 115L330 168",
      "M335 78H450 M335 168H450",
    ];
    labels =
      '<text x="16" y="74">Sky</text><text x="104" y="66">3 mirrors</text><text x="244" y="70">Dichroic</text><text x="330" y="47">Filters + detectors</text><text x="100" y="191">Cooled telescope</text><text x="329" y="209">2 banks / 6 arrays</text>';
  }
  return `<svg viewBox="0 0 490 230" role="img" aria-label="${mission === "webb-b" ? "Webb" : mission === "hubble" ? "Hubble" : "SPHEREx"} schematic light collection; path ${step + 1} of 4. Not to scale or ray traced">${common}${hardware}<g class="optics-labels">${labels}</g>${paths.map((d, i) => `<path d="${d}" class="optics-path ${i === step ? "current" : ""}" marker-end="url(#${marker})"/>`).join("")}</svg>`;
}
export function createOpticsExplainer(root) {
  root.innerHTML =
    '<details class="optics-details"><summary>Trace light inside the telescope</summary><figure id="optics-figure"></figure><div class="optics-trace-controls"><button id="optics-next">Follow light →</button><button id="optics-expand">Expand diagram ↗</button></div><p id="optics-step-description" role="status"></p><p class="optics-diagram-limit">Original simplified diagram · not to scale · not an optical ray trace</p></details><dialog id="optics-dialog" class="space-dialog" aria-labelledby="optics-dialog-title"><div class="dialog-top"><h2 id="optics-dialog-title">How the light reaches the instruments</h2><button id="optics-dialog-close" aria-label="Close optics diagram">×</button></div><div id="optics-expanded"></div><p id="optics-expanded-description" role="status"></p><button id="optics-dialog-next">Follow light →</button><p>Original simplified diagram. Actual mirror shapes, separations and field angles are not simulated.</p></dialog>';
  const $ = (id) => root.querySelector("#" + id);
  let mission = "spherex",
    step = 0;
  function draw() {
    const text = `${step + 1} / 4 · ${opticalLessons[mission][step].join(" — ")}`;
    $("optics-figure").innerHTML = graphic(mission, step, "inline");
    $("optics-step-description").textContent = text;
    $("optics-next").textContent =
      "Next: " + opticalLessons[mission][(step + 1) % 4][0] + " →";
    $("optics-dialog-next").textContent = $("optics-next").textContent;
    $("optics-expanded").innerHTML = graphic(mission, step, "expanded");
    $("optics-expanded-description").textContent = text;
    for (const host of [
      root.querySelector(".optics-diagram-limit"),
      $("optics-dialog").lastElementChild,
    ]) {
      // Trusted mission source only; no runtime request until the visitor opens it.
      let link = host.querySelector("a");
      if (!link) {
        link = document.createElement("a");
        link.textContent = "NASA optical design ↗";
        link.target = "_blank";
        link.rel = "noreferrer";
        host.append(document.createElement("br"), link);
      }
      link.href = opticalSources[mission];
    }
  }
  $("optics-next").onclick = () => {
    step = (step + 1) % 4;
    draw();
  };
  $("optics-dialog-next").onclick = $("optics-next").onclick;
  $("optics-expand").onclick = () => $("optics-dialog").showModal();
  $("optics-dialog-close").onclick = () => $("optics-dialog").close();
  return {
    set(id, stage) {
      mission = id;
      step = 0;
      root.hidden = stage === 2;
      root.querySelector("details").open = stage === 1;
      draw();
    },
    close() {
      if ($("optics-dialog").open) $("optics-dialog").close();
    },
  };
}
