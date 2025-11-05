<script lang="ts">
    import * as d3 from "d3";
    import * as topojson from "topojson-client";
    import { onMount } from "svelte";
    import { createEventDispatcher } from 'svelte';
  
    // Define props using $props() instead of export let
    let {
      emissionsData = [],
      selectedYear = 1960,
      width = 500,
      height = 400,
      triggerTimeJump = 0
    } = $props<{
      emissionsData: { entity: string; code: string; year: number; value: number }[];
      selectedYear: number;
      width?: number;
      height?: number;
      triggerTimeJump?: number;
    }>();
  
    const dispatch = createEventDispatcher();
  
    // Internal state
    let nameToCode: Map<string, string> = $state(new Map());
    let countryData: Map<string, {year: number, value: number}[]> = $state(new Map());
    
    // Rotation state for interactivity
    let rotation: [number, number] = $state([0, 0]);
    let isDragging = $state(false);
    let startRotation: [number, number] = $state([0, 0]);
    let mouseStart: [number, number] = $state([0, 0]);
    
    // Auto-rotation control
    let autoRotationEnabled = $state(true);
    let lastInteractionTime = $state(0);
    const AUTO_ROTATION_RESUME_DELAY = 30000; // 30 seconds
    let animationFrameId: number | null = $state(null);

    // Time jump animation
    let rotationSpeedMultiplier = $state(1);
    let isTimeJumping = $state(false);
  
    // Starfield state
    let stars: {x: number, y: number, size: number, opacity: number, twinkleSpeed: number}[] = $state([]);
    let starfieldSvg: SVGSVGElement | null = $state(null);
  
    // Globe dimensions
    const radius = Math.min(width, height) / 2 - 10;
  
    // D3 selections
    let svg: SVGSVGElement | null = $state(null);
    let gr: d3.Selection<SVGGElement, any, any, any> | null = $state(null);
  
    // Projection and rotation
    let projection = d3.geoOrthographic()
      .scale(radius)
      .translate([width / 2, height / 2])
      .clipAngle(90);
  
    let pathGen = d3.geoPath().projection(projection);
  
    // Color scale
    let color = d3.scaleSequential(d3.interpolateReds).domain([0, 20]);
  
    // World data
    let world: any;
  
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

    function generateStarfield() {
    const starCount = 400;
    const newStars = [];

    for (let i = 0; i < starCount; i++) {
        newStars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.5, // 0.5–1.0
        twinkleSpeed: Math.random() * 0.8 + 0.2, // smaller = slower twinkle
        phase: Math.random() * Math.PI * 2, // random start phase
        });
    }

    stars = newStars;
    }

    // Handle user interaction - disable auto-rotation temporarily
    function handleUserInteraction() {
      autoRotationEnabled = false;
      lastInteractionTime = Date.now();
      
      // Schedule resume check
      setTimeout(() => {
        if (Date.now() - lastInteractionTime >= AUTO_ROTATION_RESUME_DELAY) {
          autoRotationEnabled = true;
        }
      }, AUTO_ROTATION_RESUME_DELAY);
    }
  
    // Mouse event handlers for globe interaction
    function handleMouseDown(event: MouseEvent) {
      isDragging = true;
      mouseStart = [event.clientX, event.clientY];
      startRotation = [...rotation];
      if (svg) {
        svg.style.cursor = 'grabbing';
      }
      //handleUserInteraction();
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
      if (svg) {
        svg.style.cursor = 'grab';
      }
      //handleUserInteraction();
    }
  
    function updateProjection() {
      projection.rotate(rotation);
      if (gr) {
        gr.selectAll("path").attr("d", pathGen);
        // Update ocean background position to match rotation
        gr.selectAll(".ocean-background").attr("d", pathGen);
      }
    }
  
    // Build data structures from emissions data
    function buildDataStructures() {
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
    }
  
    // Load world topojson
    async function loadWorld() {
      try {
        const topoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";
        const topoData = await d3.json(topoUrl);
        world = topoData ? topojson.feature(topoData, topoData.objects.countries) : null;
      } catch (error) {
        console.error("Error loading World:", error);
      }
    }
  
    // Create ocean background
    function createOceanBackground() {
      if (!gr) return;
      
      // Create a full sphere for the ocean background
      const oceanFeature = {
        type: "Sphere"
      };
      
      gr.selectAll(".ocean-background")
        .data([oceanFeature])
        .join("path")
        .attr("class", "ocean-background")
        .attr("d", pathGen)
        .attr("fill", "#1e3f5c") // Deep ocean blue
        .attr("stroke", "#0d2b45") // Slightly darker blue for border
        .attr("stroke-width", 2)
        .lower(); // Ensure ocean is behind countries
    }
  
    // Update visualization for current year
    function updateViz() {
      if (!gr || !world || nameToCode.size === 0) return;
  
      const features = world.features.map((f: any) => {
        const countryName = f.properties.name;
        const code = nameToCode.get(countryName);
        const emission = code ? getClosestYearData(code, selectedYear) : 0;
        return { ...f, emission, countryName, code };
      });
  
      gr.selectAll("path:not(.ocean-background)")
        .data(features, (d: any) => d.properties.name)
        .join("path")
        .attr("d", pathGen)
        .attr("fill", (d: any) => color(d.emission))
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
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
        })
        .on("click", (event, d) => {
          event.stopPropagation();
          if (d.code && d.countryName) {
            console.log("Country clicked:", d.countryName, d.code);
            dispatch('countryclick', {
              countryCode: d.code,
              countryName: d.countryName,
              emissionData: countryData.get(d.code) || []
            });
          }
        });
    }
  
    // Auto-rotation when not interacting
    function startAutoRotation() {
      let lastTime: number | null = null;

      function rotate(timestamp: number) {
        if (!lastTime) lastTime = timestamp;
        const delta = timestamp - lastTime;

        if (!isDragging && autoRotationEnabled) {
          // Apply speed multiplier for time jump animation
          const baseSpeed = 0.02;
          const currentSpeed = baseSpeed * rotationSpeedMultiplier;
          rotation = [rotation[0] + delta * currentSpeed, rotation[1]];
          updateProjection();
        }

        lastTime = timestamp;
        animationFrameId = requestAnimationFrame(rotate);
      }

      animationFrameId = requestAnimationFrame(rotate);
    }

    // Trigger time jump animation
    function triggerTimeJumpAnimation() {
      isTimeJumping = true;
      rotationSpeedMultiplier = 8; // Start fast

      // Gradually slow down over 1.5 seconds
      const slowdownDuration = 1500;
      const startTime = Date.now();

      function slowDown() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / slowdownDuration, 1);

        // Ease out function: fast to slow
        const easeOut = 1 - Math.pow(1 - progress, 3);
        rotationSpeedMultiplier = 8 - (7 * easeOut); // 8 -> 1

        if (progress < 1) {
          requestAnimationFrame(slowDown);
        } else {
          rotationSpeedMultiplier = 1;
          isTimeJumping = false;
        }
      }

      slowDown();
    }
  
    // React to prop changes
    $effect(() => {
      buildDataStructures();
    });

    // Trigger time jump animation when prop changes
    $effect(() => {
      if (triggerTimeJump > 0) {
        triggerTimeJumpAnimation();
      }
    });

    $effect(() => {
      if (world && nameToCode.size > 0 && gr) {
        updateViz();
      }
    });

    // Effect to update visualization when selectedYear changes
    $effect(() => {
      selectedYear;
      if (world && nameToCode.size > 0 && gr) {
        updateViz();
      }
    });

    $effect(() => {
      width; height;
      generateStarfield();
    });
  
    onMount(async () => {
      // Generate starfield first
      generateStarfield();
      
      await loadWorld();
      if (svg && world) {
        gr = d3.select(svg).append("g");
        
        // Create ocean background first (so it's behind countries)
        createOceanBackground();
        
        // Add mouse event listeners for interactivity
        svg.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        
        buildDataStructures();
        updateViz();
        startAutoRotation();
        
        // Start star animation
        //animateStars();
      }
  
      return () => {
        // Cleanup event listeners and animation frame
        if (svg) {
          svg.removeEventListener('mousedown', handleMouseDown);
        }
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    });
  </script>
  
  <div class="globe-container">
    <!-- Starfield Background - FIXED: Cover entire container -->
    <svg 
      class="starfield"
      bind:this={starfieldSvg}
    >
      {#each stars as star (star.x + star.y)}
        <circle
          class="star"
          cx={star.x}
          cy={star.y}
          r={star.size}
          fill="white"
          style="--base-opacity: {star.opacity}; opacity: {star.opacity}; animation-duration: {star.twinkleSpeed * 8}s; animation-delay: {Math.random() * star.twinkleSpeed}s;"
        />
      {/each}
    </svg>
    
    <!-- Globe -->
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
  
<style>
    .globe-container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #000;
      border-radius: 12px;
      padding: 0px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      width: fit-content; /* Container fits content */
      margin: 0 auto; /* Center the entire container */
    }

    .star {
    animation: twinkle ease-in-out infinite;
    }

    @keyframes twinkle {
    0%, 100% {
        opacity: var(--base-opacity);
    }
    50% {
        opacity: calc(var(--base-opacity) * 0.5);
    }
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
    
    .globe {
      display: block;
      margin: 0 auto;
      position: relative;
      z-index: 2;
      border-radius: 50%;
      cursor: grab;
      background: transparent;
      filter: drop-shadow(0 0 20px rgba(30, 100, 200, 0.3));
    }
    
    .globe:active {
      cursor: grabbing;
    }
    
    .globe-controls {
      margin-top: 0.5rem;
      font-size: 0.9rem;
      color: #ccc;
      text-align: center;
      position: relative;
      z-index: 3;
      background: rgba(0, 0, 0, 0.6);
      padding: 8px 16px;
      border-radius: 8px;
      backdrop-filter: blur(4px);
    }
    
    .data-note {
      font-size: 0.8rem;
      font-style: italic;
      margin-top: 0.25rem;
      color: #aaa;
    }
</style>