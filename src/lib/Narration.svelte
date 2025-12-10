<script lang="ts"> 
    import { base } from '$app/paths';
  
    export let selectedYear: number; 
  </script>
  
  <aside class="sidebar-container">
    <h2>Global CO₂ Emissions History</h2>

    <p>
        The data shown on this interactive globe illustrates the rapid acceleration of CO₂ release driven by human activity since the mid-18th century.
    </p>

    <hr> <h3>The Pre-Industrial Baseline</h3>
    <ul>
        <li><strong>Timeframe:</strong> Prior to 1750.</li>
        <li><strong>Concentration:</strong> Stable at 280 ppm.</li>
        <button class="jump-btn" on:click={() => selectedYear = 1750}>View 1750 on Globe</button>
        <img src="{base}/grass.jpg" alt="Industrial Revolution era factory" class="narration-image" />
    </ul>

    <hr>

    <h3>The Industrial Revolution</h3>
    <ul>
        <li><strong>Timeframe:</strong> c. 1750 – 1900.</li>
        <li><strong>Driver:</strong> Mass combustion of coal and the steam engine.</li>
        <li><strong>Visual:</strong> Emergence of distinct, concentrated emission hotspots in Western Europe and the US.</li>
        <button class="jump-btn" on:click={() => selectedYear = 1850}>View 1850 on Globe</button>
        <img src="{base}/industrial_rev.avif" alt="Industrial Revolution era factory" class="narration-image" />
    </ul>

    <hr>

    <h3>The Petroleum Age</h3>
    <ul>
        <li><strong>Timeframe:</strong> c. 1900 – 1950.</li>
        <li><strong>Driver:</strong> Adoption of oil, expansion of transportation and mechanized industry, especially accross North America.</li>
        <button class="jump-btn" on:click={() => selectedYear = 1920}>View 1920 on Globe</button>
        <img src="{base}/oil.jpg" alt="Industrial Revolution era factory" class="narration-image" />
    </ul>

    <hr>

    <h3>The Great Acceleration</h3>
    <ul>
        <li><strong>Timeframe:</strong> 1950 – 2011.</li>
        <li><strong>Driver:</strong> Rapid globalization, economic growth, and industrialization across continents.</li>
        <li><strong>Visual:</strong> Exponential spike in overall intensity, forming a dense, globalized network of high-emission points.</li>
        <button class="jump-btn" on:click={() => selectedYear = 1975}>View 1975 on Globe</button>
        <img src="{base}/ship.jpg" alt="Industrial Revolution era factory" class="narration-image" />
    </ul>

    <hr>

    <h3>Per Capita Stabilization</h3>
    <ul>
        <li><strong>Timeframe:</strong> 2011 – Present.</li>
        <li><strong>Trend:</strong> While absolute emissions rise, global <em>per capita</em> emissions have not increased since 2011.</li>
        <li><strong>Context:</strong> Countries are gradually shifting toward renewable energy and EVs, though total emissions must still be reversed to meet climate commitments.</li>
        <button class="jump-btn" on:click={() => selectedYear = 2015}>View 2015 on Globe</button>
        <img src="{base}/rernew.webp" alt="Industrial Revolution era factory" class="narration-image" />
    </ul>

    <hr>

    <h3>The COVID-19 Fluctuation</h3>
    <ul>
        <li><strong>Timeframe:</strong> 2020 – 2021.</li>
        <li><strong>Impact:</strong> Largest annual drop in history (1.5 GtCO₂)—roughly equivalent to Japan's annual output and twice the size of the 1992 Soviet dissolution drop.</li>
        <li><strong>Result:</strong> The dip was temporary. Emissions rebounded quickly as economies resumed, with 2021 surpassing 2019 levels.</li>
        <button class="jump-btn" on:click={() => selectedYear = 2022}>View 2022 on Globe</button>
        <img src="{base}/mask.webp" alt="Industrial Revolution era factory" class="narration-image" />
    </ul>
</aside>
  
  <style>
    /* The sidebar should be positioned on the right, as requested */
    .sidebar-container {
      position: absolute; /* Relative to the globe-container parent */
      top: 0;
      left: 0;
      width: 350px; /* Adjust as needed */
      height: 100vh; /* Full height */
      z-index: 5; /* Ensure it is above the globe but maybe below tooltips */
      background: rgba(0, 0, 0, 0.85); /* Dark background for contrast */
      color: white;
      padding: 20px;
      overflow-y: auto; /* Allow scrolling for long narratives */
      font-family: sans-serif;
      box-shadow: -5px 0 10px rgba(0, 0, 0, 0.5);
      scrollbar-width: none;
    }
  
    h2 {
      margin-top: 0;
      border-bottom: 1px solid #333;
      padding-bottom: 10px;
    }

    .jump-btn {
        display: block;
        width: 100%;
        margin: 10px 0;
        padding: 8px 12px;
        background-color: #4a90e2; /* Bright blue for interaction */
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        text-transform: uppercase;
        font-size: 0.8rem;
        transition: background 0.3s ease;
    }

    .jump-btn:hover {
        background-color: #357abd; /* Darker blue on hover */
    }
    .narration-image {
    width: 90%;  /* Changed from 100% to 50% */
    height: auto;
    margin: 10px 0;
    border-radius: 4px;
    border: 1px solid #444;
    display: block;  /* Helps with centering if you want */
    margin-left: auto;  /* Centers the image */
    margin-right: auto;  /* Centers the image */
  }
  </style>