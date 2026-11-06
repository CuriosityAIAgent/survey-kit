export default function StampBody({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 30" className={className} aria-hidden preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="v2s-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3E3A35" />
          <stop offset="1" stopColor="#1E1C1A" />
        </linearGradient>
        <linearGradient id="v2s-side" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.10" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      {}
      <rect x="22" y="1" width="76" height="8" rx="2.5" fill="#2A2724" />
      <rect x="25" y="2.2" width="70" height="1.4" rx="0.7" fill="#fff" opacity="0.16" />
      {}
      <path d="M18 9 H102 L106 25 H14 Z" fill="url(#v2s-body)" />
      <path d="M18 9 H102 L106 25 H14 Z" fill="url(#v2s-side)" />
      {}
      <rect x="9" y="7" width="5" height="19" rx="1.5" fill="#55504A" />
      <rect x="106" y="7" width="5" height="19" rx="1.5" fill="#2E2B28" />
      {}
      <rect x="7" y="25" width="106" height="5" rx="1" fill="#8C5A2B" />
      <rect x="7" y="25" width="106" height="1.2" fill="#C08A62" opacity="0.7" />
    </svg>
  )
}
