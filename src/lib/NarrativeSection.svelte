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
    <div class="question-mark" class:visible={isActive}>?</div>
    <h3 class="question">{story.question}</h3>
    <div class="insight" class:visible={isActive}>
      <div class="insight-icon">💡</div>
      <p>{story.insight}</p>
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
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 16px;
    border-left: 4px solid #dee2e6;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0.7;
    position: relative;
    overflow: hidden;
  }

  .narrative-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.5s ease;
  }

  .narrative-section.active {
    opacity: 1;
    border-left-color: #667eea;
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
    transform: translateX(8px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
  }

  .narrative-section.active::before {
    transform: scaleX(1);
  }

  .narrative-section.intro {
    background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
    border-left-color: #00897b;
  }

  .narrative-section.intro.active {
    background: linear-gradient(135deg, #ffffff 0%, #e0f2f1 100%);
    border-left-color: #00897b;
    box-shadow: 0 8px 24px rgba(0, 137, 123, 0.15);
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
    color: #dee2e6;
    transition: all 0.5s ease;
    opacity: 0.3;
  }

  .question-mark.visible {
    opacity: 0.8;
    color: #667eea;
    transform: rotate(15deg) scale(1.2);
  }

  .question {
    font-size: 1.6rem;
    margin: 0 0 1.5rem 0;
    font-weight: 700;
    color: #2c3e50;
    line-height: 1.4;
  }

  .narrative-section.active .question {
    color: #667eea;
  }

  .insight {
    background: rgba(102, 126, 234, 0.05);
    padding: 1.5rem;
    border-radius: 12px;
    border-left: 3px solid #667eea;
    margin-top: 1rem;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.5s ease 0.2s;
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
    }
    50% {
      transform: scale(1.1);
    }
  }

  .insight p {
    font-size: 1.05rem;
    line-height: 1.7;
    margin: 0;
    color: #495057;
  }

  .focus-indicator {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
    display: inline-block;
  }

  .focus-indicator span {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .focus-indicator span::before {
    content: '🎯';
    font-size: 1.2rem;
  }
</style>
