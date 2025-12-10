<script lang="ts"> 
    import { base } from '$app/paths';
  
    export let clearMultiSelection: () => void;
  </script>
  
  <aside class="sidebar-container2">
    <h2>Global CO₂ Emissions</h2>

    <p>
        The data shown on these graphs illustrates the rapid acceleration of CO₂ emissions</p>

    <hr> <h3>CO₂ Emissions for a specific selected country</h3>
    
    <ul>
        <!-- single country chart needs to be added here -->
        <svg id="country-chart" class="country-chart" style="width:100%; height:200px;"></svg>
    </ul>

    <hr> <h3>CO₂ Emissions for a Comparison of Countries</h3>
    <ul>
        <!-- Button to clear multi selection needs to be fixed -->
        <button class="jump-btn" on:click={clearMultiSelection}>Clear Multi Selection</button>
        <!-- Multi-country chart for selected countries -->
        <svg id="multi-country-chart" class="multi-country-chart" style="width:100%; height:200px;"></svg>
    </ul>

    <hr>

    <h3>Top 10 countries in CO₂ Emissions for a set year</h3>
    <ul>
        <!-- Top 10 bar chart  needs to function -->
        <svg id="top10-bar-chart" class="bar-chart" style="width:100%; height:200px;"></svg>
    </ul>
</aside>
  
  <style>
    /* The sidebar should be positioned on the right, as requested */
    .sidebar-container2 {
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
  </style>