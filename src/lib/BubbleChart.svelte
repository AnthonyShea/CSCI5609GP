<script lang="ts">
  import * as d3 from "d3";
  import { onMount } from "svelte";

  let {
    emissionsData = [],
    startYear = 1850,
    endYear = 2020,
    topN = 15,
    width = 700,
    height = 600
  } = $props<{
    emissionsData: { entity: string; code: string; year: number; value: number }[];
    startYear?: number;
    endYear?: number;
    topN?: number;
    width?: number;
    height?: number;
  }>();

  let svg: SVGSVGElement;
  let tooltip: HTMLDivElement;

  function calculateCumulativeEmissions() {
    if (!emissionsData || emissionsData.length === 0) {
      console.log("BubbleChart: No emissions data");
      return [];
    }

    // Group by country and calculate cumulative emissions (sum of per-capita values)
    const countryMap = new Map<string, { entity: string; code: string; cumulative: number; yearCount: number }>();

    let dataPointsProcessed = 0;
    emissionsData.forEach(d => {
      if (d.year >= startYear && d.year <= endYear && d.code && d.value > 0) {
        dataPointsProcessed++;
        if (!countryMap.has(d.code)) {
          countryMap.set(d.code, {
            entity: d.entity,
            code: d.code,
            cumulative: 0,
            yearCount: 0
          });
        }
        const country = countryMap.get(d.code)!;
        // Sum up all per-capita emissions over the years
        country.cumulative += d.value;
        country.yearCount++;
      }
    });

    console.log(`BubbleChart: Processed ${dataPointsProcessed} data points from ${startYear}-${endYear}`);
    console.log(`BubbleChart: Found ${countryMap.size} countries`);

    // Convert to array and sort
    const cumulativeData = Array.from(countryMap.values())
      .filter(d => d.cumulative > 0)
      .sort((a, b) => b.cumulative - a.cumulative)
      .slice(0, topN);

    console.log(`BubbleChart: Top ${topN} countries:`, cumulativeData.map(d => `${d.entity}: ${d.cumulative.toFixed(1)}`));

    return cumulativeData;
  }

  function drawBubbleChart() {
    console.log("BubbleChart: drawBubbleChart called", {
      hasSvg: !!svg,
      emissionsDataLength: emissionsData?.length || 0,
      startYear,
      endYear
    });

    if (!svg) {
      console.log("BubbleChart: No SVG element");
      return;
    }

    if (!emissionsData || emissionsData.length === 0) {
      console.log("BubbleChart: No emissions data available");
      showEmptyState();
      return;
    }

    // Clear previous chart
    d3.select(svg).selectAll("*").remove();

    const cumulativeData = calculateCumulativeEmissions();

    if (cumulativeData.length === 0) {
      console.log("BubbleChart: No cumulative data calculated");
      showEmptyState();
      return;
    }

    console.log("BubbleChart: Drawing bubbles for", cumulativeData.length, "countries");

    // Create hierarchical data structure for pack layout
    const hierarchyData = {
      name: "root",
      children: cumulativeData.map(d => ({
        name: d.entity,
        code: d.code,
        value: d.cumulative
      }))
    };

    // Create pack layout
    const pack = d3.pack<any>()
      .size([width - 40, height - 40])
      .padding(3);

    const root = d3.hierarchy(hierarchyData)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    pack(root);

    // Color scale based on value
    const maxValue = d3.max(cumulativeData, d => d.cumulative) || 1;
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, maxValue]);

    // Create SVG group
    const g = d3.select(svg)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(20, 20)`);

    // Add title
    g.append("text")
      .attr("x", (width - 40) / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "#ffffff")
      .text(`Cumulative CO₂ Emissions (${startYear}-${endYear})`);

    // Draw circles
    const nodes = root.leaves();

    const node = g.selectAll("g")
      .data(nodes)
      .join("g")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    // Add circles with animation
    node.append("circle")
      .attr("r", 0)
      .attr("fill", d => colorScale(d.data.value))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .style("opacity", 0.85)
      .style("cursor", "pointer")
      .transition()
      .duration(1000)
      .delay((d, i) => i * 50)
      .attr("r", d => d.r)
      .end()
      .catch(() => {});

    // Add interaction after animation
    setTimeout(() => {
      node.selectAll("circle")
        .on("mouseover", function(event, d: any) {
          d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 1)
            .attr("stroke-width", 3);

          // Calculate percentage of total
          const total = d3.sum(cumulativeData, c => c.cumulative);
          const percentage = ((d.data.value / total) * 100).toFixed(1);

          // Show tooltip
          d3.select(tooltip)
            .style("display", "block")
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .html(`
              <div style="font-weight: bold; margin-bottom: 4px;">${d.data.name}</div>
              <div>Cumulative: ${d.data.value.toFixed(0)} tons/capita</div>
              <div style="color: #ffa500;">${percentage}% of top ${topN}</div>
              <div style="font-size: 11px; margin-top: 4px; color: #aaa;">Period: ${startYear}-${endYear}</div>
            `);
        })
        .on("mousemove", function(event) {
          d3.select(tooltip)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
          d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 0.85)
            .attr("stroke-width", 2);

          d3.select(tooltip).style("display", "none");
        });
    }, 1000);

    // Add country labels for larger bubbles
    node.each(function(d: any) {
      const node = d3.select(this);

      if (d.r > 30) {
        // Country name
        node.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "-0.2em")
          .style("font-size", `${Math.min(d.r / 4, 14)}px`)
          .style("font-weight", "bold")
          .style("fill", "#ffffff")
          .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.8)")
          .style("pointer-events", "none")
          .text(d.data.name.length > 12 ? d.data.name.substring(0, 10) + "..." : d.data.name)
          .style("opacity", 0)
          .transition()
          .delay(1000)
          .duration(500)
          .style("opacity", 1);

        // Value
        node.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "1em")
          .style("font-size", `${Math.min(d.r / 5, 12)}px`)
          .style("fill", "#ffffff")
          .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.8)")
          .style("pointer-events", "none")
          .text(`${d.data.value.toFixed(0)}`)
          .style("opacity", 0)
          .transition()
          .delay(1000)
          .duration(500)
          .style("opacity", 0.9);
      }
    });

    // Add legend
    const legendData = [
      { label: "Highest", color: colorScale(maxValue) },
      { label: "Medium", color: colorScale(maxValue / 2) },
      { label: "Lowest", color: colorScale(maxValue / 10) }
    ];

    const legend = g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(10, ${height - 100})`);

    legendData.forEach((item, i) => {
      const legendItem = legend.append("g")
        .attr("transform", `translate(0, ${i * 25})`);

      legendItem.append("circle")
        .attr("r", 8)
        .attr("fill", item.color)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1);

      legendItem.append("text")
        .attr("x", 15)
        .attr("y", 5)
        .style("font-size", "11px")
        .style("fill", "#cccccc")
        .text(item.label);
    });
  }

  function showEmptyState() {
    d3.select(svg).selectAll("*").remove();

    const g = d3.select(svg)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(20, 20)`);

    g.append("text")
      .attr("x", (width - 40) / 2)
      .attr("y", height / 2 - 20)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("fill", "#ffffff")
      .style("font-weight", "bold")
      .text("Loading Bubble Chart...");

    g.append("text")
      .attr("x", (width - 40) / 2)
      .attr("y", height / 2 + 10)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#999")
      .text(`Period: ${startYear}-${endYear}`);
  }

  $effect(() => {
    drawBubbleChart();
  });

  onMount(() => {
    drawBubbleChart();
  });
</script>

<div class="bubble-chart-container">
  {#if emissionsData && emissionsData.length > 0}
    <svg bind:this={svg}></svg>
    <div bind:this={tooltip} class="bubble-tooltip"></div>
  {:else}
    <div class="no-data">
      <p>Loading data...</p>
    </div>
  {/if}
</div>

<style>
  .bubble-chart-container {
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
    color: #999;
    padding: 2rem;
    font-style: italic;
  }

  svg {
    display: block;
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border-radius: 12px;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .bubble-tooltip {
    position: fixed;
    display: none;
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13px;
    pointer-events: none;
    z-index: 10000;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    line-height: 1.6;
  }

  :global(.bubble-chart-container circle) {
    transition: opacity 0.2s, stroke-width 0.2s;
  }
</style>
