<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import BarChart from "$lib/BarChart.svelte";
  import PieChart from "$lib/PieChart.svelte";
  import AreaChart from "$lib/AreaChart.svelte";
  import ComparisonChart from "$lib/ComparisonChart.svelte";
  import NarrativeSection from "$lib/NarrativeSection.svelte";
  import { Globe/*, Line, Bar */} from "$lib";
  import type { TStateEmissions } from "../co2types_states";

  // Reactive data store
  let emissionsData: { entity: string; code: string; year: number; value: number }[] = $state([]);

  // Years range for slider - filter to valid range (1960-2023)
  let years: number[] = $derived(
    emissionsData.length > 0
      ? [...new Set(emissionsData.map((d) => d.year))]
          .filter(year => year >= 1800 && year <= 2023)
          .sort((a, b) => a - b)
      : []
  );

  // Default to 2020 (current data perspective)
  let selectedYear: number = $state(2020);

  // Selected country for line graph
  let selectedCountry: string | null = $state(null);
  let selectedCountryData: { year: number; value: number }[] | null = $state(null);
  let selectedCountryName: string | null = $state(null);

  // Multiple countries for comparison
  let comparisonCountries: string[] = $state([]);

  // Active narrative story
  let activeStoryId: string | null = $state(null);

  // Time jump animation trigger
  let timeJumpTrigger = $state(0);
  let isTimeJumping = $state(false);
  let timeJumpTargetYear = $state<number | null>(null);

  // Store data grouped by country code for efficient lookup
  let countryDataMap: Map<string, {year: number, value: number}[]> = $state(new Map());

  // Data-driven narrative stories
  const dataStories = [
    {
      id: "intro",
      title: "Measuring National Climate Impact",
      question: "How do we assess the climate responsibility of nations?",
      insight: "Per-capita CO₂ emissions provide a population-adjusted measure of individual contribution:",
      bullets: [
        "Expressed in metric tons of CO₂ per person annually",
        "Normalized for population size, enabling fair comparison",
        "Reveals disparities in per-person climate burden"
      ],
      type: "intro" as const,
      config: {
        year: 2020,
        chartFocus: "overview"
      }
    },
    {
      id: "story-1",
      title: "Current View: Per-Capita Emissions Today",
      question: "Which countries emit the most CO₂ per person in 2020?",
      insight: "Small oil-producing states record the highest per-capita emissions:",
      bullets: [
        "Qatar: 37 tons per person — more than 10 times the global average of 3.6 tons",
        "Kuwait and United Arab Emirates: over 30 tons per person",
        "Driven by fossil fuel extraction and low population density"
      ],
      type: "data-story" as const,
      config: {
        year: 2020,
        chartFocus: "bar",
        countries: ["QAT", "KWT", "ARE", "SAU"]
      }
    },
    {
      id: "story-2",
      title: "Historical Trajectories (1960–2020)",
      question: "How have per-capita emissions evolved over time?",
      insight: "In 1960, the United States led at 16 tons per capita; China emitted less than 1 ton. European nations ranged from 5 to 8 tons during post-war recovery. These patterns reflect the timing of industrial development.",
      bullets: [
        "Western industrialization began in the 19th century",
        "China’s emissions remained negligible until the late 20th century",
        "Early emitters established a lasting atmospheric footprint"
      ],
      type: "data-story" as const,
      config: {
        year: 1960,
        chartFocus: "comparison",
        countries: ["USA", "CHN", "GBR", "DEU"]
      }
    },
    {
      id: "story-3",
      title: "Cumulative Emissions (1850–2020)",
      question: "Which nations bear the greatest historical responsibility?",
      insight: "The United States and the 27 EU member states account for nearly 50% of all CO₂ emitted since 1850. China’s contribution, while large in recent decades, remains below 15% of the cumulative total.",
      bullets: [
        "Cumulative emissions quantify long-term climate debt",
        "Early industrializers dominate historical totals",
        "Recent growth in emerging economies has not yet overtaken this legacy"
      ],
      type: "data-story" as const,
      config: {
        year: 2020,
        chartFocus: "area",
        countries: ["USA", "CHN", "RUS", "IND", "JPN"]
      }
    },
    {
      id: "story-4",
      title: "Global Emissions Inequality",
      question: "How concentrated are global CO₂ emissions?",
      insight: "Ten countries are responsible for 68% of annual emissions. The 100 lowest-emitting nations contribute less than 5%. High-income populations have consumed the majority of the safe atmospheric carbon budget.",
      bullets: [
        "Emissions are highly skewed toward a small number of nations",
        "Low-income countries emit under 1 ton per person annually",
        "Inequality in emissions mirrors inequality in climate vulnerability"
      ],
      type: "data-story" as const,
      config: {
        year: 2020,
        chartFocus: "pie",
        countries: ["USA", "CHN", "QAT", "IND"]
      }
      
    },
    {
      id: "story-5",
      title: "The Speed of Transformation",
      question: "Can large economies decarbonize as rapidly as they industrialized?",
      insight: "Between 1990 and 2020, China increased per-capita emissions from 2 to 7.4 tons while expanding GDP per capita over tenfold. This rate of structural change demonstrates that rapid energy transitions are achievable within a single generation.",
      bullets: [
        "China’s emissions grew in lockstep with economic output",
        "The same institutional and investment capacity can now drive renewables",
        "Historical precedent supports aggressive decarbonization timelines"
      ],
      type: "data-story" as const,
      config: {
        year: 2020,
        chartFocus: "comparison",
        countries: ["CHN", "USA"]
      }
    },
    {
      id: "story-6",
      title: "Designing a Fair Pathway",
      question: "What does equitable climate action require?",
      insight: "Approximately 400 gigatons of CO₂ remain within a 1.5°C-compatible global budget. High-income nations must reduce emissions rapidly due to historical responsibility and capacity. Developing countries require supported transitions to avoid carbon-intensive growth.",
      bullets: [
        "Remaining budget demands immediate peak and decline in rich nations",
        "Per-capita convergence offers a transparent fairness framework",
        "Rapid deployment of clean energy is both necessary and feasible"
      ],
      type: "data-story" as const,
      config: {
        year: 2020,
        chartFocus: "scenario",
        countries: ["USA", "CHN", "IND", "DEU", "GBR"]
      }
    }
  ];

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

    // Add to comparison list (max 5 countries)
    if (selectedCountry && !comparisonCountries.includes(selectedCountry)) {
      comparisonCountries = [...comparisonCountries, selectedCountry].slice(-5);
    }

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

  function clearComparison() {
    comparisonCountries = []; // This should clear the array
  }

  // Function to handle country selection from globe
  function handleCountrySelect(countryCode) {
    if (!comparisonCountries.includes(countryCode)) {
      if (comparisonCountries.length < 5) {
        comparisonCountries = [...comparisonCountries, countryCode];
      } else {
        // Optional: show a message that max is reached
        console.log("Maximum of 5 countries reached");
      }
    }
  }

  // Handle narrative activation
  function handleNarrativeActivation(storyId: string, config?: any) {
    activeStoryId = storyId;

    if (config) {
      // Check if year is changing significantly (trigger animation)
      if (config.year !== undefined && config.year !== selectedYear) {
        const yearDifference = Math.abs(config.year - selectedYear);

        // Only trigger animation for significant jumps (> 5 years)
        if (yearDifference > 5) {
          isTimeJumping = true;
          timeJumpTargetYear = config.year;
          timeJumpTrigger++; // Increment to trigger animation

          // Hide indicator after animation completes (1.8s)
          setTimeout(() => {
            isTimeJumping = false;
            timeJumpTargetYear = null;
          }, 1800);
        }

        selectedYear = config.year;
      }

      // Update comparison countries if specified
      if (config.countries && config.countries.length > 0) {
        comparisonCountries = config.countries;
      }
    }
  }

  // Ensure selectedYear is within valid range
  $effect(() => {
    if (years.length > 0) {
      // If current year is outside valid range, snap to 2020 or latest
      if (selectedYear < years[0] || selectedYear > years[years.length - 1]) {
        selectedYear = years.includes(2020) ? 2020 : years[years.length - 1];
      }
    }
  });

  onMount(async () => {
    await loadCsv();
  });
</script>

<div class="container">
  <header class="page-header">
    <h1>The Story of Global CO₂ Emissions</h1>
    <p class="subtitle">A data-driven analysis of historical responsibility, current disparities, and pathways to equitable decarbonization</p>
  </header>

  <div class="layout">
    <!-- Left side: Scrollable narrative + charts panel -->
    <div class="left-panel">

      <!-- Intro Narrative -->
      <NarrativeSection
        story={dataStories[0]}
        isActive={activeStoryId === dataStories[0].id}
        onActivate={handleNarrativeActivation}
      />

      <!-- Explorer Mode Section
      <section class="chart-section explorer-mode">
        <h2>Click Any Country</h2>
        <p class="section-description">try clicking on any country on the globe to see its detailed emissions timeline.</p>
        <Line
          countryData={selectedCountryData}
          countryName={selectedCountryName}
          width={550}
          height={320}
        />
        {#if selectedCountryName}
          <div class="country-info">
            <p><strong>Country:</strong> {selectedCountryName}</p>
            <p><strong>Data Points:</strong> {selectedCountryData?.length || 0} years</p>
            <p><strong>Year:</strong> {selectedYear}</p>
          </div>
        {:else}
          <div class="instructions">
            <p>Click on any country in the globe to view its complete CO₂ emissions timeline</p>
          </div>
        {/if}
      </section> -->

      <!-- Story 1: Top Polluters
      <NarrativeSection
        story={dataStories[1]}
        isActive={activeStoryId === dataStories[1].id}
        onActivate={handleNarrativeActivation}
      /> -->

      <section class="chart-section">
        <NarrativeSection
          story={dataStories[1]}
          isActive={activeStoryId === dataStories[1].id}
          onActivate={handleNarrativeActivation}
        />
        <div class="chart-wrapper">
          <BarChart
            {emissionsData}
            {selectedYear}
            {selectedCountry}
            topN={10}
            width={550}
            height={400}
          />
        </div>
      </section>

      <!-- Story 2: Historical Leaders -->
      <section class="chart-section">
        <NarrativeSection
          story={dataStories[2]}
          isActive={activeStoryId === dataStories[2].id}
          onActivate={handleNarrativeActivation}
        />
        <div class="chart-wrapper">
          <ComparisonChart
            {emissionsData}
            selectedCountries={comparisonCountries}
            width={550}
            height={350}
          />
        </div>
      </section>

      <!-- Story 3: The Great Reversal -->
       <section class="chart-section">
        <NarrativeSection
          story={dataStories[3]}
          isActive={activeStoryId === dataStories[3].id}
          onActivate={handleNarrativeActivation}
        />
      </section>

      <!-- Story 4: Cumulative Picture -->
      <section class="chart-section">
        <NarrativeSection
          story={dataStories[4]}
          isActive={activeStoryId === dataStories[4].id}
          onActivate={handleNarrativeActivation}
        />
        <h2>Cumulative Emissions Over Time</h2>
        <div class="chart-wrapper">
          <AreaChart
            {emissionsData}
            selectedCountries={comparisonCountries}
            width={600}
            height={350}
          />
        </div>
        <div class="chart-wrapper">
          <PieChart
            {emissionsData}
            {selectedYear}
            {selectedCountry}
            width={600}
            height={400}
          />
        </div>
      </section>

      <!-- Story 5: Inequality -->
      <section class="chart-section">
        <NarrativeSection
          story={dataStories[5]}
          isActive={activeStoryId === dataStories[5].id}
          onActivate={handleNarrativeActivation}
        />
      </section>


      <!-- Story 6: Path Forward -->
      <section class="chart-section">

        <NarrativeSection
          story={dataStories[6]}
          isActive={activeStoryId === dataStories[6].id}
          onActivate={handleNarrativeActivation}
        />
      </section>

      <!-- Final CTA Section -->
      <section class="chart-section cta-section">
        <h2>Custom Exploration</h2>
        <p class="section-description">
          Now that you've seen the data story, continue exploring on your own.
          Use the globe to select countries.
        </p>
        
        <div class="comparison-controls">
          {#if comparisonCountries.length > 0}
            <p><strong>Currently comparing:</strong> {comparisonCountries.length} countries</p>
            <button onclick={clearComparison}>Clear Selection</button>
          {:else}
            <div class="instructions">
              <p><strong>Tip:</strong> Click multiple countries on the globe to add them to comparison (max 5)</p>
            </div>
          {/if}
        </div>
      
        <!-- ALWAYS render the chart, but control what it displays -->
        <div class="chart-wrapper">
          <ComparisonChart
            {emissionsData}
            selectedCountries={comparisonCountries}
            width={550}
            height={350}
          />
        </div>
      </section>

    </div>

    <!-- Right side: Fixed Globe -->
    <div class="right-panel">
      <div class="globe-sticky">
        <h2>Global CO₂ Emissions ({selectedYear})</h2>

        {#if emissionsData.length > 0}
          <Globe
            {emissionsData}
            {selectedYear}
            width={500}
            height={400}
            triggerTimeJump={timeJumpTrigger}
            on:countryclick={handleCountryClick}
          />
        {:else}
          <div class="loading-placeholder">
            <p>Loading globe visualization...</p>
          </div>
        {/if}

        <!-- Time Jump Indicator -->
        {#if isTimeJumping && timeJumpTargetYear}
          <div class="time-jump-indicator">
            <div class="time-jump-icon">🌍</div>
            <div class="time-jump-text">Time traveling to {timeJumpTargetYear}...</div>
          </div>
        {/if}

        <!-- Year Slider -->
        {#if years.length > 0}
          <div class="slider-container">
            <label for="year-slider">Select Year: {selectedYear}</label>
            <input
              id="year-slider"
              type="range"
              value={selectedYear}
              oninput={handleSliderInput}
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
</div>

<style>
/* Add this to target the main body background */
:global(body) {
    background: #1a1a1a !important;
    margin: 0;
    padding: 0;
    min-height: 100vh;
}

/* Also target the root HTML element */
:global(html) {
    background: #1a1a1a;
    margin: 0;
    padding: 0;
}

/* If there's a main app container */
:global(#app) {
    background: #1a1a1a;
}

/* If using SvelteKit, target the main layout */
:global(main) {
    background: #1a1a1a;
}

  .container {
    width: 95vw;
    max-width: 1600px;
    margin: 20px auto;
    padding: 0 20px;
    background: #1a1a1a;
    min-height: 100vh;
  }

  .page-header {
    text-align: center;
    margin-bottom: 3rem;
    padding: 2.5rem 1rem;
    background: linear-gradient(135deg, #333333 0%, #222222 100%);
    border-radius: 12px;
    color: #e0e0e0;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    position: relative;
    overflow: hidden;
  }

  .page-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 80%, rgba(100, 100, 100, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }

  h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2.5rem;
    font-weight: 600;
    color: #ffffff;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .subtitle {
    font-size: 1.1rem;
    margin: 0;
    opacity: 0.8;
    font-weight: 400;
    color: #cccccc;
  }

  .layout {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 2rem;
    margin-top: 1rem;
  }

  .left-panel {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    overflow-y: auto;
    max-height: calc(100vh - 120px);
    padding-right: 1rem;
  }

  .left-panel::-webkit-scrollbar {
    width: 8px;
  }

  .left-panel::-webkit-scrollbar-track {
    background: #2a2a2a;
    border-radius: 4px;
  }

  .left-panel::-webkit-scrollbar-thumb {
    background: #555555;
    border-radius: 4px;
  }

  .left-panel::-webkit-scrollbar-thumb:hover {
    background: #777777;
  }

  .right-panel {
    position: relative;
    height: calc(100vh - 120px);
    color: white; /* Add this line to make all text white */
  }

  /* Optional: If you want to be more specific about which elements get white text */
  .right-panel h2,
  .right-panel .loading-placeholder,
  .right-panel .loading-placeholder p {
    color: white;
  }

  /* If you need to ensure the globe text is also white */
  .right-panel :global(.globe-text),
  .right-panel :global(.country-label),
  .right-panel :global(.legend-text) {
    color: white;
    fill: white; /* For SVG text elements */
  }

  .globe-sticky {
    position: sticky;
    top: 20px;
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
  }

  .chart-section {
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1.5rem;
    padding-bottom: 2rem;
    border-radius: 12px;
    box-shadow: 
      0 4px 20px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
    position: relative;
  }

  .chart-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  }

  .chart-wrapper {
    margin-top: 1rem;
    overflow: visible;
    height: 400px;
    display: flex;
    justify-content: center;
  }

  .chart-section:hover {
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
  }

  .chart-section h2 {
    margin: 0 0 1rem 0;
    color: #ffffff;
    font-size: 1.3rem;
    border-bottom: 2px solid #666666;
    padding-bottom: 0.5rem;
    font-weight: 600;
  }

  .section-description {
    margin: 0 0 1.5rem 0;
    color: #aaaaaa;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .explorer-mode {
    border: 2px dashed #666666;
    background: linear-gradient(135deg, #2d2d2d 0%, #1f1f1f 100%);
  }

  .explorer-mode h2 {
    color: #888888;
    border-bottom-color: #777777;
  }

  .cta-section {
    background: linear-gradient(135deg, #2a3a2a 0%, #1a2a1a 100%);
    border: 2px solid #556655;
  }

  .cta-section h2 {
    color: #88aa88;
    border-bottom-color: #667766;
  }

  .country-info {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(60, 60, 60, 0.6);
    border-radius: 8px;
    border-left: 4px solid #777777;
    backdrop-filter: blur(5px);
  }

  .country-info p {
    margin: 0.5rem 0;
    color: #cccccc;
  }

  .instructions {
    text-align: center;
    color: #999999;
    font-style: italic;
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(60, 60, 60, 0.4);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .comparison-controls {
    margin-bottom: 1rem;
    padding: 1rem;
    background: rgba(80, 80, 100, 0.3);
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .comparison-controls p {
    margin: 0;
    color: #aaaaaa;
  }

  button {
    padding: 0.5rem 1.5rem;
    background: linear-gradient(135deg, #666666 0%, #555555 100%);
    color: #e0e0e0;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  button:hover {
    background: linear-gradient(135deg, #777777 0%, #666666 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .slider-container {
    margin-top: 1.5rem;
    text-align: center;
  }

  .slider {
    width: 100%;
    margin: 0.5rem 0;
    cursor: pointer;
    background: #404040;
    border-radius: 4px;
    height: 6px;
  }

  .slider::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #888888;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  .year-range {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: #999999;
    margin-top: 0.25rem;
  }

  label {
    font-weight: 500;
    display: block;
    margin-bottom: 0.5rem;
    color: #cccccc;
  }

  /* Time Jump Indicator */
  .time-jump-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(80, 80, 80, 0.95);
    color: #e0e0e0;
    padding: 1.5rem 2rem;
    border-radius: 12px;
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.1);
    animation: fadeInOut 1.8s ease-in-out;
    z-index: 1000;
    text-align: center;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .time-jump-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    animation: spin 1s linear infinite;
    color: #888888;
  }

  .time-jump-text {
    font-size: 1.2rem;
    font-weight: 500;
    color: #ffffff;
  }

  @keyframes fadeInOut {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.8);
    }
    20% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    80% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.8);
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Global body styling */
  body {
    background: #1a1a1a;
    color: #e0e0e0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Responsive design */
  @media (max-width: 1200px) {
    .layout {
      grid-template-columns: 1fr;
    }

    .right-panel {
      height: auto;
    }

    .globe-sticky {
      position: relative;
      top: 0;
    }

    .left-panel {
      max-height: none;
      overflow-y: visible;
    }
  }

  /* Additional dark theme enhancements */
  input, select, textarea {
    background: #2a2a2a;
    border: 1px solid #404040;
    color: #e0e0e0;
    border-radius: 6px;
    padding: 0.5rem;
  }

  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: #666666;
    box-shadow: 0 0 0 2px rgba(102, 102, 102, 0.2);
  }
</style>