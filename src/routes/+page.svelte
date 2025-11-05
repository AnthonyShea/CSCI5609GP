<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import { Globe, Line } from "$lib";
  import BarChart from "$lib/BarChart.svelte";
  import PieChart from "$lib/PieChart.svelte";
  import AreaChart from "$lib/AreaChart.svelte";
  import ComparisonChart from "$lib/ComparisonChart.svelte";
  import NarrativeSection from "$lib/NarrativeSection.svelte";

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

  // Store data grouped by country code for efficient lookup
  let countryDataMap: Map<string, {year: number, value: number}[]> = $state(new Map());

  // Data-driven narrative stories
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
      question: "Who are the biggest per-capita polluters in 2020?",
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
      title: "The Historical Leaders",
      question: "Has it always been this way?",
      insight: "In 1960, the USA led global emissions at 16 tons/capita while China was under 1 ton/capita. This dramatic difference reflects the early industrialization of Western nations and the agricultural economy of China at that time.",
      type: "data-story" as const,
      config: {
        year: 1960,
        chartFocus: "comparison",
        countries: ["USA", "CHN", "GBR", "DEU"]
      }
    },
    {
      id: "story-3",
      title: "The Great Reversal",
      question: "How did China's emissions grow so rapidly?",
      insight: "From 1990 to 2020, China transformed from an agricultural economy to the world's factory. Its per-capita emissions grew from 2 to 7.4 tons, while the USA's remained relatively stable around 15-16 tons. This shift reflects China's rapid industrialization and manufacturing boom.",
      type: "data-story" as const,
      config: {
        year: 2010,
        chartFocus: "comparison",
        countries: ["CHN", "USA", "IND"]
      }
    },
    {
      id: "story-4",
      title: "The Cumulative Picture",
      question: "Which countries contribute most to cumulative emissions over time?",
      insight: "When we look at stacked emissions, the USA, China, and Europe dominate the cumulative total. While China's recent growth is dramatic, the USA's consistently high emissions over decades have created an enormous cumulative impact on global warming.",
      type: "data-story" as const,
      config: {
        year: 2015,
        chartFocus: "area",
        countries: ["USA", "CHN", "RUS", "IND", "JPN"]
      }
    },
    {
      id: "story-5",
      title: "The Inequality Story",
      question: "How unequal are global emissions?",
      insight: "The top 10 emitters account for over 60% of global per-capita emissions. Meanwhile, many developing nations produce less than 1 ton per person. This inequality matters: wealthy nations have contributed most to historical warming, while poorer nations face the worst climate impacts.",
      type: "data-story" as const,
      config: {
        year: 2020,
        chartFocus: "pie",
        countries: ["USA", "CHN", "QAT", "IND"]
      }
    },
    {
      id: "story-6",
      title: "The Path Forward",
      question: "What does the data tell us about climate action?",
      insight: "Rich nations must lead emission reductions - they have the technology, resources, and historical responsibility. Emerging economies need support for clean growth. The data shows that rapid change IS possible: look at how quickly China industrialized. The same speed can drive decarbonization.",
      type: "data-story" as const,
      config: {
        year: 2020,
        chartFocus: "comparison",
        countries: ["USA", "CHN", "IND", "DEU", "GBR"]
      }
    }
  ];

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

  // Clear comparison countries
  function clearComparison() {
    comparisonCountries = [];
  }

  // Handle narrative activation
  function handleNarrativeActivation(storyId: string, config?: any) {
    activeStoryId = storyId;

    if (config) {
      // Update year if specified
      if (config.year !== undefined) {
        selectedYear = config.year;
      }

      // Update comparison countries if specified
      if (config.countries && config.countries.length > 0) {
        comparisonCountries = config.countries;
      }

      // You could add more logic here, like:
      // - Auto-clicking a specific country on the globe
      // - Highlighting specific bars in charts
      // - Animating transitions between states
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
    <p class="subtitle">An interactive data exploration revealing who pollutes, how much, and why it matters</p>
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

      <!-- Explorer Mode Section -->
      <section class="chart-section explorer-mode">
        <h2>🔍 Explore Mode: Click Any Country</h2>
        <p class="section-description">Before we dive into the data story, try clicking on any country on the globe to see its detailed emissions timeline.</p>
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
            <p>👆 Click on any country in the globe to view its complete CO₂ emissions timeline</p>
          </div>
        {/if}
      </section>

      <!-- Story 1: Top Polluters -->
      <NarrativeSection
        story={dataStories[1]}
        isActive={activeStoryId === dataStories[1].id}
        onActivate={handleNarrativeActivation}
      />

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

      <!-- Story 3: The Great Reversal -->
      <NarrativeSection
        story={dataStories[3]}
        isActive={activeStoryId === dataStories[3].id}
        onActivate={handleNarrativeActivation}
      />

      <!-- Story 4: Cumulative Picture -->
      <NarrativeSection
        story={dataStories[4]}
        isActive={activeStoryId === dataStories[4].id}
        onActivate={handleNarrativeActivation}
      />

      <section class="chart-section">
        <h2>📉 Cumulative Emissions Over Time</h2>
        <p class="section-description">This stacked area chart shows how different countries contributed to total emissions over decades.</p>
        <AreaChart
          {emissionsData}
          selectedCountries={comparisonCountries}
          width={550}
          height={350}
        />
      </section>

      <!-- Story 5: Inequality -->
      <NarrativeSection
        story={dataStories[5]}
        isActive={activeStoryId === dataStories[5].id}
        onActivate={handleNarrativeActivation}
      />

      <section class="chart-section">
        <h2>🥧 Global Emissions Distribution</h2>
        <p class="section-description">See how emissions are distributed among the world's top polluters.</p>
        <PieChart
          {emissionsData}
          {selectedYear}
          {selectedCountry}
          width={500}
          height={450}
        />
      </section>

      <!-- Story 6: Path Forward -->
      <NarrativeSection
        story={dataStories[6]}
        isActive={activeStoryId === dataStories[6].id}
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
            <button onclick={clearComparison}>Clear Selection</button>
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
            on:countryclick={handleCountryClick}
          />
        {:else}
          <div class="loading-placeholder">
            <p>Loading globe visualization...</p>
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
</div>

<style>
  .container {
    width: 95vw;
    max-width: 1600px;
    margin: 20px auto;
    padding: 0 20px;
  }

  .page-header {
    text-align: center;
    margin-bottom: 3rem;
    padding: 2rem 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    color: white;
  }

  h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2.5rem;
    font-weight: 700;
  }

  .subtitle {
    font-size: 1.1rem;
    margin: 0;
    opacity: 0.95;
    font-weight: 400;
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

  .country-info {
    margin-top: 1rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 6px;
    border-left: 4px solid #e74c3c;
  }

  .country-info p {
    margin: 0.5rem 0;
  }

  .instructions {
    text-align: center;
    color: #666;
    font-style: italic;
    margin-top: 1rem;
    padding: 1rem;
    background: #f0f0f0;
    border-radius: 6px;
  }

  .comparison-controls {
    margin-bottom: 1rem;
    padding: 1rem;
    background: #e3f2fd;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .comparison-controls p {
    margin: 0;
    color: #1976d2;
  }

  button {
    padding: 0.5rem 1rem;
    background: #e74c3c;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background 0.2s;
  }

  button:hover {
    background: #c0392b;
  }

  .slider-container {
    margin-top: 1.5rem;
    text-align: center;
  }

  .slider {
    width: 100%;
    margin: 0.5rem 0;
    cursor: pointer;
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
    color: #2c3e50;
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
</style>