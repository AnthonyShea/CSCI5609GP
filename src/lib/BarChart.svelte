<script lang="ts">
  import * as d3 from "d3";
  import { onMount } from "svelte";

  let {
    emissionsData = [],
    selectedYear = 2020,
    selectedCountry = null,
    topN = 10,
    width = 500,
    height = 400
  } = $props<{
    emissionsData: { entity: string; code: string; year: number; value: number }[];
    selectedYear: number;
    selectedCountry?: string | null;
    topN?: number;
    width?: number;
    height?: number;
  }>();

  let svg: SVGSVGElement;
  let margin = { top: 20, right: 30, bottom: 100, left: 60 };
  let innerWidth = width - margin.left - margin.right;
  let innerHeight = height - margin.top - margin.bottom;

  function drawChart() {
    if (!emissionsData || emissionsData.length === 0) {
      d3.select(svg).selectAll("*").remove();
      return;
    }

    // Clear previous chart
    d3.select(svg).selectAll("*").remove();

    // Filter data for selected year and sort by value
    const yearData = emissionsData
      .filter(d => d.year === selectedYear && d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, topN);

    if (yearData.length === 0) {
      return;
    }

    // Create scales
    const xScale = d3.scaleBand()
      .domain(yearData.map(d => d.entity))
      .range([0, innerWidth])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(yearData, d => d.value) as number])
      .range([innerHeight, 0]);

    // Create SVG group
    const g = d3.select(svg)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add X axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "10px");

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
      .call(d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat("" as any)
      )
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.2);

    // Add bars
    g.selectAll(".bar")
      .data(yearData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.entity) as number)
      .attr("y", d => yScale(d.value))
      .attr("width", xScale.bandwidth())
      .attr("height", d => innerHeight - yScale(d.value))
      .attr("fill", d => d.code === selectedCountry ? "#e74c3c" : "#3498db")
      .attr("opacity", 0.8)
      .on("mouseover", function() {
        d3.select(this).attr("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.8);
      });

    // Add value labels on top of bars
    g.selectAll(".label")
      .data(yearData)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", d => (xScale(d.entity) as number) + xScale.bandwidth() / 2)
      .attr("y", d => yScale(d.value) - 5)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .text(d => d.value.toFixed(1));

    // Add title
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(`Top ${topN} Countries by CO₂ Emissions (${selectedYear})`);
  }

  // Redraw chart when data changes
  $effect(() => {
    drawChart();
  });

  onMount(() => {
    drawChart();
  });
</script>

<div class="bar-chart-container">
  {#if emissionsData && emissionsData.length > 0}
    <svg bind:this={svg}></svg>
  {:else}
    <div class="no-data">
      <p>Loading data...</p>
    </div>
  {/if}
</div>

<style>
  .bar-chart-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .no-data {
    text-align: center;
    color: #666;
    padding: 2rem;
    font-style: italic;
  }

  svg {
    display: block;
    background: #f8f9fa;
    border-radius: 8px;
    padding: 10px;
  }

  :global(.grid line) {
    stroke: lightgrey;
  }

  :global(.grid path) {
    stroke-width: 0;
  }

  :global(.bar) {
    cursor: pointer;
    transition: opacity 0.2s;
  }
</style>
