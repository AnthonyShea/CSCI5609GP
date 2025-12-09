<script lang="ts">
  import * as d3 from "d3";
  import { onMount } from "svelte";

  let {
    emissionsData = [],
    selectedCountries = [],
    width = 500,
    height = 350,
    autoPlay = false,
    showPlayControls = true
  } = $props<{
    emissionsData: { entity: string; code: string; year: number; value: number }[];
    selectedCountries?: string[];
    width?: number;
    height?: number;
    autoPlay?: boolean;
    showPlayControls?: boolean;
  }>();

  let svg: SVGSVGElement;
  let margin = { top: 20, right: 120, bottom: 50, left: 60 };
  let innerWidth = width - margin.left - margin.right;
  let innerHeight = height - margin.top - margin.bottom;

  // Animation state
  let isPlaying = $state(false);
  let currentAnimationYear = $state<number | null>(null);
  let animationInterval: any = null;
  let availableYears: number[] = $state([]);

  function startAutoPlay() {
    if (isPlaying || !availableYears.length) return;

    isPlaying = true;

    // Skip years for faster animation - only show every 3rd year
    const skipFactor = 3;
    const yearsToAnimate = availableYears.filter((_, i) => i % skipFactor === 0 || i === availableYears.length - 1);

    currentAnimationYear = yearsToAnimate[0];
    drawChart(currentAnimationYear);

    let index = 0;
    animationInterval = setInterval(() => {
      index++;
      if (index >= yearsToAnimate.length) {
        stopAutoPlay();
        return;
      }
      currentAnimationYear = yearsToAnimate[index];
      drawChart(currentAnimationYear);
    }, 300); // Faster: 300ms instead of 500ms
  }

  function stopAutoPlay() {
    isPlaying = false;
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
    currentAnimationYear = null;
    drawChart();
  }

  function togglePlay() {
    if (isPlaying) {
      stopAutoPlay();
    } else {
      startAutoPlay();
    }
  }

  // Auto-start if prop is set
  $effect(() => {
    if (autoPlay && selectedCountries && selectedCountries.length > 0 && !isPlaying) {
      setTimeout(() => startAutoPlay(), 500);
    }
  });

  function drawChart(upToYear?: number | null) {
    if (!emissionsData || emissionsData.length === 0) {
      d3.select(svg).selectAll("*").remove();
      return;
    }

    // Clear previous chart
    d3.select(svg).selectAll("*").remove();

    // If no countries selected, show empty chart with message
    let countriesToShow = selectedCountries;
    if (!countriesToShow || countriesToShow.length === 0) {
      showEmptyState();
      return;
    }

    // Filter data for selected countries
    let filteredData = emissionsData.filter(d =>
      countriesToShow.includes(d.code) && d.value > 0
    );

    // If animating, only show data up to current year
    if (upToYear !== null && upToYear !== undefined) {
      filteredData = filteredData.filter(d => d.year <= upToYear);
    }

    if (filteredData.length === 0) {
      showEmptyState();
      return;
    }

    // Update available years for animation
    if (!upToYear) {
      const allYearsSet = new Set(filteredData.map(d => d.year));
      availableYears = Array.from(allYearsSet).sort((a, b) => a - b);
    }

    // Group by country
    const dataByCountry = d3.group(filteredData, d => d.code);

    // Create scales - use full data range for consistency during animation
    const allYears = emissionsData.filter(d => countriesToShow.includes(d.code)).map(d => d.year);
    const xScale = d3.scaleLinear()
      .domain(d3.extent(allYears) as [number, number])
      .range([0, innerWidth]);

    const allValues = emissionsData.filter(d => countriesToShow.includes(d.code)).map(d => d.value);
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(allValues) as number])
      .range([innerHeight, 0]);

    // Color scale
    const color = d3.scaleOrdinal()
      .domain(countriesToShow)
      .range(d3.schemeCategory10);

    // Create line generator
    const line = d3.line<any>()
      .x(d => xScale(d.year))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Create SVG group
    const g = d3.select(svg)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add X axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(10).tickFormat(d3.format("d")))
      .append("text")
      .attr("x", innerWidth / 2)
      .attr("y", 40)
      .attr("fill", "black")
      .style("text-anchor", "middle")
      .text("Year");

    // Add Y axis
    g.append("g")
      .call(d3.axisLeft(yScale))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -innerHeight / 2)
      .attr("fill", "black")
      .style("text-anchor", "middle")
      .text("CO₂ Emissions (tons/capita)");

    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .ticks(10)
        .tickSize(-innerHeight)
        .tickFormat("" as any)
      )
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.2);

    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat("" as any)
      )
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.2);

    // Add lines for each country
    countriesToShow.forEach(code => {
      const countryData = dataByCountry.get(code);
      if (!countryData || countryData.length === 0) return;

      const sortedData = [...countryData].sort((a, b) => a.year - b.year);

      // Add line
      g.append("path")
        .datum(sortedData)
        .attr("class", `line-${code}`)
        .attr("fill", "none")
        .attr("stroke", color(code) as string)
        .attr("stroke-width", 2.5)
        .attr("d", line)
        .style("opacity", 0.8)
        .on("mouseover", function() {
          d3.select(this).style("opacity", 1).attr("stroke-width", 3.5);
        })
        .on("mouseout", function() {
          d3.select(this).style("opacity", 0.8).attr("stroke-width", 2.5);
        });

      // Add dots
      g.selectAll(`.dot-${code}`)
        .data(sortedData)
        .enter()
        .append("circle")
        .attr("class", `dot-${code}`)
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(d.value))
        .attr("r", 3)
        .attr("fill", color(code) as string)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .on("mouseover", function(event, d) {
          d3.select(this).attr("r", 5);
          // Show tooltip
          const tooltip = d3.select(".comparison-tooltip");
          tooltip.style("display", "block")
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .html(`<strong>${d.entity}</strong><br/>
                   Year: ${d.year}<br/>
                   ${d.value.toFixed(2)} tons/capita`);
        })
        .on("mouseout", function() {
          d3.select(this).attr("r", 3);
          d3.select(".comparison-tooltip").style("display", "none");
        });
    });

    // Add legend
    const legend = g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${innerWidth + 10}, 0)`);

    countriesToShow.forEach((code, i) => {
      const countryData = dataByCountry.get(code);
      if (!countryData || countryData.length === 0) return;

      const countryName = countryData[0].entity;

      const legendItem = legend.append("g")
        .attr("transform", `translate(0, ${i * 22})`)
        .style("cursor", "pointer")
        .on("mouseover", function() {
          g.selectAll(`.line-${code}`).style("opacity", 1).attr("stroke-width", 3.5);
          g.selectAll(`.dot-${code}`).attr("r", 5);
        })
        .on("mouseout", function() {
          g.selectAll(`.line-${code}`).style("opacity", 0.8).attr("stroke-width", 2.5);
          g.selectAll(`.dot-${code}`).attr("r", 3);
        });

      legendItem.append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", 7)
        .attr("y2", 7)
        .attr("stroke", color(code) as string)
        .attr("stroke-width", 2.5);

      legendItem.append("text")
        .attr("x", 25)
        .attr("y", 12)
        .style("font-size", "11px")
        .text(countryName.length > 12 ? countryName.substring(0, 12) + "..." : countryName);
    });

    // Add title
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Multi-Country Comparison - CO₂ Emissions");
  }

  function showEmptyState() {
    const g = d3.select(svg)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add message
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("fill", "#666")
      .text("No countries selected");

    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight / 2 + 25)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#999")
      .text("Click on countries in the globe to compare");
  }

  // Redraw chart when data or selected countries change (but not during animation)
  $effect(() => {
    if (!isPlaying) {
      drawChart();
    }
  });

  onMount(() => {
    drawChart();

    // Cleanup on unmount
    return () => {
      if (animationInterval) {
        clearInterval(animationInterval);
      }
    };
  });
</script>

<div class="comparison-chart-container">
  {#if showPlayControls && selectedCountries && selectedCountries.length > 0}
    <div class="play-controls">
      <button onclick={togglePlay} class="play-button" class:playing={isPlaying}>
        {#if isPlaying}
          <span>⏸</span> Pause
        {:else}
          <span>▶</span> Play Timeline
        {/if}
      </button>
      {#if currentAnimationYear}
        <div class="year-display">
          Year: <span class="year-number">{currentAnimationYear}</span>
        </div>
      {/if}
    </div>
  {/if}

  {#if emissionsData && emissionsData.length > 0}
    <svg bind:this={svg}></svg>
    <div class="comparison-tooltip"></div>
  {:else}
    <div class="no-data">
      <p>Loading data...</p>
    </div>
  {/if}
</div>

<style>
  .comparison-chart-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .play-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 0.75rem 1rem;
    background: rgba(60, 60, 60, 0.4);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .play-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  }

  .play-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
  }

  .play-button.playing {
    background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);
    animation: playingPulse 2s ease-in-out infinite;
  }

  @keyframes playingPulse {
    0%, 100% {
      box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
    }
    50% {
      box-shadow: 0 4px 16px rgba(244, 67, 54, 0.6);
    }
  }

  .play-button span {
    font-size: 1.1rem;
  }

  .year-display {
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cccccc;
    font-size: 0.9rem;
  }

  .year-number {
    font-weight: 700;
    color: #ffffff;
    font-size: 1.1rem;
    margin-left: 0.25rem;
  }

  .no-data {
    text-align: center;
    color: #666;
    padding: 2rem;
    font-style: italic;
  }

  svg {
    display: block;
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border-radius: 8px;
    padding: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  :global(.comparison-tooltip) {
    position: absolute;
    display: none;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
    z-index: 1000;
  }

  :global(.grid line) {
    stroke: lightgrey;
  }

  :global(.grid path) {
    stroke-width: 0;
  }
</style>