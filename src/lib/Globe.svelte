<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import * as topojson from "topojson-client";

  let width = window.innerWidth;
  let height = window.innerHeight;
  let svg: SVGSVGElement | null = null;
  let gr: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  let world: any;

  // --- 1. STATE MANAGEMENT (The "Source of Truth") ---
  // We keep the rotation angles in a variable, not hidden inside the projection
  let rotation = [0, 0]; 
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startRotation = [0, 0];
  let lastInteractionTime = 0;
  
  // Stars for background
  let stars: { x: number; y: number; size: number; baseOpacity: number }[] = [];

  // Projection setup
  let projection = d3.geoOrthographic()
    .scale(Math.min(width, height) / 2 - 20)
    .translate([width / 2, height / 2])
    .clipAngle(90);

  const pathGen = d3.geoPath().projection(projection);

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

  async function loadWorld() {
    const topoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";
    const topoData = await d3.json(topoUrl) as any;
    world = topoData ? topojson.feature(topoData, topoData.objects.countries) : null;
  }

  function createGlobe() {
    if (!svg || !world) return;
    
    // Clean up any existing groups (for resize)
    d3.select(svg).selectAll("g").remove();
    
    gr = d3.select(svg).append("g");

    // Ocean
    gr.append("path")
      .datum({ type: "Sphere" })
      .attr("class", "ocean")
      .attr("d", (d: any) => pathGen(d))
      .attr("fill", "#1e3fbc")
      .attr("stroke", "#0d2b45")
      .attr("stroke-width", 2);

    // Countries
    gr.selectAll(".country")
      .data(world.features)
      .join("path")
      .attr("class", "country")
      .attr("d", (d: any) => pathGen(d))
      .attr("fill", "#d3d3d3")
      .attr("stroke", "#555555")
      .attr("stroke-width", 0.5);
  }

  function animate() {
    if (!isDragging && (Date.now() - lastInteractionTime > 10000)) {
      rotation[0] += 0.000001; // Speed
    }

    projection.rotate(rotation as [number, number, number?]);

    if (gr) {
      gr.selectAll("path").attr("d", (d: any) => pathGen(d));
    }

    d3.select(".starfield").selectAll("circle")
      .data(stars) 
      .attr("cx", (d) => {
        const xOffset = rotation[0] * 0.5; 
        const drift = 0; 
        let val = (d.x + xOffset + drift) % width;
        return val < 0 ? val + width : val;
      });

    requestAnimationFrame(animate);
  }

  function handleMouseDown(e: MouseEvent) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startRotation = [...rotation]; 
    lastInteractionTime = Date.now();
    if(svg) svg.style.cursor = "grabbing";
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    rotation[0] = startRotation[0] + dx * 0.5;
    rotation[1] = startRotation[1] - dy * 0.5;
    
    // Clamp latitude to prevent flipping
    rotation[1] = Math.max(-90, Math.min(90, rotation[1]));

    lastInteractionTime = Date.now(); 
  }

  function handleMouseUp() {
    isDragging = false;
    lastInteractionTime = Date.now(); // Reset timer on release
    if(svg) svg.style.cursor = "grab";
  }

  onMount(async () => {
    generateStarfield();
    await loadWorld();
    createGlobe();

    if (svg) {
      svg.addEventListener("mousedown", handleMouseDown);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    // Handle Resize
    window.addEventListener("resize", () => {
      width = window.innerWidth;
      height = window.innerHeight;
      projection
        .scale(Math.min(width, height) / 2 - 20)
        .translate([width / 2, height / 2]);
      createGlobe();
      //generateStarfield();
    });

    // Start the Loop
    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
  });
</script>

<div class="globe-container">
  <svg class="starfield" width={width} height={height}>
    {#each stars as star (star.x + star.y)}
      <circle
        class="star"
        cx={star.x}
        cy={star.y}
        r={star.size}
        fill="white"
        style="opacity: {star.baseOpacity}; --opacity: {star.baseOpacity};"
      />
    {/each}
  </svg>

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
    /* Use the CSS variable defined in the inline style */
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