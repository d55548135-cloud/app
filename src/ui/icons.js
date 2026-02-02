import { el } from "./dom.js";

const ICONS = {
  bot: `
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path d="M10 3h4m-2 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M7 10a5 5 0 0 1 10 0v5a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4v-5Z"
            stroke="currentColor" stroke-width="2" />
      <path d="M9.2 13.2h.01M14.8 13.2h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <path d="M6 12H4m16 0h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `,
  warning: `
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path d="M12 3 22 21H2L12 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M12 9v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 17.5h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `,
  chevronRight: `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M10 6l6 6-6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  check: `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M6 12.5l4 4L18 8.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  circleCheck: `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
            stroke="currentColor" stroke-width="2"/>
      <path d="M7.5 12.2l3 3L16.8 9.2"
            stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  info: `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" stroke-width="2"/>
      <path d="M12 10.5v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 7.5h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `,
  refresh: `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M21 3v5m0 0h-5m5 0l-3-2.70832C16.4077 3.86656 14.3051 3 12 3
           7.02944 3 3 7.02944 3 12
           3 16.9706 7.02944 21 12 21
           16.2832 21 19.8675 18.008 20.777 14"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
  donutBadge: `
    <svg class="donut-svg"
         viewBox="0 0 484.8 484.8"
         width="20" height="20"
         preserveAspectRatio="xMidYMid meet"
         aria-hidden="true" focusable="false">

      <!-- donut base -->
      <path fill="#EFD27F" d="M242.4,0C108,0,0,108,0,242.4s108,242.4,242.4,242.4S484.8,376,484.8,242.4S376.8,0,242.4,0z
        M242.4,328c-47.2,0-85.6-38.4-85.6-85.6s38.4-85.6,85.6-85.6s85.6,38.4,85.6,85.6S289.6,328,242.4,328z"/>

      <path fill="#E2A050" d="M242.4,15.2c-125.6,0-227.2,101.6-227.2,227.2s101.6,227.2,227.2,227.2S469.6,368,469.6,242.4
        S368,15.2,242.4,15.2z M242.4,322.4c-44,0-80-36-80-80s36-80,80-80s80,36,80,80S286.4,322.4,242.4,322.4z"/>

      <!-- icing -->
      <path fill="#F2498A" d="M425.6,307.2c1.6-1.6,4-3.2,5.6-4.8c16-10.4,26.4-28,26.4-48c0-7.2-1.6-13.6-4-20
        c-3.2-26.4-19.2-48-40.8-59.2c-0.8-1.6-1.6-3.2-2.4-5.6c0.8-3.2,0.8-7.2,0.8-10.4c0-35.2-23.2-65.6-55.2-76
        c-14.4-22.4-39.2-37.6-67.2-37.6c-10.4,0-20.8,2.4-30.4,5.6c-14.4-14.4-33.6-22.4-56-22.4c-35.2,0-65.6,23.2-76,55.2
        c-28,6.4-51.2,27.2-59.2,54.4c-24,13.6-40.8,40-40.8,69.6c0,18.4,6.4,34.4,16,48c0,4,0,8.8,0,12.8c0,16,4.8,31.2,12.8,43.2
        c-1.6,4.8-1.6,10.4-1.6,16c0,24,12.8,44.8,31.2,56c12.8,27.2,40,45.6,72,45.6c1.6,0,2.4,0,4,0c10.4,9.6,23.2,15.2,38.4,15.2
        c2.4,0,4.8,0,8-0.8c12,8,26.4,12,42.4,12c20,0,37.6-7.2,52-19.2c0.8,0,1.6,0,3.2,0c36.8,0,68-24.8,76.8-59.2
        c26.4-4.8,47.2-28,47.2-56C427.2,316.8,426.4,312,425.6,307.2z"/>

      <!-- ✅ sprinkles bigger + more -->
      <circle fill="#FFCE00" cx="322.4" cy="108" r="18"/>
      <circle fill="#FFCE00" cx="368" cy="337.6" r="18"/>
      <circle fill="#91EDEA" cx="241.6" cy="344.8" r="16"/>
      <circle fill="#EFD27F" cx="375.2" cy="172.8" r="15"/>
      <circle fill="#FFCE00" cx="61" cy="236.8" r="15"/>
      <circle fill="#91EDEA" cx="326.4" cy="177.6" r="14"/>
      <circle fill="#EFD27F" cx="246.4" cy="80.8" r="14"/>
      <circle fill="#FFCE00" cx="97" cy="304.8" r="15"/>
      <circle fill="#91EDEA" cx="115" cy="268.8" r="15"/>
      <circle fill="#EFD27F" cx="98" cy="182.8" r="15"/>
      <circle fill="#91EDEA" cx="199.6" cy="375.8" r="16"/>
      <circle fill="#FFCE00" cx="160.4" cy="124" r="18"/>
      <circle fill="#91EDEA" cx="202.6" cy="395.8" r="16"></circle>

      <!-- ✅ HOLE (reliable): paint it with surface color via CSS variable -->
      <circle class="donut-hole" cx="242.4" cy="242.4" r="86"/>
    </svg>
  `,

};

export function Icon(name, className = "icon") {
  const wrap = el("span", className);
  wrap.innerHTML = ICONS[name] || "";
  return wrap;
}
