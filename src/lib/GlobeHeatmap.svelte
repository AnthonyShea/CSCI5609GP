<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import * as topojson from "topojson-client";

  let svg: SVGSVGElement | null = null;
  let gr: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  let world: any;
  let projection: d3.GeoProjection;
  let pathGen: d3.GeoPath<any, any>;
  let width = window.innerWidth;
  let height = window.innerHeight;

  // Heatmap CSV data
  let countryData: Map<string, { year: number, value: number }[]> = new Map();
  let selectedYear = 1960;
  let minYear = 1949;
  let maxYear = 1963;

  // Stars
  let stars: { x: number; y: number; size: number; baseOpacity: number }[] = [];

  // Color scale for heatmap
  const colorScale = d3.scaleSequential(d3.interpolateReds)
    .domain([0, 20]); // CO₂ per capita range (adjust as needed)

  // Load world
  async function loadWorld() {
    const topoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";
    const topoData = await d3.json(topoUrl) as any;
    world = topoData ? topojson.feature(topoData, topoData.objects.countries) : null;
  }

  // Load CSV data
  async function loadCSV() {
    const data = await d3.csv("/co2_per_capita.csv");
    countryData = new Map();

    data.forEach((d: any) => {
      const code = d.Code;
      const year = +d.Year;
      const value = +d["Annual CO₂ emissions (per capita)"];
      if (!countryData.has(code)) countryData.set(code, []);
      countryData.get(code)!.push({ year, value });
    });

    // Update min/max year dynamically
    const years = data.map(d => +d.Year);
    minYear = Math.min(...years);
    maxYear = Math.max(...years);
    selectedYear = minYear;
  }

  // Generate starfield
  function generateStarfield() {
    stars = [];
    for (let i = 0; i < 400; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.3,
        baseOpacity: Math.random() * 0.7 + 0.3
      });
    }
  }

  function createGlobe() {
    if (!svg || !world) return;
    gr = d3.select(svg).append("g");

    // Ocean
    gr.append("path")
      .datum({ type: "Sphere" })
      .attr("class", "ocean")
      .attr("d", pathGen)
      .attr("fill", "#1e3fbc")
      .attr("stroke", "#0d2b45")
      .attr("stroke-width", 2)
      .lower();

    // Countries
    gr.selectAll(".country")
      .data(world.features)
      .join("path")
      .attr("class", "country")
      .attr("d", pathGen)
      .attr("stroke", "#555555")
      .attr("stroke-width", 0.5);
  }

  function getClosestYearValue(code: string, year: number) {
    const data = countryData.get(code);
    if (!data) return 0;
    let closest = data[0];
    let minDiff = Math.abs(year - closest.year);
    for (const d of data) {
      const diff = Math.abs(d.year - year);
      if (diff < minDiff) {
        closest = d;
        minDiff = diff;
      }
    }
    return closest.value;
  }

  function updateStars() {
    const starfield = d3.select(".starfield");
    starfield.selectAll("circle")
      .attr("cx", (d: any) => d.x)
      .attr("cy", (d: any) => d.y);
  }

  function updateGlobe() {
    if (!gr) return;

    // Update countries fill based on heatmap
    gr.selectAll(".country")
      .attr("d", pathGen)
      .attr("fill", (d: any) => {
        const code = d.id || d.properties.iso_a3 || d.properties.name;
        const value = getClosestYearValue(code, selectedYear);
        return value ? colorScale(value) : "#d3d3d3"; // light grey if no data
      });
  }

  onMount(async () => {
    await loadWorld();
    await loadCSV();
    generateStarfield();

    width = window.innerWidth;
    height = window.innerHeight;

    projection = d3.geoOrthographic()
      .scale(Math.min(width, height) / 2 - 20)
      .translate([width / 2, height / 2])
      .clipAngle(90);

    pathGen = d3.geoPath().projection(projection);

    createGlobe();
    updateGlobe();

    // Drag rotation
    const drag = d3.drag<SVGSVGElement, unknown>()
      .on("drag", (event) => {
        const rotate = projection.rotate();
        projection.rotate([rotate[0] + event.dx * 0.5, rotate[1] - event.dy * 0.5]);
        updateGlobe();
      });

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 8])
      .on("zoom", (event) => {
        projection.scale((Math.min(width, height) / 2 - 20) * event.transform.k);
        updateGlobe();
      });

    if (svg) {
      d3.select<SVGSVGElement, unknown>(svg).call(drag).call(zoom);
    }

    // Animate stars
    function animateStars() {
      stars.forEach(s => s.x = (s.x + 0.02) % width);
      updateStars();
      requestAnimationFrame(animateStars);
    }
      animateStars();
  
      // Resize
      window.addEventListener("resize", () => {
        width = window.innerWidth;
        height = window.innerHeight;
        projection.translate([width / 2, height / 2])
          .scale(Math.min(width, height) / 2 - 20);
        generateStarfield();
        updateGlobe();
      });
    });
  </script>
  
  <div class="globe-container">
    <svg class="starfield">
      {#each stars as star}
        <circle
          class="star"
          cx={star.x}
          cy={star.y}
          r={star.size}
          fill="white"
          style="opacity: {star.baseOpacity}"
        />
      {/each}
    </svg>
  <!-- Year slider -->
  <div class="slider-container">
    <input
      type="range"
      min={minYear}
      max={maxYear}
      bind:value={selectedYear}
      on:input={updateGlobe}
    />
    <span>{selectedYear}</span>
  </div>
</div>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #000;
    font-family: sans-serif;
  }

  .globe-container {
    position: relative;
    width: 100vw;
    height: 100vh;
  }

  .starfield {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    pointer-events: none;
  }

  .slider-container {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 10px;
    color: white;
    background: rgba(0,0,0,0.5);
    padding: 8px 12px;
    border-radius: 6px;
  }

  input[type="range"] {
    width: 300px;
  }
</style>
