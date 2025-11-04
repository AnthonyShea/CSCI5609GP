<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import { Globe, Line } from "$lib";

  // Reactive data store
  let emissionsData: { entity: string; code: string; year: number; value: number }[] = $state([]);

  // Years range for slider - filter to valid range (1960-2023)
  let years: number[] = $derived(
    emissionsData.length > 0
      ? [...new Set(emissionsData.map((d) => d.year))]
          .filter(year => year >= 1960 && year <= 2023)
          .sort((a, b) => a - b)
      : []
  );

  // Default to a safe year (updated post-load)
  let selectedYear: number = $state(2020);

  // Selected country for line graph
  let selectedCountry: string | null = $state(null);
  let selectedCountryData: { year: number; value: number }[] | null = $state(null);
  let selectedCountryName: string | null = $state(null);

<<<<<<< Updated upstream
  // Store data grouped by country code for efficient lookup
  let countryDataMap: Map<string, {year: number, value: number}[]> = $state(new Map());

=======
  // Multiple countries for comparison
  let comparisonCountries: string[] = $state([]);

  // Active narrative story
  let activeStoryId: string | null = $state(null);

  // Time jump animation trigger
  let timeJumpTrigger = $state(0);
  let previousYear = $state(2020);
  let isTimeJumping = $state(false);
  let timeJumpTargetYear = $state<number | null>(null);

  // Store data grouped by country code for efficient lookup
  let countryDataMap: Map<string, {year: number, value: number}[]> = $state(new Map());

  // Data-driven narrative stories - CONTINUOUS TIMELINE
  const dataStories = [
    {
      id: "intro",
      title: "Understanding Global CO₂ Emissions",
      question: "How do we measure the climate impact of nations?",
      insight: "Per-capita emissions reveal individual climate impact:",
      bullets: [
        "Measures tons of CO₂ per person, not just total",
        "Accounts for population size",
        "Shows who pollutes most per individual"
      ],
      type: "intro" as const,
      config: {
        year: 2020,
        chartFocus: "overview"
      }
    },
    {
      id: "story-1",
      title: "Top Polluters Today",
      question: "Who are the biggest per-capita polluters today (2020)?",
      insight: "Oil-rich nations dominate:",
      bullets: [
        "Qatar: 37 tons/person (highest in world)",
        "Kuwait & UAE: 30+ tons/person",
        "10x higher than global average",
        "Economies heavily dependent on fossil fuels"
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
      title: "Journey Back in Time",
      question: "Has it always been this way? Let's travel back to 1960...",
      insight: "A very different world in 1960:",
      bullets: [
        "USA led at 16 tons/person",
        "China was under 1 ton/person",
        "Western nations dominated emissions",
        "Most of Asia & Africa barely registered"
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
      title: "The Oil Crisis Era",
      question: "What happened during the 1973 oil crisis?",
      insight: "Energy consumption patterns shifted:",
      bullets: [
        "Oil prices quadrupled overnight",
        "Western nations began efficiency efforts",
        "Oil producers gained economic power",
        "First major climate policy discussions began"
      ],
      type: "data-story" as const,
      config: {
        year: 1973,
        chartFocus: "comparison",
        countries: ["USA", "SAU", "IRN", "GBR"]
      }
    },
    {
      id: "story-4",
      title: "The End of the Cold War",
      question: "How did 1990 change the emissions landscape?",
      insight: "Major geopolitical shifts:",
      bullets: [
        "Soviet Union collapsed → Russia's emissions dropped",
        "China's economic reforms accelerating",
        "Manufacturing began shifting to Asia",
        "Europe unified, started environmental policies"
      ],
      type: "data-story" as const,
      config: {
        year: 1990,
        chartFocus: "comparison",
        countries: ["CHN", "USA", "RUS", "DEU"]
      }
    },
    {
      id: "story-5",
      title: "China's Dramatic Rise",
      question: "How did China transform by 2010?",
      insight: "The world's factory emerges:",
      bullets: [
        "China: 2 tons (1990) → 7.4 tons (2010)",
        "Became world's manufacturing hub",
        "USA remained stable at 15-16 tons",
        "India also rising but slower"
      ],
      type: "data-story" as const,
      config: {
        year: 2010,
        chartFocus: "comparison",
        countries: ["CHN", "USA", "IND", "DEU"]
      }
    },
    {
      id: "story-6",
      title: "Back to Today",
      question: "Where do we stand now in 2020?",
      insight: "Current state of emissions:",
      bullets: [
        "Top 10 countries account for 60% of emissions",
        "Massive inequality: 30+ tons vs <1 ton per person",
        "Wealthy nations = historical responsibility",
        "Poorer nations = worst climate impacts"
      ],
      type: "data-story" as const,
      config: {
        year: 2020,
        chartFocus: "pie",
        countries: ["USA", "CHN", "QAT", "IND"]
      }
    },
    {
      id: "story-7",
      title: "The Path Forward",
      question: "What does the data tell us about climate action?",
      insight: "Key insights for the future:",
      bullets: [
        "Rich nations must lead - they have tech & resources",
        "Historical responsibility matters",
        "Rapid change IS possible (see China's transformation)",
        "Support needed for clean development in emerging economies"
      ],
      type: "data-story" as const,
      config: {
        year: 2020,
        chartFocus: "comparison",
        countries: ["USA", "CHN", "IND", "DEU", "GBR"]
      }
    }
  ];

>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  // Snap to latest year after data loads
=======
  // Clear comparison countries
  function clearComparison() {
    comparisonCountries = [];
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

          // Hide indicator after animation completes (1.5s)
          setTimeout(() => {
            isTimeJumping = false;
            timeJumpTargetYear = null;
          }, 1800);
        }

        previousYear = selectedYear;
        selectedYear = config.year;
      }

      // Update comparison countries if specified
      if (config.countries && config.countries.length > 0) {
        comparisonCountries = config.countries;
      }
    }
  }

  // Ensure selectedYear is within valid range
>>>>>>> Stashed changes
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
  <h1>CO2 Emissions Per Capita Globe Visualization</h1>

  <div class="layout">
    <!-- Left side: Line graph for selected country -->
    <div class="left-panel">
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
<<<<<<< Updated upstream
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
=======

      <section class="chart-section">
        <h2>📊 Top 10 Countries by Per-Capita Emissions</h2>
        <BarChart
          {emissionsData}
          {selectedYear}
          {selectedCountry}
          topN={10}
          width={550}
          height={400}
        />
      </section>

      <!-- Story 2: Historical Leaders -->
      <NarrativeSection
        story={dataStories[2]}
        isActive={activeStoryId === dataStories[2].id}
        onActivate={handleNarrativeActivation}
      />

      <section class="chart-section">
        <h2>📈 Historical Comparison</h2>
        <p class="section-description">Compare how different nations' emissions evolved from 1960 to today.</p>
        <ComparisonChart
          {emissionsData}
          selectedCountries={comparisonCountries}
          width={550}
          height={350}
        />
      </section>

      <!-- Story 3: Oil Crisis 1973 -->
      <NarrativeSection
        story={dataStories[3]}
        isActive={activeStoryId === dataStories[3].id}
        onActivate={handleNarrativeActivation}
      />

      <!-- Story 4: End of Cold War 1990 -->
      <NarrativeSection
        story={dataStories[4]}
        isActive={activeStoryId === dataStories[4].id}
        onActivate={handleNarrativeActivation}
      />

      <!-- Story 5: China's Rise 2010 -->
      <NarrativeSection
        story={dataStories[5]}
        isActive={activeStoryId === dataStories[5].id}
        onActivate={handleNarrativeActivation}
      />

      <section class="chart-section">
        <h2>📉 Cumulative Emissions Over Time</h2>
        <p class="section-description">This stacked area chart shows how different countries contributed to emissions as we progressed through history.</p>
        <AreaChart
          {emissionsData}
          selectedCountries={comparisonCountries}
          width={550}
          height={350}
        />
      </section>

      <!-- Story 6: Back to Today 2020 -->
      <NarrativeSection
        story={dataStories[6]}
        isActive={activeStoryId === dataStories[6].id}
        onActivate={handleNarrativeActivation}
      />

      <section class="chart-section">
        <h2>🥧 Global Emissions Distribution Today</h2>
        <p class="section-description">See how emissions are distributed among the world's nations in 2020.</p>
        <PieChart
          {emissionsData}
          {selectedYear}
          {selectedCountry}
          width={500}
          height={450}
        />
      </section>

      <!-- Story 7: Path Forward -->
      <NarrativeSection
        story={dataStories[7]}
        isActive={activeStoryId === dataStories[7].id}
        onActivate={handleNarrativeActivation}
      />

      <!-- Final CTA Section -->
      <section class="chart-section cta-section">
        <h2>🌍 Your Turn to Explore</h2>
        <p class="section-description">
          Now that you've seen the data story, continue exploring on your own.
          Use the globe and year slider to discover more insights.
        </p>
        {#if comparisonCountries.length > 0}
          <div class="comparison-controls">
            <p><strong>Currently comparing:</strong> {comparisonCountries.length} countries</p>
            <button on:click={clearComparison}>Clear Selection</button>
          </div>
          <ComparisonChart
            {emissionsData}
            selectedCountries={comparisonCountries}
            width={550}
            height={350}
          />
        {:else}
          <div class="instructions">
            <p>💡 <strong>Tip:</strong> Click multiple countries on the globe to add them to comparison (max 5)</p>
          </div>
        {/if}
      </section>

>>>>>>> Stashed changes
    </div>

    <!-- Right side: Globe -->
    <div class="right-panel">
<<<<<<< Updated upstream
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
=======
      <div class="globe-sticky">
        <h2>Global CO₂ Emissions ({selectedYear})</h2>

        <!-- Time Jump Indicator -->
        {#if isTimeJumping && timeJumpTargetYear}
          <div class="time-jump-indicator">
            <div class="time-jump-icon">🌍⚡</div>
            <p class="time-jump-text">
              Time traveling to <strong>{timeJumpTargetYear}</strong>...
            </p>
          </div>
        {/if}

        <Globe
          {emissionsData}
          {selectedYear}
          width={500}
          height={400}
          triggerTimeJump={timeJumpTrigger}
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
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======

  .left-panel::-webkit-scrollbar {
    width: 8px;
  }

  .left-panel::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  .left-panel::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  .left-panel::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  .right-panel {
    position: relative;
    height: calc(100vh - 120px);
  }

  .globe-sticky {
    position: sticky;
    top: 20px;
    background: white;
    border: 1px solid #ddd;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    position: relative;
  }

  .time-jump-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(102, 126, 234, 0.95);
    color: white;
    padding: 1.5rem 2rem;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
    z-index: 1000;
    text-align: center;
    animation: fadeInOut 1.8s ease-in-out;
    pointer-events: none;
  }

  .time-jump-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    animation: spin 1s linear infinite;
  }

  .time-jump-text {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
  }

  .time-jump-text strong {
    font-size: 1.4rem;
    display: block;
    margin-top: 0.3rem;
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

  .chart-section {
    background: white;
    border: 1px solid #e0e0e0;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    transition: box-shadow 0.3s ease;
  }

  .chart-section:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .chart-section h2 {
    margin: 0 0 1rem 0;
    color: #34495e;
    font-size: 1.3rem;
    border-bottom: 2px solid #3498db;
    padding-bottom: 0.5rem;
  }

  .section-description {
    margin: 0 0 1.5rem 0;
    color: #6c757d;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .explorer-mode {
    border: 2px dashed #667eea;
    background: linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%);
  }

  .explorer-mode h2 {
    color: #667eea;
    border-bottom-color: #667eea;
  }

  .cta-section {
    background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
    border: 2px solid #4caf50;
  }

  .cta-section h2 {
    color: #2e7d32;
    border-bottom-color: #4caf50;
  }

>>>>>>> Stashed changes
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