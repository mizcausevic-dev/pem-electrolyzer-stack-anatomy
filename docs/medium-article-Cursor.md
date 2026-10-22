<!--
EDITOR PACKAGE (not part of the published body)

SEO title (51 chars):      How a PEM Electrolyzer Stack Works, in 1,020 Frames
Medium headline:           How a PEM Electrolyzer Stack Works, Shown in 1,020 Deterministic Frames
Medium subtitle:           I built a code-driven anatomy explainer that walks from the membrane to the balance of plant. Here is the mechanism, the build, and the rules that keep it honest.
Meta description (154):    A frame-exact, code-built explainer of a generic PEM electrolyzer stack: MEA, water feed, gas evolution, cooling and balance of plant, with DOE chemistry.
Slug:                      how-a-pem-electrolyzer-stack-works-1020-frames
Medium tags (5):           Hydrogen, Electrolysis, Clean Energy, Data Visualization, TypeScript
Canonical (if cross-posting): https://mizcausevic-dev.github.io/pem-electrolyzer-stack-anatomy/
Primary query intent:      "how does a PEM electrolyzer work" (informational), secondary "deterministic code animation" (developer)

Hero image:   public/media/hero-Cursor.png (1920x1080)
              live: https://mizcausevic-dev.github.io/pem-electrolyzer-stack-anatomy/media/hero-Cursor.png
Hero alt:     Sectional view of a generic PEM electrolyzer stack with labeled water inlet, hydrogen outlet, oxygen and water outlet, DC power and membrane electrode assembly.

Inline images (upload in order; alt text and captions are in the body):
  1. media/still-F0140-Cursor.png
  2. media/still-F0262-Cursor.png
  3. media/still-F0420-Cursor.png
  4. media/still-F0640-Cursor.png
  5. media/still-F1019-Cursor.png

Evidence grading used below:
  Verified  = stated on the cited U.S. DOE page
  Derived   = follows arithmetically from a verified statement
  Practice  = common engineering practice, not sourced here; verify before reuse
  Measured  = measured on the build machine; scope stated next to the number
-->

# How a PEM Electrolyzer Stack Works, Shown in 1,020 Deterministic Frames

### I built a code-driven anatomy explainer that walks from the membrane to the balance of plant. Here is the mechanism, the build, and the rules that keep it honest.

![Sectional view of a generic PEM electrolyzer stack with labeled water inlet, hydrogen outlet, oxygen and water outlet, DC power and membrane electrode assembly.](https://mizcausevic-dev.github.io/pem-electrolyzer-stack-anatomy/media/hero-Cursor.png)
*A generic PEM stack, cut at its mid-plane. Cyan marks the primary pathway, gold marks energy, violet marks sensing. Illustrative schematic; layer thickness is exaggerated.*

I built a 34-second explainer of a generic proton exchange membrane (PEM) electrolyzer stack entirely in TypeScript and the browser's Canvas 2D API. Every one of its 1,020 frames is a pure function of its frame number, so any frame can be deep-linked, reviewed and tested on its own. It follows one causal chain in five camera moves: the membrane electrode assembly and plates, the water feed, gas evolution, cooling, and the balance of plant. The chemistry comes from the U.S. Department of Energy. Everything else is labeled either as common practice or as an illustrative choice.

**Watch it:** [live player](https://mizcausevic-dev.github.io/pem-electrolyzer-stack-anatomy/) · **Read the code:** [GitHub](https://github.com/mizcausevic-dev/pem-electrolyzer-stack-anatomy) · **Jump to the reaction:** [frame 420](https://mizcausevic-dev.github.io/pem-electrolyzer-stack-anatomy/?frame=420)

This piece covers the mechanism first, then the build decisions, then the tests that make a motion graphic reviewable like software.

## What a PEM electrolyzer does, in four steps

An electrolyzer uses electricity to split water into hydrogen and oxygen. The DOE describes the PEM variant this way: "the electrolyte is a specialized, solid plastic material that only allows hydrogen ions (protons) to pass through it." [1]

The mechanism runs in four steps, all from the same DOE page [1]:

1. **Anode.** Applied DC voltage splits water into oxygen, protons and electrons: `2H₂O → O₂ + 4H⁺ + 4e⁻`.
2. **Membrane.** Protons cross the membrane toward the cathode.
3. **External circuit.** Electrons cannot cross the membrane, so they travel through the external circuit, driven by the applied voltage.
4. **Cathode.** Protons and electrons recombine into hydrogen gas: `4H⁺ + 4e⁻ → 2H₂`.

Add the two half-reactions and you get the overall reaction, `2H₂O → 2H₂ + O₂`. The DOE also notes that PEM electrolyzers "typically operate at relatively low temperatures, about 70°C–90°C." [1] That range is the only physical value in the entire animation, and it is attributed on screen.

## The anatomy of one repeating cell

A stack is the same sandwich repeated many times, wired in series between two end plates. Reading one cell from the anode side to the cathode side:

| Layer | What it does | Typical material (practice, verify before reuse) |
| --- | --- | --- |
| Bipolar plate | Separates neighboring cells, carries current to the next cell, holds the flow channels | Coated titanium |
| Anode flow channel | Delivers water and carries oxygen plus water away | Formed in the plate |
| Porous transport layer | Spreads water to the catalyst, lets oxygen escape, conducts electrons | Sintered titanium |
| Anode catalyst layer | Where water is oxidized | Iridium oxide |
| Membrane | Conducts protons only and keeps the two gases apart | Perfluorosulfonic acid (PFSA) polymer |
| Cathode catalyst layer | Where hydrogen forms | Platinum on carbon |
| Gas diffusion layer | Carries hydrogen out and conducts electrons | Carbon paper |
| Cathode flow channel | Carries hydrogen to the cathode manifold | Formed in the next plate |

The catalyst-coated membrane plus the two transport layers is the membrane electrode assembly (MEA). The explainer draws eight cells and says so on screen, because real stacks vary and a cell count is exactly the kind of specification it should not imply.

## Five camera moves, one causal chain

The brief fixed the timing to the frame: 0–149, 150–299, 300–509, 510–749 and 750–1019. Each stage gets one deliberate camera move, and none of them cuts away from the stage before it. The cut face that opens chapter 01 is the same surface the water fills in chapter 02, and the same water carries heat out in chapter 04.

| Frames | Time | Chapter | What the camera does |
| --- | --- | --- | --- |
| 0–149 | 0–5 s | MEA and plates | Orbits the exterior while a section plane sweeps through, then squares up to the cut and pushes into one cell |
| 150–299 | 5–10 s | Water feed | Drops to the anode inlet manifold, then rises with the water up one channel |
| 300–509 | 10–17 s | Gas evolution | Pulls back for power-on, pushes from 2.3× to 44× into the catalyst layers, returns to the channels |
| 510–749 | 17–25 s | Cooling | Trucks out to the water loop and heat exchanger |
| 750–1019 | 25–34 s | Balance of plant | Pulls back to the complete system and holds |

### 01. MEA and plates

A section plane sweeps through the stack, and the removed half stays on screen as a dashed ghost outline. Nothing is disassembled. A stack runs clamped under compression by its tie rods, so an exploded view would show a state the hardware never operates in. The camera rotates square to the cut and pushes into one cell, naming each layer as it arrives.

![Close sectional view of one PEM cell with callouts for bipolar plate, anode flow channel, porous transport layer, anode catalyst layer, membrane, cathode catalyst layer, gas diffusion layer and cathode flow channel.](https://mizcausevic-dev.github.io/pem-electrolyzer-stack-anatomy/media/still-F0140-Cursor.png)
*Frame 140. One cell, every layer named. The badge in the corner reads SCALE · LAYER THICKNESS EXAGGERATED.*

### 02. Water feed

Deionized water enters the anode inlet manifold, which feeds every cell in parallel, then rises through each anode channel and soaks through the porous titanium layer toward the catalyst. The cathode side gets no liquid feed in this generic anode-feed configuration, and the label says exactly that. The fill runs faster than real time, so a TIME COMPRESSED badge stays up for the whole stage.

![Section through several cells showing cyan water rising in the anode channels and wetting the porous transport layer.](https://mizcausevic-dev.github.io/pem-electrolyzer-stack-anatomy/media/still-F0262-Cursor.png)
*Frame 262. Water reaches the catalyst through the porous transport layer. Dashed streamlines show direction only, not speed.*

### 03. Gas evolution

DC power comes on and gold dashes trace electrons leaving the anode end and returning at the cathode end. The camera then pushes to 44× into the catalyst layers. At that scale, every event is a schematic: two water molecules in, one O₂ molecule plus four protons and four electrons out at the anode, then four protons and four electrons back together as two H₂ molecules at the cathode. One water molecule rides across with the protons, a common description of electro-osmotic drag. A boxed equation panel highlights each half-reaction as it plays.

![Catalyst-layer schematic showing water molecules entering the anode catalyst, protons crossing the membrane, electrons in gold and hydrogen molecules leaving the cathode catalyst, with a boxed half-reaction diagram below.](https://mizcausevic-dev.github.io/pem-electrolyzer-stack-anatomy/media/still-F0420-Cursor.png)
*Frame 420. Schematic event timing, labeled SLOW MOTION. The scale jump is labeled SCALE CHANGE · CATALYST LAYER, NOT TO SCALE.*

Back at channel scale, hydrogen bubbles appear at twice the oxygen rate with the same size distribution. That ratio is the one quantitative relationship the animation shows, and it is derived directly from the DOE half-reactions.

### 04. Cooling

Losses inside each cell show up as heat in the membrane electrode region. I drew this as a field, not hardware: a translucent gold gradient with dashed isotherms and a FIELD tag, with no values. The circulating anode water carries that heat out to a heat exchanger. Temperature sensors at the stack inlet and outlet let a controller trim the cooling, which is shown as an explicitly labeled schematic loop.

![The stack section beside its water loop: circulation pump, heat exchanger, heat rejection circuit and violet temperature sensors at the stack inlet and outlet.](https://mizcausevic-dev.github.io/pem-electrolyzer-stack-anatomy/media/still-F0640-Cursor.png)
*Frame 640. The temperature field is qualitative. The only number on screen is the DOE operating range, with its source.*

### 05. Balance of plant

The camera pulls back until the stack is one block in a larger system. Components appear in causal order: power conversion, then water treatment, oxygen and water separation, hydrogen separation and purification, pressure control, and the control system. The last 60 frames hold the camera and every label still, so the final frame works as a reference diagram.

![Complete-system schematic: AC supply and rectifier above the stack, water treatment, oxygen separator, pump and heat exchanger on the left, hydrogen separator, purification and pressure control valve on the right, with a sensor key.](https://mizcausevic-dev.github.io/pem-electrolyzer-stack-anatomy/media/still-F1019-Cursor.png)
*Frame 1019. Stable complete-system view, labeled SCHEMATIC · COMPONENTS NOT TO SCALE.*

## Why build it in code instead of a 3D package

The deciding requirement was reviewability. A technical explainer gets checked by engineers, and they need to point at frame 392 and say "that arrow is wrong." When the renderer is a pure function of the frame index, that conversation turns into a diff:

- **Any frame is addressable.** `?frame=392` renders that exact frame in the browser, every time.
- **The player, the MP4 and the stills share one code path.** The headless renderer calls the same `renderFrame()` the player does.
- **Labels are data.** Captions, badges and callouts live in typed arrays with start and end frames, so a copy edit is a one-line change with a reviewable history.
- **It is testable.** More on that below.

The trade-off is real. There is no physically based lighting, every shape is hand-authored, and Canvas 2D runs on the CPU in a headless browser. Across three benchmark runs on the build machine, the median frame took about 10 ms to draw and the worst took about 47 ms, past the 33 ms budget for one frame at 30 fps. That does not matter for the offline MP4, but on that hardware real-time playback would likely stutter for a frame at the heaviest moments. For an explainer whose value is accuracy rather than photorealism, I accepted that.

## Three rules that keep a technical animation honest

**1. Label every distortion.** Each time the explainer departs from reality, a badge says how. It exaggerates layer thickness so the catalyst layers are visible. It jumps scale for the catalyst view, slows the reaction events down and compresses the fill and thermal response. And it uses a section view instead of disassembly. All of those are labeled.

**2. Give hardware, fields and math different visual grammars.** Hardware is solid with hatched cut faces. Fields are translucent with dashed contours and a FIELD tag. Equations sit in boxed, gridded, monospace panels. A viewer should never mistake a temperature gradient for a part, or a reaction diagram for a photograph.

**3. Do not show a number you cannot source.** The animation has no efficiency figures, no current densities, no cell voltages and no output rates. The one physical value on screen is attributed to the DOE. The one ratio it animates, 2 H₂ to 1 O₂, falls straight out of the DOE half-reactions.

The color system supports rule 2. Cyan `#00E5FF` is the primary pathway, gold `#FFD166` is energy or actuation, and violet `#9D4EDD` is sensing or a state change. Oxygen gets a neutral tint, so the by-product never competes with the pathway. The legend on screen states plainly that these are explanatory overlays, not literal emission.

## How the determinism works

The whole renderer has one entry point:

```ts
/**
 * Renders one frame onto a 1920x1080 context. The output depends only on the
 * frame index: no clocks, no stored state, no unseeded randomness.
 */
export function renderFrame(ctx: CanvasRenderingContext2D, frame: number, opts: RenderOptions = {}): void {
```

The camera is a keyframe table eased with a cubic curve. Two details make the moves feel deliberate rather than mechanical:

```ts
const t = easeInOutCubic(clamp((f - a.f) / (b.f - a.f)));
const zoom = Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), t));
// Screen offset of the destination under the start camera shrinks linearly to zero.
const sx = (b.tx - a.tx) * a.zoom * (1 - t);
const sy = (b.ty - a.ty) * a.zoom * (1 - t);
return { tx: b.tx - sx / zoom, ty: b.ty - sy / zoom, zoom, /* ... */ };
```

Interpolating zoom in log space gives a constant perceived speed. A linear zoom from 2.3× to 44× would appear to lunge at the start and crawl at the end, because each added unit of zoom matters less the closer you already are. Solving the pan in screen space keeps the destination on a straight line toward the center of the frame, instead of swinging sideways while the zoom changes.

Textures such as titanium grains, catalyst particles and carbon fibers come from a seeded generator, so they are identical every time. Bubble timing comes from a hash of the cell index and bubble number. That is also where the stoichiometry lives:

```ts
bubbleField(ctx, f, k, anodeChanX(k), 26, 1.25, /* ... O2 */);
bubbleField(ctx, f, k, cathodeChanX(k), 13, 1.3, /* ... H2 */);
```

An oxygen bubble spawns every 26 frames per channel and a hydrogen bubble every 13, so the spawn counts stay at 2:1 for the whole chapter.

## Testing an animation like software

The test suite uses Node's built-in test runner against the real renderer. A recording context stands in for the canvas and folds every draw call and state change into a hash:

```ts
test('render order does not matter: no hidden state carries between frames', () => {
  const fresh = new Map(SAMPLES.map((f) => [f, hashFrame(f).digest]));
  const shuffled = [...SAMPLES].reverse();
  for (const f of shuffled) {
    hashFrame((f * 7919) % (LAST_FRAME + 1));
    assert.equal(hashFrame(f).digest, fresh.get(f), `frame ${f} changed after rendering other frames`);
  }
});
```

Other tests confirm that the chapter boundaries match the brief exactly and that the camera never cuts. The largest per-frame zoom step is 0.19 in log space, about 21% at the deepest push-in. No frame pans the view by more than 64 pixels. One more test checks that the last two seconds hold the same camera and the same annotation layer. It guards a bug that visual QA caught on the final frame: the closing caption, note and scale badge used to fade out at the very end, so the "stable" ending was not stable.

## Measured results

| Measurement | Result | Scope |
| --- | --- | --- |
| Frames | 1,020 at 30 fps, 34.000 s | Probed from the MP4 with ffprobe |
| Draw time per frame | mean 12.6–12.9 ms, p95 20.5–21.5 ms, worst 46.6–47.2 ms | Three runs, headless Chrome, 4 vCPU Intel Xeon, software canvas |
| Full MP4 render | 72.9 s for 1,020 frames | Same machine, PNG capture plus libx264 |
| MP4 file | 18.96 MB, 1920×1080, H.264 | crf 20, slow preset |
| Canvas calls per frame | 1,523 to 66,892 | Counted with a recording context |
| Player bundle | 58.15 kB of JavaScript, 20.39 kB gzipped | Vite production build |
| Tests | 15 passing | `npm test` |

These numbers describe this build on this machine. They are not a performance claim about any device you might run it on.

## What this explainer does not claim

| Statement | Grade |
| --- | --- |
| Solid polymer electrolyte that conducts only protons | Verified [1] |
| Anode and cathode half-reactions | Verified [1] |
| Electrons travel through the external circuit | Verified [1] |
| PEM electrolyzers typically operate at about 70–90 °C | Verified [1] |
| Hydrogen forms at twice the molar rate of oxygen | Derived from [1] |
| Plate, transport layer, catalyst and membrane materials | Practice, verify before reuse |
| Electro-osmotic drag, heat from overpotentials and ohmic losses, balance-of-plant components | Practice, shown qualitatively |
| Camera moves, palette, cutaways, layer thickness, timing | Illustrative choice |

It is a generic configuration, not a specific commercial product, and not a certified design or simulation result.

## Reusing it in other verticals

The engine does not know it is drawing an electrolyzer. Underneath, it is a camera keyframe table, a section plane, a layer table and timed overlays.

- **PEM fuel cell:** the same layer stack and plates running the reverse reaction, with hydrogen and oxygen in, and water, heat and DC power out. Mostly the flows and captions change.
- **Alkaline, AEM and solid oxide electrolyzers:** swap the layer table and the half-reactions, which are on the same DOE page.
- **Beyond hydrogen:** battery cells, heat exchangers, filtration membranes, or any product where a cut-away view plus a labeled flow path explains the value faster than a spec sheet.

## FAQ

**What is a PEM electrolyzer?**
A device that uses DC electricity to split water into hydrogen and oxygen across a solid polymer membrane that conducts only protons. [1]

**What are the anode and cathode reactions in a PEM electrolyzer?**
Anode: `2H₂O → O₂ + 4H⁺ + 4e⁻`. Cathode: `4H⁺ + 4e⁻ → 2H₂`. [1]

**What temperature do PEM electrolyzers run at?**
The DOE gives about 70–90 °C as typical. [1]

**What is the membrane electrode assembly (MEA)?**
The catalyst-coated membrane together with the porous transport layer on the anode side and the gas diffusion layer on the cathode side. It is where the reactions happen.

**Why does a PEM electrolyzer make twice as much hydrogen as oxygen?**
Each O₂ molecule formed at the anode releases four electrons, and four electrons at the cathode form two H₂ molecules. That fixes a 2:1 molar ratio.

**What is the balance of plant?**
Everything around the stack that makes it work as a system: power conversion, water treatment and circulation, heat rejection, gas and water separation, hydrogen purification, pressure control and the control system.

**Can I reuse the code?**
Yes. It is MIT licensed. Swap the geometry, layer table and captions for your own subject.

## Sources

[1] U.S. Department of Energy, Hydrogen and Fuel Cell Technologies Office. *Hydrogen Production: Electrolysis.* https://www.energy.gov/eere/fuelcells/hydrogen-production-electrolysis

[2] U.S. Department of Energy. *Hydrogen Production.* https://www.energy.gov/eere/fuelcells/hydrogen-production (pathway overview, used as the brief's mechanism reference)

---

Open the [player at frame 420](https://mizcausevic-dev.github.io/pem-electrolyzer-stack-anatomy/?frame=420), step through one reaction event with the arrow keys, and check it against the DOE equations above. Then fork the [repo](https://github.com/mizcausevic-dev/pem-electrolyzer-stack-anatomy) and swap the layer table for the product you need to explain.

*Built by Miz Causevic at [Kinetic Gain](https://kineticgain.com). This explainer is an illustrative schematic based on a consolidated working brief, not engineering, safety or design guidance.*
