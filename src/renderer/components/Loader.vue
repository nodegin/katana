<template>
  <div class="wrapper">
    <svg xmlns="http://www.w3.org/2000/svg" width="66px" height="66px" viewBox="0 0 66 66">
      <g transform="rotate(251.552 33 33)">
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 33 33;270 33 33"
          begin="0s"
          dur="1.4s"
          fill="freeze"
          repeatCount="indefinite"
        />
        <circle
          fill="none"
          stroke-width="5"
          stroke-linecap="round"
          cx="33"
          cy="33"
          r="30"
          stroke-dasharray="187"
          stroke-dashoffset="610"
          transform="rotate(406.955 33 33)"
        >
          <animate
            attributeName="stroke"
            values="#5283dc;#78eacc;#5283dc"
            begin="0s"
            dur="4.2s"
            fill="freeze"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 33 33;135 33 33;450 33 33"
            begin="0s"
            dur="1.4s"
            fill="freeze"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-dashoffset"
            values="187;46.75;187"
            begin="0s"
            dur="1.4s"
            fill="freeze"
            repeatCount="indefinite"
          />
        </circle>
      </g>
    </svg>
  </div>
</template>

<script>
export default {
  name: 'Loader',
}
</script>

<style scoped lang="scss">
.wrapper {
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: center;
}
</style>
