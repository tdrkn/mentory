<script lang="ts">
  export let href: string | null = null;
  export let height = 32;
  export let iconOnly = false;
  export let hideTextOnMobile = false;
  export let scheme: 'auto' | 'light' | 'dark' = 'auto';
  export let alt = 'Mentory';
  export let className = '';

  const logoLight = '/brand/logo/mentory-logo-horizontal-light.svg';
  const logoDark = '/brand/logo/mentory-logo-horizontal-dark.svg';
  const iconLight = '/brand/logo/mentory-icon-light.svg';
  const iconDark = '/brand/logo/mentory-icon-dark.svg';

  $: useIcon = iconOnly || height < 24;
  $: fullHeight = useIcon ? height : Math.max(height, 24);
  $: lightSrc = useIcon ? iconLight : logoLight;
  $: darkSrc = useIcon ? iconDark : logoDark;
  $: forcedSrc = scheme === 'light' ? lightSrc : scheme === 'dark' ? darkSrc : null;
  $: forcedIconSrc = scheme === 'light' ? iconLight : scheme === 'dark' ? iconDark : null;
</script>

<svelte:element
  this={href ? 'a' : 'span'}
  href={href || undefined}
  class={`brand-logo ${className} ${useIcon ? 'icon-only' : ''} ${hideTextOnMobile && !useIcon ? 'mobile-icon' : ''}`}
  aria-label={alt}
>
  <span class="brand-logo-safe">
    {#if forcedSrc}
      <img
        class="brand-logo-image"
        src={forcedSrc}
        alt={alt}
        style={`height:${fullHeight}px;`}
        decoding="async"
      />
    {:else}
      <picture class="brand-logo-picture brand-logo-picture--full">
        <source media="(prefers-color-scheme: dark)" srcset={darkSrc} />
        <img
          class="brand-logo-image"
          src={lightSrc}
          alt={alt}
          style={`height:${fullHeight}px;`}
          decoding="async"
        />
      </picture>
    {/if}

    {#if hideTextOnMobile && !useIcon}
      <picture class="brand-logo-picture brand-logo-picture--icon">
        {#if !forcedIconSrc}
          <source media="(prefers-color-scheme: dark)" srcset={iconDark} />
        {/if}
        <img
          class="brand-logo-image"
          src={forcedIconSrc || iconLight}
          alt={alt}
          style={`height:${fullHeight}px;`}
          decoding="async"
        />
      </picture>
    {/if}
  </span>
</svelte:element>

<style>
  .brand-logo {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    color: inherit;
    line-height: 0;
    flex-shrink: 0;
  }

  .brand-logo-safe {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--logo-safe-area, max(4px, 0.5cap));
  }

  .brand-logo-picture {
    display: block;
  }

  .brand-logo-image {
    display: block;
    width: auto;
    height: auto;
    max-width: none;
  }

  .brand-logo-picture--icon {
    display: none;
  }

  .brand-logo.icon-only .brand-logo-image {
    min-height: 0;
  }

  @media (max-width: 480px) {
    .brand-logo.mobile-icon .brand-logo-picture--full {
      display: none;
    }

    .brand-logo.mobile-icon .brand-logo-picture--icon {
      display: block;
    }
  }
</style>
