<script lang="ts">
  import * as d3 from "d3";
  import { onMount } from "svelte";
  import type { TEmissions } from "../../co2types";
  
  let emissionsData: TEmissions[] = $state([]);

  async function loadCsv() {
    try {
        const csvUrl = "./owid-co2-data.csv";
        emissionsData = await d3.csv(csvUrl, (row) => {
            return {
                ...row,
                year: new Date(row.year),
                population: Number(row.population),
                gdp: Number(row.gdp),
                cement_co2: Number(row.cement_co2),
                cement_co2_per_capita: Number(row.cement_co2_per_capita),
                co2: Number(row.co2),
                co2_growth_abs: Number(row.co2_growth_abs),
                co2_growth_prct: Number(row.co2_growth_prct),
                co2_including_luc: Number(row.co2_including_luc),
                co2_including_luc_growth_abs: Number(row.co2_including_luc_growth_abs),
                co2_including_luc_growth_prct: Number(row.co2_including_luc_growth_prct),
                co2_including_luc_per_capita: Number(row.co2_including_luc_per_capita),
                co2_including_luc_per_gdp: Number(row.consumption_co2_per_gdp),
                co2_including_luc_per_unit_energy: Number(row.co2_including_luc_per_unit_energy),
                co2_per_capita: Number(row.co2_per_capita),
                co2_per_gdp: Number(row.co2_per_gdp),
                co2_per_unit_energy: Number(row.co2_per_unit_energy),
                coal_co2: Number(row.coal_co2),
                coal_co2_per_capita: Number(row.coal_co2_per_capita),
                consumption_co2: Number(row.consumption_co2),
                consumption_co2_per_capita: Number(row.consumption_co2_per_capita),
                consumption_co2_per_gdp: Number(row.consumption_co2_per_gdp),
                cumulative_cement_co2: Number(row.cumulative_cement_co2),
                cumulative_co2: Number(row.cumulative_co2),
                cumulative_co2_including_luc: Number(row.cumulative_co2_including_luc),
                cumulative_coal_co2: Number(row.cumulative_coal_co2),
                cumulative_flaring_co2: Number(row.cumulative_flaring_co2),
                cumulative_gas_co2: Number(row.cumulative_gas_co2),
                cumulative_luc_co2: Number(row.cumulative_luc_co2),
                cumulative_oil_co2: Number(row.cumulative_oil_co2),
                cumulative_other_co2: Number(row.cumulative_other_co2),
                energy_per_capita: Number(row.energy_per_capita),
                energy_per_gdp: Number(row.energy_per_gdp),
                flaring_co2: Number(row.flaring_co2),
                flaring_co2_per_capita: Number(row.flaring_co2_per_capita),
                gas_co2: Number(row.gas_co2),
                gas_co2_per_capita: Number(row.gas_co2_per_capita),
                ghg_excluding_lucf_per_capita: Number(row.ghg_excluding_lucf_per_capita),
                ghg_per_capita: Number(row.ghg_per_capita),
                land_use_change_co2: Number(row.land_use_change_co2),
                land_use_change_co2_per_capita: Number(row.land_use_change_co2_per_capita),
                methane: Number(row.methane),
                methane_per_capita: Number(row.methane_per_capita),
                nitrous_oxide: Number(row.nitrous_oxide),
                nitrous_oxide_per_capita: Number(row.nitrous_oxide_per_capita),
                oil_co2: Number(row.oil_co2),
                oil_co2_per_capita: Number(row.oil_co2_per_capita),
                other_co2_per_capita: Number(row.other_co2_per_capita),
                other_industry_co2: Number(row.other_industry_co2),
                primary_energy_consumption: Number(row.primary_energy_consumption),
                share_global_cement_co2: Number(row.share_global_cement_co2),
                share_global_co2: Number(row.share_global_co2),
                share_global_co2_including_luc: Number(row.share_global_co2_including_luc),
                share_global_coal_co2: Number(row.share_global_coal_co2),
                share_global_cumulative_cement_co2: Number(row.share_global_cumulative_cement_co2),
                share_global_cumulative_co2: Number(row.share_global_cumulative_co2),
                share_global_cumulative_co2_including_luc: Number(row.share_global_cumulative_co2_including_luc),
                share_global_cumulative_coal_co2: Number(row.share_global_cumulative_coal_co2),
                share_global_cumulative_flaring_co2: Number(row.share_global_cumulative_flaring_co2),
                share_global_cumulative_gas_co2: Number(row.share_global_cumulative_gas_co2),
                share_global_cumulative_luc_co2: Number(row.share_global_cumulative_luc_co2),
                share_global_cumulative_oil_co2: Number(row.share_global_cumulative_oil_co2),
                share_global_cumulative_other_co2: Number(row.share_global_cumulative_other_co2),
                share_global_flaring_co2: Number(row.share_global_flaring_co2),
                share_global_gas_co2: Number(row.share_global_gas_co2),
                share_global_luc_co2: Number(row.share_global_luc_co2),
                share_global_oil_co2: Number(row.share_global_oil_co2),
                share_global_other_co2: Number(row.share_global_other_co2),
                share_of_temperature_change_from_ghg: Number(row.share_of_temperature_change_from_ghg),
                temperature_change_from_ch4: Number(row.temperature_change_from_ch4),
                temperature_change_from_co2: Number(row.temperature_change_from_co2),
                temperature_change_from_ghg: Number(row.temperature_change_from_ghg),
                temperature_change_from_n2o: Number(row.temperature_change_from_n2o),
                total_ghg: Number(row.total_ghg),
                total_ghg_excluding_lucf: Number(row.total_ghg_excluding_lucf),
                trade_co2: Number(row.trade_co2),
                trade_co2_share: Number(row.trade_co2_share),
            }
        });
        console.log("Loaded CSV Data:", emissionsData);
    } catch (error) {
        console.error("Error loading CSV:", error);
    }
  }
  // Call the loader when the component mounts
  onMount(loadCsv);

  //const attrOptionsX = $derived(emissionsData[0] ? Object.keys(emissionsData[0]) : []);
  //const attrOptionsY = $derived(emissionsData[0] ? Object.keys(emissionsData[0]) : []);

</script>

<div class="container">
    <h1>Test for Implementing CO2 Emissions Data</h1>
    
    <p>Line Graph of CO2 Emission from {emissionsData.length == 0 ? "..." : emissionsData.length + " "} countries</p>
    <!-- {#if emissionsData.length > 0}

    {/if} -->
</div>

<style>
  .container {
      width: 60vw;
      margin: 10px auto;
      padding: 10px;
  }
  .selectors {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      align-items: center;
  }
  label {
      font-weight: bold;
  }
</style>