<script>
    // You can add logic here if the sidebar needs to be interactive
  </script>
  
  <aside class="sidebar-container">
    <h2>Global CO₂ Emissions History</h2>

    <p>
        The data shown on this interactive globe illustrates the rapid acceleration of CO₂ release driven by human activity since the mid-18th century.
    </p>

    <hr> <h3>The Pre-Industrial Baseline</h3>
    <ul>
        <li><strong>Timeframe:</strong> Prior to 1750.</li>
        <li><strong>Concentration:</strong> Stable at **280** ppm.</li>
        <li><strong>Visual:</strong> Minimal, uniform baseline across the globe.</li>
    </ul>

    <hr>

    <h3>The Industrial Revolution</h3>
    <ul>
        <li><strong>Timeframe:</strong> c. 1750 – 1900.</li>
        <li><strong>Driver:</strong> Mass combustion of coal and the steam engine.</li>
        <li><strong>Visual:</strong> Emergence of distinct, concentrated emission hotspots in Western Europe and the US.</li>
        <img src="/industrial_rev.avif" alt="Industrial Revolution era factory" class="narration-image" />
    </ul>

    <hr>

    <h3>The Petroleum Age</h3>
    <ul>
        <li><strong>Timeframe:</strong> c. 1900 – 1950.</li>
        <li><strong>Driver:</strong> Adoption of oil, expansion of transportation and mechanized industry.</li>
        <li><strong>Visual:</strong> Emission sources begin to spread, covering more of the industrialized Northern Hemisphere.</li>
    </ul>

    <hr>

    <h3>The Great Acceleration</h3>
    <ul>
        <li><strong>Timeframe:</strong> 1950 – Present.</li>
        <li><strong>Driver:</strong> Rapid globalization, economic growth, and industrialization across continents.</li>
        <li><strong>Visual:</strong> Exponential spike in overall intensity, forming a dense, globalized network of high-emission points.</li>
    </ul>
</aside>
  
  <style>
    /* The sidebar should be positioned on the right, as requested */
    .sidebar-container {
      position: absolute; /* Relative to the globe-container parent */
      top: 0;
      right: 0;
      width: 350px; /* Adjust as needed */
      height: 100vh; /* Full height */
      z-index: 5; /* Ensure it is above the globe but maybe below tooltips */
      background: rgba(0, 0, 0, 0.85); /* Dark background for contrast */
      color: white;
      padding: 20px;
      overflow-y: auto; /* Allow scrolling for long narratives */
      font-family: sans-serif;
      box-shadow: -5px 0 10px rgba(0, 0, 0, 0.5);
    }
  
    h2 {
      margin-top: 0;
      border-bottom: 1px solid #333;
      padding-bottom: 10px;
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