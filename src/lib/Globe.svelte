<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import * as topojson from "topojson-client";

  let width = window.innerWidth;
  let height = window.innerHeight;
  let svg: SVGSVGElement | null = null;
  let gr: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  let world: any;

  // Stars for background
  let stars: { x: number; y: number; size: number; baseOpacity: number }[] = [];

  // Projection & path
  let projection = d3.geoOrthographic()
    .scale(Math.min(width, height) / 2 - 20)
    .translate([width / 2, height / 2])
    .clipAngle(90);

  const pathGen = d3.geoPath().projection(projection);

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

  // Load world map
  async function loadWorld() {
    const topoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";
    const topoData = await d3.json(topoUrl) as any;
    world = topoData ? topojson.feature(topoData, topoData.objects.countries) : null;
  }

  function createGlobe() {
    if (!svg || !world) return;
    gr = d3.select(svg).append("g");

    // Ocean background (full visible hemisphere)
    gr.append("path")
      .datum({ type: "Sphere" })
      .attr("class", "ocean")
      .attr("d", (d: any) => pathGen(d))
      .attr("fill", "#1e3fbc") // deep blue
      .attr("stroke", "#0d2b45")
      .attr("stroke-width", 2)
      .lower();

    // Countries
    gr.selectAll(".country")
      .data(world.features)
      .join("path")
      .attr("class", "country")
      .attr("d", (d: any) => pathGen(d))
      .attr("fill", "#d3d3d3") // light grey land
      .attr("stroke", "#555555")
      .attr("stroke-width", 0.5);
  }

  // Update globe paths on rotation/zoom
  function updateGlobe() {
    if (!gr) return;
    gr.selectAll("path").attr("d", (d: any) => pathGen(d));
    updateStars();
  }

  // Stars move subtly with rotation
  function updateStars() {
    const rotate = projection.rotate()[0];
    const starfield = d3.select(".starfield");
    starfield.selectAll("circle")
      .attr("cx", (d: any) => (d.x + rotate * 0.2) % width)
      .attr("cy", (d: any) => d.y);
  }

  onMount(async () => {
    generateStarfield();
    await loadWorld();
    createGlobe();

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
      d3.select(svg).call(drag).call(zoom);
    }

    // Animate stars
    function animateStars() {
      stars.forEach(s => s.x = (s.x + 0.02) % width);
      updateStars();
      requestAnimationFrame(animateStars);
    }
    animateStars();

    // Handle resize
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
  <!-- Starfield background -->
  <svg class="starfield">
    {#each stars as star (star.x + star.y)}
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

  <!-- Globe -->
  <svg bind:this={svg} width={width} height={height} class="globe"></svg>
</div>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #000;
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

  .star {
    animation: twinkle 2s ease-in-out infinite;
  }

  @keyframes twinkle {
    0%,100% { opacity: var(--opacity, 1); }
    50% { opacity: calc(var(--opacity, 1) * 0.5); }
  }

  .globe {
    position: relative;
    width: 100%;
    height: 100%;
    z-index: 2;
    cursor: grab;
  }

  .globe:active {
    cursor: grabbing;
  }
</style>
