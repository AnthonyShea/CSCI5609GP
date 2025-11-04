<script lang="ts">
  import * as d3 from "d3";
  import { onMount } from "svelte";

  let {
    emissionsData = [],
    selectedYear = 2020,
    selectedCountry = null,
    width = 450,
    height = 450
  } = $props<{
    emissionsData: { entity: string; code: string; year: number; value: number }[];
    selectedYear: number;
    selectedCountry?: string | null;
    width?: number;
    height?: number;
  }>();

  let svg: SVGSVGElement;
  let radius = Math.min(width, height) / 2 - 40;

  function drawChart() {
    if (!emissionsData || emissionsData.length === 0) {
      d3.select(svg).selectAll("*").remove();
      return;
    }

    // Clear previous chart
    d3.select(svg).selectAll("*").remove();

    // Filter data for selected year
    const yearData = emissionsData.filter(d => d.year === selectedYear && d.value > 0);

    if (yearData.length === 0) {
      return;
    }

    // Calculate total emissions
    const totalEmissions = d3.sum(yearData, d => d.value * 1000000); // Approximate scaling

    // Group by regions or show top countries + others
    const topN = 8;
    const sortedData = [...yearData].sort((a, b) => b.value - a.value);
    const topCountries = sortedData.slice(0, topN);
    const othersValue = sortedData.slice(topN).reduce((sum, d) => sum + d.value, 0);

    const pieData = [...topCountries];
    if (othersValue > 0) {
      pieData.push({ entity: "Others", code: "OTH", year: selectedYear, value: othersValue });
    }

    // Create color scale
    const color = d3.scaleOrdinal()
      .domain(pieData.map(d => d.entity))
      .range(d3.schemeSet3);

    // Create pie generator
    const pie = d3.pie<any>()
      .value(d => d.value)
      .sort(null);

    // Create arc generator
    const arc = d3.arc<any>()
      .innerRadius(radius * 0.5) // Donut chart
      .outerRadius(radius);

    const outerArc = d3.arc<any>()
      .innerRadius(radius)
      .outerRadius(radius);

    // Create SVG group
    const g = d3.select(svg)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Create arcs
    const arcs = g.selectAll(".arc")
      .data(pie(pieData))
      .enter()
      .append("g")
      .attr("class", "arc");

    // Add path for each arc
    arcs.append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data.entity) as string)
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("opacity", d => d.data.code === selectedCountry ? 1 : 0.8)
      .on("mouseover", function(event, d) {
        d3.select(this).style("opacity", 1);
        // Show tooltip
        const tooltip = d3.select(".pie-tooltip");
        tooltip.style("display", "block")
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .html(`<strong>${d.data.entity}</strong><br/>
                 ${d.data.value.toFixed(2)} tons/capita<br/>
                 ${((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(1)}%`);
      })
      .on("mouseout", function(event, d) {
        d3.select(this).style("opacity", d.data.code === selectedCountry ? 1 : 0.8);
        d3.select(".pie-tooltip").style("display", "none");
      });

    // Add labels
    arcs.append("text")
      .attr("transform", d => {
        const pos = arc.centroid(d);
        return `translate(${pos})`;
      })
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("font-weight", "bold")
      .style("fill", "white")
      .text(d => {
        const percentage = (d.endAngle - d.startAngle) / (2 * Math.PI) * 100;
        return percentage > 5 ? `${percentage.toFixed(0)}%` : "";
      });

    // Add legend
    const legend = g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${radius + 20}, ${-radius})`);

    const legendItems = legend.selectAll(".legend-item")
      .data(pieData)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendItems.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", d => color(d.entity) as string)
      .attr("stroke", "white");

    legendItems.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .style("font-size", "11px")
      .text(d => d.entity.length > 15 ? d.entity.substring(0, 15) + "..." : d.entity);

    // Add title
    g.append("text")
      .attr("y", -height / 2 + 20)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(`Emissions Distribution (${selectedYear})`);

    // Add center text (total or selected country)
    if (selectedCountry) {
      const selectedData = pieData.find(d => d.code === selectedCountry);
      if (selectedData) {
        g.append("text")
          .attr("text-anchor", "middle")
          .attr("y", -10)
          .style("font-size", "14px")
          .style("font-weight", "bold")
          .text(selectedData.entity);

        g.append("text")
          .attr("text-anchor", "middle")
          .attr("y", 10)
          .style("font-size", "12px")
          .text(`${selectedData.value.toFixed(2)} t/capita`);
      }
    } else {
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("y", 0)
        .style("font-size", "12px")
        .text("Click a country");
    }
  }

  // Redraw chart when data changes
  $effect(() => {
    drawChart();
  });

  onMount(() => {
    drawChart();
  });
</script>

<div class="pie-chart-container">
  {#if emissionsData && emissionsData.length > 0}
    <svg bind:this={svg}></svg>
    <div class="pie-tooltip"></div>
  {:else}
    <div class="no-data">
      <p>Loading data...</p>
    </div>
  {/if}
</div>

<style>
  .pie-chart-container {
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

  :global(.pie-tooltip) {
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

  :global(.arc path) {
    cursor: pointer;
    transition: opacity 0.2s;
  }
</style>
