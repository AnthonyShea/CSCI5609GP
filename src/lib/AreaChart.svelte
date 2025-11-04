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

    // If no countries selected, use top 5 countries by average emissions
    let countriesToShow = selectedCountries;
    if (!countriesToShow || countriesToShow.length === 0) {
      const avgByCountry = d3.rollup(
        emissionsData.filter(d => d.value > 0),
        v => d3.mean(v, d => d.value),
        d => d.code
      );
      countriesToShow = Array.from(avgByCountry.entries())
        .sort((a, b) => (b[1] || 0) - (a[1] || 0))
        .slice(0, 5)
        .map(d => d[0]);
    }

    // Filter and prepare data
    const filteredData = emissionsData.filter(d =>
      countriesToShow.includes(d.code) && d.value > 0
    );

    // Group by year
    const dataByYear = d3.group(filteredData, d => d.year);
    const years = Array.from(dataByYear.keys()).sort((a, b) => a - b);

    // Prepare stacked data
    const stackData: any[] = years.map(year => {
      const yearEntry: any = { year };
      const yearData = dataByYear.get(year) || [];
      countriesToShow.forEach(code => {
        const countryData = yearData.find(d => d.code === code);
        yearEntry[code] = countryData ? countryData.value : 0;
      });
      return yearEntry;
    });

    // Create stack
    const stack = d3.stack()
      .keys(countriesToShow)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const series = stack(stackData);

    // Create scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(years) as [number, number])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(series, s => d3.max(s, d => d[1])) as number])
      .range([innerHeight, 0]);

    // Color scale
    const color = d3.scaleOrdinal()
      .domain(countriesToShow)
      .range(d3.schemeCategory10);

    // Create area generator
    const area = d3.area<any>()
      .x(d => xScale(d.data.year))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
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
      .call(d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat("" as any)
      )
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.2);

    // Add areas
    g.selectAll(".area")
      .data(series)
      .enter()
      .append("path")
      .attr("class", "area")
      .attr("d", area)
      .attr("fill", d => color(d.key) as string)
      .attr("opacity", 0.7)
      .on("mouseover", function() {
        d3.select(this).attr("opacity", 0.9);
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.7);
      });

    // Add legend
    const legend = g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${innerWidth + 10}, 0)`);

    countriesToShow.forEach((code, i) => {
      const countryData = emissionsData.find(d => d.code === code);
      const countryName = countryData ? countryData.entity : code;

      const legendItem = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendItem.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", color(code) as string)
        .attr("opacity", 0.7);

      legendItem.append("text")
        .attr("x", 20)
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
      .text("Stacked Area Chart - CO₂ Emissions Over Time");
  }

  // Redraw chart when data changes
  $effect(() => {
    drawChart();
  });

  onMount(() => {
    drawChart();
  });
</script>

<div class="area-chart-container">
  {#if emissionsData && emissionsData.length > 0}
    <svg bind:this={svg}></svg>
  {:else}
    <div class="no-data">
      <p>Loading data...</p>
    </div>
  {/if}
</div>

<style>
  .area-chart-container {
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

  :global(.area) {
    cursor: pointer;
    transition: opacity 0.2s;
  }
</style>
