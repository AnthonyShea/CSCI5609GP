<script lang="ts">
  import { onMount } from "svelte";

  let {
    currentYear = 2020,
    currentEmissionsGt = 37, // Global emissions in 2020: ~37 Gt CO2 per year
    remainingBudget = 400 // Remaining budget for 1.5°C: ~400 Gt CO2
  } = $props<{
    currentYear?: number;
    currentEmissionsGt?: number;
    remainingBudget?: number;
  }>();

  // Calculate time remaining at current emission rate
  let yearsRemaining = $derived(Math.floor(remainingBudget / currentEmissionsGt));
  let percentageUsed = $derived(Math.min(((2450 - remainingBudget) / 2450) * 100, 100)); // Total budget ~2450 Gt since 1850
  let urgencyLevel = $derived(
    percentageUsed > 90 ? "critical" :
    percentageUsed > 80 ? "danger" :
    percentageUsed > 70 ? "warning" : "normal"
  );

  // Animation state
  let isVisible = $state(false);

  onMount(() => {
    // Fade in animation
    setTimeout(() => {
      isVisible = true;
    }, 300);
  });
</script>

<div class="carbon-budget-container" class:visible={isVisible} class:critical={urgencyLevel === "critical"} class:danger={urgencyLevel === "danger"} class:warning={urgencyLevel === "warning"}>
  <div class="budget-header">
    <div class="budget-icon">🌡️</div>
    <div class="budget-title">
      <h3>Global Carbon Budget (1.5°C Pathway)</h3>
      <p class="budget-subtitle">Tracking our remaining atmospheric capacity</p>
    </div>
  </div>

  <div class="budget-stats">
    <div class="stat-card">
      <div class="stat-value">{remainingBudget} Gt</div>
      <div class="stat-label">CO₂ Remaining</div>
    </div>

    <div class="stat-card">
      <div class="stat-value">~{yearsRemaining} years</div>
      <div class="stat-label">At Current Rate</div>
    </div>

    <div class="stat-card">
      <div class="stat-value">{percentageUsed.toFixed(1)}%</div>
      <div class="stat-label">Budget Used</div>
    </div>
  </div>

  <div class="progress-bar-container">
    <div class="progress-bar-track">
      <div
        class="progress-bar-fill"
        style="width: {percentageUsed}%"
        class:pulse={urgencyLevel === "critical"}
      ></div>
    </div>
    <div class="progress-labels">
      <span>1850</span>
      <span class="current-marker">Now ({currentYear})</span>
      <span>Budget Exhausted</span>
    </div>
  </div>

  <div class="budget-message">
    {#if urgencyLevel === "critical"}
      <span class="urgent-text">⚠️ CRITICAL: Immediate action required to stay within 1.5°C</span>
    {:else if urgencyLevel === "danger"}
      <span class="urgent-text">🔴 DANGER: Rapid emissions reduction essential</span>
    {:else if urgencyLevel === "warning"}
      <span class="urgent-text">⚡ WARNING: Time is running out for climate action</span>
    {:else}
      <span>Historical emissions have consumed most of the safe carbon budget</span>
    {/if}
  </div>

  <div class="data-note">
    Based on IPCC AR6 estimates. Current global emissions: ~{currentEmissionsGt} Gt CO₂/year
  </div>
</div>

<style>
  .carbon-budget-container {
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.5s ease;
    position: relative;
    overflow: hidden;
  }

  .carbon-budget-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #4caf50, #ffc107, #f44336);
    opacity: 0.6;
  }

  .carbon-budget-container.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .carbon-budget-container.critical {
    border-color: rgba(244, 67, 54, 0.5);
    animation: criticalPulse 2s ease-in-out infinite;
  }

  .carbon-budget-container.danger {
    border-color: rgba(255, 152, 0, 0.5);
  }

  .carbon-budget-container.warning {
    border-color: rgba(255, 193, 7, 0.5);
  }

  @keyframes criticalPulse {
    0%, 100% {
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.4),
        0 0 0 0 rgba(244, 67, 54, 0.4);
    }
    50% {
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.4),
        0 0 0 10px rgba(244, 67, 54, 0);
    }
  }

  .budget-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .budget-icon {
    font-size: 2.5rem;
    animation: iconPulse 3s ease-in-out infinite;
  }

  @keyframes iconPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  .budget-title h3 {
    margin: 0;
    font-size: 1.3rem;
    color: #ffffff;
    font-weight: 600;
  }

  .budget-subtitle {
    margin: 0.25rem 0 0 0;
    font-size: 0.85rem;
    color: #aaaaaa;
  }

  .budget-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    background: rgba(60, 60, 60, 0.4);
    padding: 1rem;
    border-radius: 10px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    font-size: 0.8rem;
    color: #aaaaaa;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .progress-bar-container {
    margin-bottom: 1rem;
  }

  .progress-bar-track {
    width: 100%;
    height: 24px;
    background: rgba(60, 60, 60, 0.6);
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
  }

  .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #4caf50 0%, #ffc107 50%, #f44336 100%);
    transition: width 1.5s ease-out;
    position: relative;
    box-shadow: 0 0 10px rgba(244, 67, 54, 0.5);
  }

  .progress-bar-fill.pulse {
    animation: progressPulse 1.5s ease-in-out infinite;
  }

  @keyframes progressPulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }

  .progress-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #999999;
  }

  .current-marker {
    color: #ffffff;
    font-weight: 600;
  }

  .budget-message {
    background: rgba(244, 67, 54, 0.1);
    border-left: 3px solid #f44336;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 0.75rem;
  }

  .urgent-text {
    color: #ffcccc;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .data-note {
    font-size: 0.75rem;
    color: #888888;
    font-style: italic;
    text-align: center;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .budget-stats {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    .stat-value {
      font-size: 1.3rem;
    }

    .budget-title h3 {
      font-size: 1.1rem;
    }
  }
</style>
