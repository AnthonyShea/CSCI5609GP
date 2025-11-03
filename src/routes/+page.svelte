<script lang="ts">
  import * as d3 from "d3";
  import * as topojson from "topojson-client";
  import { onMount } from "svelte";

  // Reactive data store
  let emissionsData: { entity: string; code: string; year: number; value: number }[] = $state([]);

  // Name to ISO3 code map (built post-load for matching)
  let nameToCode: Map<string, string> = $state(new Map());

  // Store data grouped by country code for efficient lookup
  let countryData: Map<string, {year: number, value: number}[]> = $state(new Map());

  // Years range for slider
  let years: number[] = $derived(
    emissionsData.length > 0 ? [...new Set(emissionsData.map((d) => d.year))].sort((a, b) => a - b) : []
  );

  // Default to a safe year (updated post-load)
  let selectedYear: number = $state(1960);

  // Rotation state for interactivity
  let rotation: [number, number] = $state([0, 0]);
  let isDragging = $state(false);
  let startRotation: [number, number] = $state([0, 0]);
  let mouseStart: [number, number] = $state([0, 0]);
  
  // Auto-rotation control
  let autoRotationEnabled = $state(true);
  let lastInteractionTime = $state(0);
  const AUTO_ROTATION_RESUME_DELAY = 5000; // 5 seconds

  // Function to find closest year for a country
  function getClosestYearData(code: string, targetYear: number): number {
    if (!code || !countryData.has(code)) return 0;
    
    const countryYears = countryData.get(code)!;
    if (countryYears.length === 0) return 0;
    
    // Find the closest year
    let closest = countryYears[0];
    let minDiff = Math.abs(closest.year - targetYear);
    
    for (const data of countryYears) {
      const diff = Math.abs(data.year - targetYear);
      if (diff < minDiff) {
        minDiff = diff;
        closest = data;
      }
    }
    
    return closest.value;
  }

  // FIXED: Update visualization when year changes
  $effect(() => {
    const year = selectedYear;
    // Force visualization update when year changes
    if (world && nameToCode.size > 0 && gr) {
      updateViz();
    }
  });

  // Snap to latest year after data loads
  $effect(() => {
    if (years.length > 0 && selectedYear === 1960) {
      selectedYear = years[years.length - 1];
    }
  });

  // Globe dimensions
  const width = 500;
  const height = 400;
  const radius = Math.min(width, height) / 2 - 10;

  // D3 selections
  let svg: SVGSVGElement;
  let gr: d3.Selection<SVGGElement, any, any, any>;

  // Projection and rotation
  let projection = d3.geoOrthographic()
    .scale(radius)
    .translate([width / 2, height / 2])
    .clipAngle(90);

  let pathGen = d3.geoPath().projection(projection);

  // Color scale (0-20 tons CO2/person; adjust domain if your max differs)
  let color = d3.scaleSequential(d3.interpolateReds).domain([0, 20]);

  // World data
  let world: any;

  // Load CSV and build nameToCode map
  async function loadCsv() {
    try {
      const csvUrl = "./co-emissions-per-capita.csv";
      const rawData = await d3.csv(csvUrl);
      emissionsData = rawData.map((row) => ({
        entity: row.Entity || "",
        code: row.Code || "",
        year: Number(row.Year) || 0,
        value: Number(row["Annual CO₂ emissions (per capita)"]) || 0,
      }));

      // Build name -> code map (use first code per entity if duplicates)
      const tempMap = new Map<string, string>();
      const tempCountryData = new Map<string, {year: number, value: number}[]>();
      
      emissionsData.forEach((d) => {
        if (d.entity && d.code && !tempMap.has(d.entity)) {
          tempMap.set(d.entity, d.code);
        }
        
        // Group data by country code for efficient lookup
        if (d.code) {
          if (!tempCountryData.has(d.code)) {
            tempCountryData.set(d.code, []);
          }
          tempCountryData.get(d.code)!.push({ year: d.year, value: d.value });
        }
      });
      
      nameToCode = tempMap;
      countryData = tempCountryData;

      console.log("Loaded Emissions Data:", emissionsData.length, "rows");
      console.log("Country data samples:", Array.from(tempCountryData.entries()).slice(0, 3));
    } catch (error) {
      console.error("Error loading CSV:", error);
    }
  }

  // Load world topojson
  async function loadWorld() {
    try {
      const topoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";
      const topoData = await d3.json(topoUrl);
      world = topoData ? topojson.feature(topoData, topoData.objects.countries) : null;
      console.log("Loaded World Data:", world?.features.length, "countries");
    } catch (error) {
      console.error("Error loading World:", error);
    }
  }

  // Handle user interaction - disable auto-rotation temporarily
  function handleUserInteraction() {
    autoRotationEnabled = false;
    lastInteractionTime = Date.now();
  }

  // Check if we should resume auto-rotation
  function checkResumeAutoRotation() {
    if (!autoRotationEnabled && Date.now() - lastInteractionTime > AUTO_ROTATION_RESUME_DELAY) {
      autoRotationEnabled = true;
    }
  }

  // Mouse event handlers for globe interaction
  function handleMouseDown(event: MouseEvent) {
    isDragging = true;
    mouseStart = [event.clientX, event.clientY];
    startRotation = [...rotation];
    svg.style.cursor = 'grabbing';
    handleUserInteraction();
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isDragging) return;
    
    const [currentX, currentY] = [event.clientX, event.clientY];
    const [startX, startY] = mouseStart;
    const [startRotX, startRotY] = startRotation;
    
    // Calculate new rotation (sensitivity can be adjusted)
    const sensitivity = 0.5;
    const newRotX = startRotX + (currentX - startX) * sensitivity;
    const newRotY = Math.max(-90, Math.min(90, startRotY + (startY - currentY) * sensitivity));
    
    rotation = [newRotX, newRotY];
    updateProjection();
    handleUserInteraction();
  }

  function handleMouseUp() {
    isDragging = false;
    svg.style.cursor = 'grab';
    handleUserInteraction();
  }

  // Handle slider interaction
  function handleSliderInput(event: Event) {
    const target = event.target as HTMLInputElement;
    selectedYear = parseInt(target.value);
    handleUserInteraction();
  }

  function updateProjection() {
    projection.rotate(rotation);
    if (gr) {
      gr.selectAll("path").attr("d", pathGen);
    }
  }

  // Update visualization for current year - FIXED to use closest year
  function updateViz() {
    if (!gr || !world || nameToCode.size === 0) return;

    console.log(`Updating visualization for year: ${selectedYear}`);

    const features = world.features.map((f: any) => {
      const countryName = f.properties.name;
      const code = nameToCode.get(countryName);
      const emission = code ? getClosestYearData(code, selectedYear) : 0;
      return { ...f, emission, countryName, code };
    });

    // Log some samples to verify data is updating
    const sampleCountries = features.filter(f => 
      ['United States', 'China', 'India', 'Germany', 'Brazil'].includes(f.countryName)
    );
    console.log("Sample country emissions:", sampleCountries.map(f => 
      `${f.countryName}: ${f.emission.toFixed(2)}`
    ));

    gr.selectAll("path")
      .data(features, (d: any) => d.properties.name) // Use country name as key
      .join("path")
      .attr("d", pathGen)
      .attr("fill", (d: any) => color(d.emission))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .style("cursor", "grab")
      .on("mouseover", (event, d) => {
        // Create tooltip
        const tooltip = d3.select("body")
          .append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0,0,0,0.8)")
          .style("color", "white")
          .style("padding", "8px 12px")
          .style("border-radius", "4px")
          .style("font-size", "14px")
          .style("pointer-events", "none")
          .style("z-index", "1000");
        
        tooltip.html(`
          <strong>${d.countryName}</strong><br/>
          Year: ${selectedYear}<br/>
          Emissions: ${d.emission.toFixed(2)} tons/capita
        `);
      })
      .on("mousemove", (event) => {
        d3.select(".tooltip")
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", () => {
        d3.selectAll(".tooltip").remove();
      });
  }

  // Auto-rotation when not interacting
  function startAutoRotation() {
    let lastTime: number | null = null;
    
    function rotate(timestamp: number) {
      if (!lastTime) lastTime = timestamp;
      const delta = timestamp - lastTime;
      
      // Check if we should resume auto-rotation
      checkResumeAutoRotation();
      
      if (!isDragging && autoRotationEnabled) {
        // Slow auto-rotation when not interacting
        rotation = [rotation[0] + delta * 0.02, rotation[1]];
        updateProjection();
      }
      
      lastTime = timestamp;
      requestAnimationFrame(rotate);
    }
    
    requestAnimationFrame(rotate);
  }

  onMount(async () => {
    await Promise.all([loadCsv(), loadWorld()]);
    if (svg && world) {
      gr = d3.select(svg).append("g");
      
      // Add mouse event listeners for interactivity
      svg.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      updateViz();
      startAutoRotation();
    }
  });
</script>

<div class="container">
  <h1>CO2 Emissions Per Capita Globe Visualization</h1>

  <div class="layout">
    <!-- Left side: Placeholder for future visualizations -->
    <div class="left-panel">
      <h2>Future Visualizations</h2>
      <p>Left panel for additional charts (e.g., time series from emissionsData, bar charts by region).</p>
      <!-- Integrate your old Scatter/Line here, e.g., <Scatter data={emissionsData} /> -->
    </div>

    <!-- Right side: Globe -->
    <div class="right-panel">
      <h2>Global CO2 Emissions ({selectedYear})</h2>
      <div class="globe-container">
        <svg 
          {width} 
          {height} 
          bind:this={svg}
          class="globe"
        ></svg>
        <div class="globe-controls">
          <p>Click and drag to rotate the globe • Auto-rotation: {autoRotationEnabled ? 'ON' : 'OFF'}</p>
          <p class="data-note">Using closest available year data for each country</p>
        </div>
      </div>
      
      <!-- Year Slider -->
      {#if years.length > 0}
        <div class="slider-container">
          <label for="year-slider">Select Year: {selectedYear}</label>
          <input 
            id="year-slider"
            type="range" 
            value={selectedYear}
            on:input={handleSliderInput}
            min={years[0]} 
            max={years[years.length - 1]} 
            step="1"
            class="slider"
          />
          <div class="year-range">
            <span>{years[0]}</span>
            <span>{years[years.length - 1]}</span>
          </div>
        </div>
      {:else}
        <p>Loading data...</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .container {
    width: 90vw;
    margin: 10px auto;
    padding: 10px;
  }
  .layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-top: 1rem;
  }
  .left-panel, .right-panel {
    border: 1px solid #ddd;
    padding: 1rem;
    border-radius: 8px;
  }
  .left-panel {
    background-color: #f9f9f9;
  }
  .globe-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .globe {
    display: block;
    margin: 0 auto;
    background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
    border-radius: 50%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    cursor: grab;
  }
  .globe:active {
    cursor: grabbing;
  }
  .globe-controls {
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: #666;
    text-align: center;
  }
  .data-note {
    font-size: 0.8rem;
    font-style: italic;
    margin-top: 0.25rem;
    color: #888;
  }
  .slider-container {
    margin-top: 1.5rem;
    text-align: center;
  }
  .slider {
    width: 100%;
    margin: 0.5rem 0;
  }
  .year-range {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: #666;
    margin-top: 0.25rem;
  }
  label {
    font-weight: bold;
    display: block;
    margin-bottom: 0.5rem;
  }
  
  /* Tooltip styles */
  :global(.tooltip) {
    position: absolute;
    background: rgba(0, 0, 0, 0.8) !important;
    color: white !important;
    padding: 8px 12px !important;
    border-radius: 4px !important;
    font-size: 14px !important;
    pointer-events: none !important;
    z-index: 1000 !important;
    white-space: nowrap !important;
  }
</style>