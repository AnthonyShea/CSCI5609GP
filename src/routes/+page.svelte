<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import * as topojson from "topojson-client";
  import { idToAlpha3 } from "./idToAlpha3";
  import { base } from '$app/paths';
  import Narration from '$lib/Narration.svelte';
  import Graphs from '$lib/Graphs.svelte';

  let svg: SVGSVGElement;
  let width = 0;
  let height = 0;
  let gr: d3.Selection<SVGGElement, unknown, null, undefined>;
  let world: any;
  let projection: d3.GeoProjection;
  let pathGen: d3.GeoPath<any, d3.GeoPermissibleObjects>;
  let stars: { x: number; y: number; size: number; baseOpacity: number }[] = [];
  let selectedYear = 1960;

  let countryData: Map<string, Map<number, number>> = new Map();
  let totalEmissionsData: Map<string, Map<number, number>> = new Map(); // iso_code -> year -> total CO2

  let colorScale = d3.scaleSequential(d3.interpolateReds).domain([0, 20]);

  let tooltipVisible = false;
  let tooltipX = 0;
  let tooltipY = 0;
  let tooltipText = "";

  let selectedCountryCode = "";
  let selectedCountryName = "";

  // Multi-country chart
  let multiCountries: { code: string; name: string }[] = [];
  let rotation: [number, number, number] = [0, 0, 0]; 
  let isDragging = false;
  let lastInteractionTime = 0;

  function generateStarfield() {
    const starCount = 400;
    stars = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.8 + 0.2,
        baseOpacity: Math.random() * 0.6 + 0.4
      });
    }
  }

  async function loadWorld() {
    const topoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";
    const topoData = await d3.json(topoUrl) as any;
    world = topoData ? topojson.feature(topoData, topoData.objects.countries) : null;
  }

  async function loadCSV() {
    const csvData = await d3.csv(`${base}/co2.csv`);
      csvData.forEach(d => {
      const code = d.Code;
      const year = +d.Year;
      const value = +d["Annual CO₂ emissions (per capita)"];
      if (!countryData.has(code)) countryData.set(code, new Map());
      countryData.get(code)?.set(year, value);
    });
  }

  async function loadTotalEmissions() {
    const csvData = await d3.csv(`${base}/co2-total.csv`);
    csvData.forEach(d => {
      const code = d.iso_code;
      const year = +d.year;
      const value = +d.co2; // Total emissions in million tonnes
      if (code && !isNaN(year) && !isNaN(value) && value > 0) {
        if (!totalEmissionsData.has(code)) totalEmissionsData.set(code, new Map());
        totalEmissionsData.get(code)?.set(year, value);
      }
    });
  }

  function createOceanBackground() {
    if (!gr) return;
    gr.selectAll(".ocean-background")
      .data([{ type: "Sphere" }])
      .join("path")
      .attr("class", "ocean-background")
      .attr("d", (d: any) => pathGen(d))
      .attr("fill", "#1e3fbc")
      .lower();
  }

  function drawCountries() {
    if (!gr || !world) return;

    gr.selectAll("path.country")
      .data(world.features)
      .join("path")
      .attr("class", "country")
      .attr("d", (d: any) => pathGen(d))
      .attr("fill", (d: any) => {
        const code = idToAlpha3[d.id];
        if (!code || !countryData.has(code)) return "#d3d3d3";
        return colorScale(countryData.get(code)?.get(selectedYear) ?? 0);
      })
      .attr("stroke", "#555")
      .attr("stroke-width", 0.5)
      .on("mousemove", (event: MouseEvent, d: any) => {
        const code = idToAlpha3[d.id];
        const val = countryData.get(code)?.get(selectedYear) ?? 0;
        tooltipText = `${d.properties.name || code}: ${val.toFixed(3)}`;
        tooltipX = event.clientX + 10;
        tooltipY = event.clientY + 10;
        tooltipVisible = true;
      })
      .on("mouseout", () => { tooltipVisible = false; })
      .on("click", (event: MouseEvent, d: any) => {
        const code = idToAlpha3[d.id];
        const name = d.properties.name || code;

        selectedCountryCode = code;
        selectedCountryName = name;
        drawCountryLineChart();

        if (!multiCountries.find(c => c.code === code)) {
          multiCountries.push({ code, name });
          drawMultiCountryChart();
        }
      });
  }

  function updateGlobe() {
    if (!gr) return;
    gr.selectAll("path").attr("d", (d: any) => pathGen(d));
    gr.selectAll("path.country")
      .attr("fill", (d: any) => {
        const code = idToAlpha3[d.id];
        if (!code || !countryData.has(code)) return "#d3d3d3";
        return colorScale(countryData.get(code)?.get(selectedYear) ?? 0);
      });
  }

  function updateStars() {
    const rotate = projection.rotate()[0];
    d3.select(".starfield").selectAll("circle")
      .data(stars) 
      .attr("cx", (d: any) => (d.x + rotate * 0.2) % width)
      .attr("cy", (d: any) => d.y);
  }

  function drawCountryLineChart() {
    if (!selectedCountryCode || typeof document === "undefined") return;

    const data = Array.from(countryData.get(selectedCountryCode)?.entries() || [])
      .sort((a, b) => a[0] - b[0]);

    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = 300 - margin.left - margin.right;
    const chartHeight = 200 - margin.top - margin.bottom;

    const svgChart = d3.select("#country-chart");
    svgChart.selectAll("*").remove();

    const g = svgChart
      .attr("width", chartWidth + margin.left + margin.right)
      .attr("height", chartHeight + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("rect")
      .attr("x", -margin.left)
      .attr("y", -margin.top)
      .attr("width", chartWidth + margin.left + margin.right)
      .attr("height", chartHeight + margin.top + margin.bottom)
      .attr("fill", "rgba(0,0,0,0.7)")
      .lower();

    const x = d3.scaleLinear().domain(d3.extent(data, d => d[0]) as [number, number]).range([0, chartWidth]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d[1]) ?? 1]).range([chartHeight, 0]);

    const line = d3.line<[number, number]>().x(d => x(d[0])).y(d => y(d[1]));

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "orange")
      .attr("stroke-width", 2)
      .attr("d", line);

    g.append("g").attr("transform", `translate(0,${chartHeight})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d"))).selectAll("text").attr("fill", "white");
    g.append("g").call(d3.axisLeft(y).ticks(5)).selectAll("text").attr("fill", "white");

    g.append("text").attr("x", chartWidth / 2).attr("y", chartHeight + margin.bottom - 5).attr("text-anchor", "middle").attr("fill", "white").attr("font-size", 12).text("Year");
    g.append("text").attr("transform", "rotate(-90)").attr("x", -chartHeight / 2).attr("y", -margin.left + 15).attr("text-anchor", "middle").attr("fill", "white").attr("font-size", 12).text("CO₂ per capita");
    g.append("text").attr("x", chartWidth / 2).attr("y", -5).attr("text-anchor", "middle").attr("fill", "white").attr("font-size", 14).text(`${selectedCountryName} CO₂ per capita`);
  }

  function drawMultiCountryChart() {
    if (multiCountries.length === 0 || typeof document === "undefined") return;

    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = 300 - margin.left - margin.right;
    const chartHeight = 200 - margin.top - margin.bottom;

    const svgChart = d3.select("#multi-country-chart");
    svgChart.selectAll("*").remove();

    const g = svgChart
      .attr("width", chartWidth + margin.left + margin.right)
      .attr("height", chartHeight + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("rect")
      .attr("x", -margin.left)
      .attr("y", -margin.top)
      .attr("width", chartWidth + margin.left + margin.right)
      .attr("height", chartHeight + margin.top + margin.bottom)
      .attr("fill", "rgba(0,0,0,0.7)")
      .lower();

    const allYears = Array.from(new Set(multiCountries.flatMap(c => Array.from(countryData.get(c.code)?.keys() || [])))).sort((a, b) => a - b);
    const x = d3.scaleLinear().domain([d3.min(allYears) ?? 0, d3.max(allYears) ?? 1]).range([0, chartWidth]);
    const y = d3.scaleLinear().domain([0, d3.max(multiCountries.flatMap(c => Array.from(countryData.get(c.code)?.values() || []))) ?? 1]).range([chartHeight, 0]);

    const line = d3.line<[number, number]>().x(d => x(d[0])).y(d => y(d[1]));

    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(multiCountries.map(c => c.code));

    multiCountries.forEach(c => {
      const data = Array.from(countryData.get(c.code)?.entries() || []).sort((a, b) => a[0] - b[0]);
      g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", color(c.code) as string)
        .attr("stroke-width", 2)
        .attr("d", line);
    });

    g.append("g").attr("transform", `translate(0,${chartHeight})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d"))).selectAll("text").attr("fill", "white");
    g.append("g").call(d3.axisLeft(y).ticks(5)).selectAll("text").attr("fill", "white");

    g.append("text").attr("x", chartWidth / 2).attr("y", chartHeight + margin.bottom - 5).attr("text-anchor", "middle").attr("fill", "white").attr("font-size", 12).text("Year");
    g.append("text").attr("transform", "rotate(-90)").attr("x", -chartHeight / 2).attr("y", -margin.left + 15).attr("text-anchor", "middle").attr("fill", "white").attr("font-size", 12).text("CO₂ per capita");
    g.append("text").attr("x", chartWidth / 2).attr("y", -5).attr("text-anchor", "middle").attr("fill", "white").attr("font-size", 14).text("Multi-country Comparison");
  }

  function drawTop10BarChart() {
    if (typeof document === "undefined") return;

    // Get data for the selected year
    const yearData: { code: string; name: string; value: number }[] = [];
    countryData.forEach((yearMap, code) => {
      const value = yearMap.get(selectedYear);
      if (value !== undefined && value > 0) {
        // Find country name from world features
        const feature = world?.features.find((f: any) => idToAlpha3[f.id] === code);
        const name = feature?.properties.name || code;
        yearData.push({ code, name, value });
      }
    });

    // Sort and get top 10
    yearData.sort((a, b) => b.value - a.value);
    const top10 = yearData.slice(0, 10);

    const margin = { top: 20, right: 20, bottom: 60, left: 50 };
    const chartWidth = 300 - margin.left - margin.right;
    const chartHeight = 200 - margin.top - margin.bottom;

    const svgChart = d3.select("#top10-bar-chart");
    svgChart.selectAll("*").remove();

    const g = svgChart
      .attr("width", chartWidth + margin.left + margin.right)
      .attr("height", chartHeight + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("rect")
      .attr("x", -margin.left)
      .attr("y", -margin.top)
      .attr("width", chartWidth + margin.left + margin.right)
      .attr("height", chartHeight + margin.top + margin.bottom)
      .attr("fill", "rgba(0,0,0,0.7)")
      .lower();

    const x = d3.scaleBand()
      .domain(top10.map(d => d.code))
      .range([0, chartWidth])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(top10, d => d.value) ?? 1])
      .range([chartHeight, 0]);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    g.selectAll(".bar")
      .data(top10)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.code) ?? 0)
      .attr("y", d => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", d => chartHeight - y(d.value))
      .attr("fill", (d, i) => color(i.toString()) as string);

    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("fill", "white")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .selectAll("text")
      .attr("fill", "white");

    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", 14)
      .text(`Top 10 Countries (${selectedYear})`);
  }

  function drawBubbleChart() {
    if (typeof document === "undefined") return;

    // Get data for the selected year
    const yearData: { code: string; name: string; value: number }[] = [];
    let totalGlobal = 0;

    totalEmissionsData.forEach((yearMap, code) => {
      const value = yearMap.get(selectedYear);
      if (value !== undefined && value > 0) {
        const feature = world?.features.find((f: any) => idToAlpha3[f.id] === code);
        const name = feature?.properties.name || code;
        yearData.push({ code, name, value });
        totalGlobal += value;
      }
    });

    // Sort and get top 30 countries
    yearData.sort((a, b) => b.value - a.value);
    const top30 = yearData.slice(0, 30);

    const chartWidth = 300;
    const chartHeight = 300;

    const svgChart = d3.select("#bubble-chart");
    svgChart.selectAll("*").remove();

    svgChart
      .attr("width", chartWidth)
      .attr("height", chartHeight);

    // Create hierarchy for pack layout
    const root = d3.hierarchy({ children: top30 } as any)
      .sum((d: any) => d.value || 0);

    const pack = d3.pack()
      .size([chartWidth - 20, chartHeight - 20])
      .padding(3);

    pack(root);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const g = svgChart.append("g")
      .attr("transform", "translate(10,10)");

    // Background
    svgChart.insert("rect", ":first-child")
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .attr("fill", "rgba(0,0,0,0.7)");

    const nodes = g.selectAll("g")
      .data(root.leaves())
      .join("g")
      .attr("transform", (d: any) => `translate(${d.x},${d.y})`);

    nodes.append("circle")
      .attr("r", (d: any) => d.r)
      .attr("fill", (d: any, i: number) => color(i.toString()) as string)
      .attr("fill-opacity", 0.7)
      .attr("stroke", "white")
      .attr("stroke-width", 1.5);

    nodes.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .attr("fill", "white")
      .attr("font-size", (d: any) => Math.min(d.r / 3, 12))
      .attr("font-weight", "bold")
      .text((d: any) => d.data.code);

    nodes.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1em")
      .attr("fill", "white")
      .attr("font-size", (d: any) => Math.min(d.r / 4, 10))
      .text((d: any) => {
        const pct = ((d.data.value / totalGlobal) * 100).toFixed(1);
        return `${pct}%`;
      });

    // Title
    svgChart.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", 14)
      .attr("font-weight", "bold")
      .text(`Top 30 Emitters (${selectedYear})`);
  }

    function clearMultiSelection() {
      multiCountries = []; // reassign to trigger Svelte reactivity
      d3.select("#multi-country-chart").selectAll("*").remove(); // clear SVG
    }


  onMount(async () => {
    width = window.innerWidth;
    height = window.innerHeight;

    generateStarfield();
    await loadWorld();
    await loadCSV();
    await loadTotalEmissions();

    projection = d3.geoOrthographic()
      .scale(Math.min(width, height) / 2 - 20)
      .translate([width / 2, height / 2])
      .clipAngle(90);

    // Initialize rotation state from the projection
    rotation = projection.rotate() as [number, number, number];

    pathGen = d3.geoPath().projection(projection);
    gr = d3.select(svg).append("g");

    createOceanBackground();
    drawCountries();

    const drag = d3.drag<SVGSVGElement, unknown>()
      .on("start", () => {
        isDragging = true;
        lastInteractionTime = Date.now();
      })
      .on("drag", (event) => {
        rotation[0] += event.dx * 0.5;
        rotation[1] -= event.dy * 0.5;
        rotation[1] = Math.max(-90, Math.min(90, rotation[1]));
        
        lastInteractionTime = Date.now();
      })
      .on("end", () => {
        isDragging = false;
        lastInteractionTime = Date.now();
      });

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 8])
      .on("zoom", event => {
        projection.scale((Math.min(width, height) / 2 - 20) * event.transform.k);
      });

    d3.select(svg).call(drag).call(zoom);

    function animate() {
      const now = Date.now();

      if (!isDragging && (now - lastInteractionTime > 10000)) {
        rotation[0] += 0.2; // Speed of rotation
      }

      stars.forEach(s => { s.x = (s.x + 0.02) % width; });

      projection.rotate(rotation);
      updateGlobe();
      updateStars();

      requestAnimationFrame(animate);
    }
    
    animate();

    window.addEventListener("resize", () => {
      width = window.innerWidth;
      height = window.innerHeight;
      projection.translate([width / 2, height / 2])
        .scale(Math.min(width, height) / 2 - 20);
      generateStarfield();
    });
  });

  // Update charts reactively
  $: if (selectedYear && typeof window !== "undefined") {
    updateGlobe();
    if (selectedCountryCode) drawCountryLineChart();
    if (multiCountries.length > 0) drawMultiCountryChart();
    drawTop10BarChart();
    drawBubbleChart();
  }
</script>


<div class="globe-container">
  <svg class="starfield">
    {#each stars as star (star.x + star.y)}
      <circle cx={star.x} cy={star.y} r={star.size} fill="white" style="opacity: {star.baseOpacity}" />
    {/each}
  </svg>

  <svg bind:this={svg} width={width} height={height} class="globe"></svg>

  <div class="slider-container">
    <input type="range" min="1700" max="2023" step="1" bind:value={selectedYear} />
    <div>Year: {selectedYear}</div>
  </div>

  <div class="slider-container2">
    <input type="range" min="1700" max="2023" step="1" bind:value={selectedYear} />
    <div>Year: {selectedYear}</div>
  </div>

  {#if tooltipVisible}
    <div class="tooltip" style="left:{tooltipX}px; top:{tooltipY}px">{tooltipText}</div>
  {/if}

  <Narration bind:selectedYear={selectedYear} />
  <Graphs {clearMultiSelection} />
</div>

<style>
  :global(html, body) { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#000; }
  .globe-container { position: relative; width: 100vw; height: 100vh; }
  .starfield { position:absolute; top:0; left:0; width:100%; height:100%; z-index:1; pointer-events:none; }
  .globe { position: relative; width:100%; height:100%; z-index:2; cursor:grab; }
  .globe:active { cursor: grabbing; }
  .slider-container { position:absolute; bottom:20px; width:300px; left:50%; transform:translateX(-50%);
    z-index:3; display:flex; flex-direction:column; align-items:center; color:white; font-family:sans-serif;
  }
  .slider-container2 { position:absolute; bottom:20px; width:300px; left:50%; transform:translateX(-50%);
    z-index:3; display:flex; flex-direction:column; align-items:center; color:white; font-family:sans-serif;
  }

  input[type="range"] { width:100%; }
  .tooltip { position: fixed; background: rgba(0,0,0,0.8); color:#fff; padding:4px 8px; border-radius:4px;
    pointer-events:none; font-family:sans-serif; font-size:14px; z-index:5; }
</style>