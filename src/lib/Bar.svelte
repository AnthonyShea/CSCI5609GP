<script lang="ts">
  import type { TStateEmissions } from "../co2types_states";
  import * as d3 from "d3";
  // define the props of the Bar component
  type Props = {
    states: TStateEmissions[];
    progress?: number;
    width?: number;
    height?: number;
  };
  // progress is 100 by default unless specified
  let { states, progress = 100, width = 800, height = 300 }: Props = $props();

  let selectedState: string = $state();

  // processing the data; $derived is used to create a reactive variable that updates whenever the dependent variables change
  const yearRange = $derived(d3.extent(states.map((d) => d.year)));

  function getUpYear(yearRange: [undefined, undefined] | [Date, Date]) {
    if (!yearRange[0]) return new Date();
    const timeScale = d3.scaleTime().domain(yearRange).range([0, 100]);
    return timeScale.invert(progress);
  }
  const upYear: Date = $derived(getUpYear(yearRange!));

  function getStateCO2Nums(states: TStateEmissions[], upYear: Date) {
    return [];
  }

  const stateNums = $derived(getStateCO2Nums(states, upYear));

  // drawing the bar chart

  const margin = {
    top: 15,
    bottom: 50,
    left: 50,
    right: 10,
  };

  let usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
  };

  const xScale = $derived(
    // tip: use d3.scaleBand() to create a band scale for the x-axis
    // d3
    //   .scaleBand()
    //   .range(xx)
    //   .domain(xx)
    //   .padding(xx),
    d3
      //.scaleTime()
      .scaleBand()
      .range([50, width - margin.right])
      .domain(states.map((d) => d.state))
      .padding(0.1)
  );

  const yScale = $derived(
    // tip: use d3.scaleLinear() to create a linear scale for the y-axis
    // d3
    //   .scaleLinear()
    //   .range(xx)
    //   .domain(xxx),
    d3
      .scaleLinear()
      .range([margin.top, height-margin.bottom])
      .domain([700, 0]),
  );

  const xBarwidth: number = $derived(xScale.bandwidth());

  let xAxis: any = $state(),
    yAxis: any = $state();

  function updateAxis() {
    d3.select(xAxis)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "start");

    d3.select(yAxis)
      .call(d3.axisLeft(yScale))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -35)
      .attr("x", -innerHeight / 3.5)
      .attr("fill", "black")
      .style("text-anchor", "middle")
      .text("CO₂ Emissions (million metric tons)");
    // tip:
    // similar to the x-axis, create a y-axis using d3.axisLeft() and bind it to the yAxis variable
  }

  // the $effect function is used to run a function whenever the reactive variables change, also known as a side effect
  $effect(() => {
    updateAxis();
  });
</script>

{#if states.length > 0}
  <svg {width} {height}>
    <g class="bars">
      {#each states as state}
        <rect
          width={xBarwidth}
          height={yScale(0) - yScale(state.co2_total)}
          x={xScale(state.state)}
          y={yScale(state.co2_total)}
          fill="red"
          class="bar"
          opacity={0.5}
          role="figure"
          onmouseover={(e) => {
            d3.select(e.currentTarget);
              //.attr("opacity", 1);

            selectedState = state.state;
          }}
          onfocus={()=>{}}
        />
      {/each}
    </g>
    <g transform="translate(0, {usableArea.bottom})" bind:this={xAxis} />
    <g transform="translate({usableArea.left}, 0)" bind:this={yAxis} />
  </svg>
{/if}

<style>
  .bar {
    transition:
      y 0.1s ease,
      height 0.1s ease,
      width 0.1s ease; /* Smooth transition for height */
  }
</style>
