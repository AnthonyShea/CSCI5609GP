<script lang="ts">
  import * as d3 from "d3";
  import { onMount } from "svelte";

  let {
    emissionsData = [],
    selectedCountries = [],
    width = 500,
    height = 350
  } = $props<{
    emissionsData: { entity: string; code: string; year: number; value: number }[];
    selectedCountries?: string[];
    width?: number;
    height?: number;
  }>();

  let svg: SVGSVGElement;
  let margin = { top: 20, right: 120, bottom: 50, left: 60 };
  let innerWidth = width - margin.left - margin.right;
  let innerHeight = height - margin.top - margin.bottom;

  function drawChart() {
    if (!emissionsData || emissionsData.length === 0) {
      d3.select(svg).selectAll("*").remove();
      return;
    }

    // Clear previous chart
    d3.select(svg).selectAll("*").remove();

    // If no countries selected, use top 5 countries by latest year emissions
    let countriesToShow = selectedCountries;
    if (!countriesToShow || countriesToShow.length === 0) {
      const latestYear = d3.max(emissionsData, d => d.year) || 2020;
      countriesToShow = emissionsData
        .filter(d => d.year === latestYear && d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map(d => d.code);
    }

    // Filter data for selected countries
    const filteredData = emissionsData.filter(d =>
      countriesToShow.includes(d.code) && d.value > 0
    );

    if (filteredData.length === 0) {
      return;
    }

    // Group by country
    const dataByCountry = d3.group(filteredData, d => d.code);

    // Create scales
    const allYears = filteredData.map(d => d.year);
    const xScale = d3.scaleLinear()
      .domain(d3.extent(allYears) as [number, number])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(filteredData, d => d.value) as number])
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

  // Redraw chart when data changes
  $effect(() => {
    drawChart();
  });

  onMount(() => {
    drawChart();
  });
</script>

<div class="comparison-chart-container">
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
