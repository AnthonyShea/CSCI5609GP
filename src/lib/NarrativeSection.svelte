<script lang="ts">
  import { onMount } from "svelte";

  let {
    story,
    isActive = false,
    onActivate
  } = $props<{
    story: {
      id: string;
      title: string;
      question: string;
      insight: string;
      bullets?: string[];
      type: 'intro' | 'data-story';
      config?: {
        year?: number;
        countries?: string[];
        chartFocus?: string;
      };
    };
    isActive?: boolean;
    onActivate: (storyId: string, config?: any) => void;
  }>();

  let sectionElement: HTMLElement;

  onMount(() => {
    // Set up Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            // Trigger activation when section is in view
            onActivate(story.id, story.config);
          }
        });
      },
      {
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
        rootMargin: "-15% 0px -15% 0px"
      }
    );

    if (sectionElement) {
      observer.observe(sectionElement);
    }

    return () => {
      if (sectionElement) {
        observer.unobserve(sectionElement);
      }
    };
  });
</script>

<section
  bind:this={sectionElement}
  class="narrative-section"
  class:active={isActive}
  class:intro={story.type === 'intro'}
  data-story-id={story.id}
>
  <div class="narrative-content">
    <div class="question-mark" class:visible={isActive}></div>
    <h3 class="question">{story.question}</h3>
    <div class="insight" class:visible={isActive}>
      <div class="insight-icon"></div>
      {#if story.bullets && story.bullets.length > 0}
        <p class="insight-intro">{story.insight}</p>
        <ul class="insight-bullets">
          {#each story.bullets as bullet}
            <li>{bullet}</li>
          {/each}
        </ul>
      {:else}
        <p>{story.insight}</p>
      {/if}
    </div>
    {#if story.config?.countries && story.config.countries.length > 0}
      <div class="focus-indicator">
        <span>Focus: {story.config.countries.join(', ')}</span>
      </div>
    {/if}
  </div>
</section>

<style>
  .narrative-section {
    min-height: 300px;
    padding: 2.5rem 2rem;
    margin: 1.5rem 0;
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border-radius: 12px;
    border-left: 4px solid #404040;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0.6;
    position: relative;
    overflow: hidden;
    box-shadow: 
      0 4px 20px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .narrative-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #666666 0%, #888888 100%);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.5s ease;
  }

  .narrative-section::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 30% 20%, rgba(100, 100, 100, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }

  .narrative-section.active {
    opacity: 1;
    border-left-color: #888888;
    background: linear-gradient(135deg, #333333 0%, #222222 100%);
    transform: translateX(8px);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .narrative-section.active::before {
    transform: scaleX(1);
  }

  .narrative-section.intro {
    background: linear-gradient(135deg, #2d3a3a 0%, #1a2525 100%);
    border-left-color: #556666;
  }

  .narrative-section.intro.active {
    background: linear-gradient(135deg, #334444 0%, #223333 100%);
    border-left-color: #668888;
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(136, 136, 136, 0.1);
  }

  .narrative-content {
    max-width: 100%;
    position: relative;
  }

  .question-mark {
    position: absolute;
    top: -10px;
    right: 10px;
    font-size: 3rem;
    color: #404040;
    transition: all 0.5s ease;
    opacity: 0.4;
  }

  .question-mark.visible {
    opacity: 0.8;
    color: #888888;
    transform: rotate(15deg) scale(1.2);
  }

  .question {
    font-size: 1.6rem;
    margin: 0 0 1.5rem 0;
    font-weight: 600;
    color: #e0e0e0;
    line-height: 1.4;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .narrative-section.active .question {
    color: #ffffff;
  }

  .insight {
    background: rgba(60, 60, 60, 0.6);
    padding: 1.5rem;
    border-radius: 10px;
    border-left: 3px solid #666666;
    margin-top: 1rem;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.5s ease 0.2s;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .insight.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .insight-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.8;
    }
    50% {
      transform: scale(1.1);
      opacity: 1;
    }
  }

  .insight p {
    font-size: 1.05rem;
    line-height: 1.7;
    margin: 0;
    color: #cccccc;
  }

  .insight-intro {
    margin-bottom: 0.75rem !important;
    font-weight: 500;
    color: #e0e0e0 !important;
  }

  .insight-bullets {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0 0;
  }

  .insight-bullets li {
    padding: 0.5rem 0 0.5rem 1.5rem;
    position: relative;
    line-height: 1.6;
    color: #bbbbbb;
  }

  .insight-bullets li::before {
    content: "▸";
    position: absolute;
    left: 0;
    color: #888888;
    font-weight: bold;
  }

  .focus-indicator {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, #555555 0%, #777777 100%);
    border-radius: 8px;
    color: #f0f0f0;
    font-weight: 500;
    font-size: 0.9rem;
    display: inline-block;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .focus-indicator span {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .focus-indicator span::before {
    content: '🔍';
    font-size: 1rem;
    filter: grayscale(0.3);
  }
</style>