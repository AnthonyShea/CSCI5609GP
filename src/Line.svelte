<script lang="ts">
    import * as d3 from "d3";
    import { onMount, afterUpdate } from "svelte";
  
    let { 
      countryData = null,
      selectedCountry = null,
      width = 400,
      height = 300
    } = $props<{
      countryData: { year: number; value: number }[] | null;
      selectedCountry: string | null;
      width?: number;
      height?: number;
    }>();
  
    let svg: SVGSVGElement;
    let margin = { top: 20, right: 30, bottom: 40, left: 50 };
    let innerWidth = width - margin.left - margin.right;
    let innerHeight = height - margin.top - margin.bottom;
  
    function drawChart() {
      if (!countryData || countryData.length === 0 || !selectedCountry) {
        d3.select(svg).selectAll("*").remove();
        return;
      }
  
      // Clear previous chart
      d3.select(svg).selectAll("*").remove();
  
      // Create scales
      const xScale = d3.scaleLinear()
        .domain(d3.extent(countryData, d => d.year) as [number, number])
        .range([0, innerWidth]);
  
      const yScale = d3.scaleLinear()
        .domain([0, d3.max(countryData, d => d.value) as number])
        .range([innerHeight, 0]);
  
      // Create line generator
      const line = d3.line<{ year: number; value: number }>()
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
        .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format("d")))
        .append("text")
        .attr("x", innerWidth / 2)
        .attr("y", 35)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .text("Year");
  
      // Add Y axis
      g.append("g")
        .call(d3.axisLeft(yScale))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -35)
        .attr("x", -innerHeight / 2)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .text("CO₂ Emissions (tons/capita)");
  
      // Add grid lines
      g.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale)
          .ticks(6)
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
  
      // Add line
      g.append("path")
        .datum(countryData)
        .attr("fill", "none")
        .attr("stroke", "#e74c3c")
        .attr("stroke-width", 2)
        .attr("d", line);
  
      // Add dots
      g.selectAll(".dot")
        .data(countryData)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(d.value))
        .attr("r", 4)
        .attr("fill", "#e74c3c")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);
  
      // Add title
      g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(`CO₂ Emissions: ${selectedCountry}`);
    }
  
    // Redraw chart when data changes
    $effect(() => {
      drawChart();
    });
  
    onMount(() => {
      drawChart();
    });
  </script>
  
  <div class="line-graph-container">
    {#if countryData && countryData.length > 0 && selectedCountry}
      <svg bind:this={svg}></svg>
    {:else}
      <div class="no-data">
        <p>Click on a country in the globe to view its CO₂ emissions timeline</p>
      </div>
    {/if}
  </div>
  
  <style>
    .line-graph-container {
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
  </style>