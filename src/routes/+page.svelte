<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import { Globe, Line, Bar } from "$lib";
  import type { TStateEmissions } from "../co2types_states";

  // Reactive data store
  let emissionsData: { entity: string; code: string; year: number; value: number }[] = $state([]);

  // Years range for slider
  let years: number[] = $derived(
    emissionsData.length > 0 ? [...new Set(emissionsData.map((d) => d.year))].sort((a, b) => a - b) : []
  );

  // Default to a safe year (updated post-load)
  let selectedYear: number = $state(1960);

  // Selected country for line graph
  let selectedCountry: string | null = $state(null);
  let selectedCountryData: { year: number; value: number }[] | null = $state(null);
  let selectedCountryName: string | null = $state(null);

  // Store data grouped by country code for efficient lookup
  let countryDataMap: Map<string, {year: number, value: number}[]> = $state(new Map());

  // US state data
  let TESTSTATEDATA: TStateEmissions[] = $state([])

  // Load CSV data
  async function loadCsv() {
    try {
      const csvUrl = "./co-emissions-per-capita.csv";
      const rawData = await d3.csv(csvUrl);
      emissionsData = rawData.map((row) => ({
        entity: row.Entity || "",
        code: row.Code || "",
        year: Number(row.Year) || 0,
        value: Number(row["Annual CO₂ emissions (per capita)"]) || 0,
      }));

      // Build country data map
      const tempMap = new Map<string, {year: number, value: number}[]>();
      emissionsData.forEach((d) => {
        if (d.code) {
          if (!tempMap.has(d.code)) {
            tempMap.set(d.code, []);
          }
          tempMap.get(d.code)!.push({ year: d.year, value: d.value });
        }
      });
      countryDataMap = tempMap;

      // Build state data map
      const csvUrlStates = "./co2_state_total.csv";
      //const stateData = [];
      await d3.csv(csvUrlStates).then((d) => {
        const years = d.columns.filter(col => !isNaN(parseInt(col)));

        d.forEach((row) => {
          years.forEach((year) => {
            TESTSTATEDATA.push({
              state: row.State,
              year: new Date(year),
              co2_total: Number(row[year])
            });
          });
        });
      });

      console.log("Loaded Emissions Data:", emissionsData.length, "rows");
    } catch (error) {
      console.error("Error loading CSV:", error);
    }
  }

  // Handle country click from globe
  function handleCountryClick(event: CustomEvent) {
    selectedCountry = event.detail.countryCode;
    selectedCountryName = event.detail.countryName;
    selectedCountryData = countryDataMap.get(selectedCountry) || null;
    
    if (selectedCountryData) {
      // Sort by year for the line graph
      selectedCountryData = [...selectedCountryData].sort((a, b) => a.year - b.year);
      console.log(`Selected ${selectedCountryName}:`, selectedCountryData.length, "data points");
    }
  }

  // Handle slider interaction
  function handleSliderInput(event: Event) {
    const target = event.target as HTMLInputElement;
    selectedYear = parseInt(target.value);
  }

  // Snap to latest year after data loads
  $effect(() => {
    if (years.length > 0 && selectedYear === 1960) {
      selectedYear = years[years.length - 1];
    }
  });

  onMount(async () => {
    await loadCsv();
  });
</script>

<div class="container">
  <h1>CO2 Emissions Per Capita Globe Visualization</h1>

  <div class="layout">
    <!-- Left side: Line graph for selected country -->
    <div class="left-panel">
      <div>
        {#if selectedCountryName == "United States of America"}
          <h2>
            United States of America CO2 Emissions by State
          </h2>
          <Bar
            states={TESTSTATEDATA}
          />
          <!---
          <Bar
            states={TESTSTATEDATA}
          />
          -->
        {/if}
      </div>
      <div>
      <h2>
        {#if selectedCountryName}
          {selectedCountryName} - CO₂ Emissions Timeline
        {:else}
          Country Emissions Timeline
        {/if}
      </h2>
        <Line 
          countryData={selectedCountryData}
          countryName={selectedCountryName}
          width={400}
          height={300}
        />
        {#if selectedCountryName}
          <div class="country-info">
            <p><strong>Country:</strong> {selectedCountryName}</p>
            <p><strong>Data Points:</strong> {selectedCountryData?.length || 0} years</p>
            <p><strong>Current Selection:</strong> {selectedYear}</p>
          </div>
        {:else}
          <div class="instructions">
            <p>Click on any country in the globe to view its complete CO₂ emissions timeline.</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Right side: Globe -->
    <div class="right-panel">
      <h2>Global CO2 Emissions ({selectedYear})</h2>
      
      <Globe 
        {emissionsData}
        {selectedYear}
        width={500}
        height={400}
        on:countryclick={handleCountryClick}
      />
      
      <!-- Year Slider -->
      {#if years.length > 0}
        <div class="slider-container">
          <label for="year-slider">Select Year: {selectedYear}</label>
          <input 
            id="year-slider"
            type="range" 
            value={selectedYear}
            on:input={handleSliderInput}
            min={years[0]} 
            max={years[years.length - 1]} 
            step="1"
            class="slider"
          />
          <div class="year-range">
            <span>{years[0]}</span>
            <span>{years[years.length - 1]}</span>
          </div>
        </div>
      {:else}
        <p>Loading data...</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .container {
    width: 90vw;
    margin: 10px auto;
    padding: 10px;
  }
  .layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-top: 1rem;
  }
  .left-panel, .right-panel {
    border: 1px solid #ddd;
    padding: 1rem;
    border-radius: 8px;
    min-height: 500px;
  }
  .left-panel {
    background-color: #f9f9f9;
    display: flex;
    flex-direction: column;
  }
  .country-info {
    margin-top: 1rem;
    padding: 1rem;
    background: white;
    border-radius: 4px;
    border-left: 4px solid #e74c3c;
  }
  .instructions {
    text-align: center;
    color: #666;
    font-style: italic;
    margin-top: 2rem;
  }
  .slider-container {
    margin-top: 1.5rem;
    text-align: center;
  }
  .slider {
    width: 100%;
    margin: 0.5rem 0;
  }
  .year-range {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: #666;
    margin-top: 0.25rem;
  }
  label {
    font-weight: bold;
    display: block;
    margin-bottom: 0.5rem;
  }
</style>