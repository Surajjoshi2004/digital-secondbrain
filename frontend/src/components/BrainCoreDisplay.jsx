function BrainCoreDisplay({
  noteCount = 0,
  activeTagCount = 0,
  totalConnections = 0,
  cognitiveLoad = 0,
}) {
  const leftPulse = 1.2 + Math.min(noteCount, 12) * 0.16;
  const rightPulse = 1.2 + Math.min(activeTagCount || 1, 10) * 0.2;
  const centerPulse = 1.8 + Math.min(totalConnections, 40) * 0.05;

  return (
    <div className="brain-core-shell">
      <div className="brain-core-ring brain-core-ring-a">
        <span className="brain-core-orb brain-core-orb-cyan" />
      </div>
      <div className="brain-core-ring brain-core-ring-b">
        <span className="brain-core-orb brain-core-orb-violet" />
      </div>
      <div className="brain-core-ring brain-core-ring-c">
        <span className="brain-core-orb brain-core-orb-green" />
      </div>

      <div className="brain-core-rays" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="brain-core-svg">
        <svg viewBox="0 0 200 200" role="img" aria-label="Animated digital brain">
          <defs>
            <radialGradient id="brain-shell-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(168,85,247,0.36)" />
              <stop offset="100%" stopColor="rgba(34,211,238,0.08)" />
            </radialGradient>
            <linearGradient id="brain-left-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="brain-right-grad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.72" />
            </linearGradient>
            <filter id="brain-soft-glow">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="brain-hard-glow">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <ellipse cx="100" cy="102" rx="72" ry="60" fill="url(#brain-shell-glow)" />

          <path
            d="M100 54
              C84 45, 56 46, 45 60
              C35 70, 30 82, 33 93
              C29 101, 31 114, 38 123
              C43 132, 50 140, 60 145
              C70 150, 81 151, 90 148
              C96 146, 98 144, 100 142
              L100 54Z"
            fill="none"
            stroke="url(#brain-left-grad)"
            strokeWidth="1.7"
            opacity="0.94"
            filter="url(#brain-soft-glow)"
          />
          <path
            d="M100 54
              C116 45, 144 46, 155 60
              C165 70, 170 82, 167 93
              C171 101, 169 114, 162 123
              C157 132, 150 140, 140 145
              C130 150, 119 151, 110 148
              C104 146, 102 144, 100 142
              L100 54Z"
            fill="none"
            stroke="url(#brain-right-grad)"
            strokeWidth="1.7"
            opacity="0.94"
            filter="url(#brain-soft-glow)"
          />

          <path
            d="M95 142 C93 153, 92 160, 95 168 M105 142 C107 153, 108 160, 105 168 M95 168 C97 172, 103 172, 105 168"
            stroke="url(#brain-left-grad)"
            strokeWidth="1.1"
            fill="none"
            opacity="0.74"
          />

          <path d="M50 72 C58 66, 68 64, 79 69" stroke="#22d3ee" strokeWidth="1" fill="none" opacity="0.7" />
          <path d="M40 88 C50 81, 63 79, 75 84" stroke="#60a5fa" strokeWidth="1" fill="none" opacity="0.55" />
          <path d="M36 104 C46 97, 61 96, 72 101" stroke="#a855f7" strokeWidth="1" fill="none" opacity="0.6" />
          <path d="M38 118 C49 113, 61 113, 70 117" stroke="#22d3ee" strokeWidth="1" fill="none" opacity="0.52" />
          <path d="M48 130 C57 126, 68 125, 76 129" stroke="#34d399" strokeWidth="1" fill="none" opacity="0.68" />
          <path d="M150 72 C142 66, 132 64, 121 69" stroke="#f472b6" strokeWidth="1" fill="none" opacity="0.7" />
          <path d="M160 88 C150 81, 137 79, 125 84" stroke="#a855f7" strokeWidth="1" fill="none" opacity="0.55" />
          <path d="M164 104 C154 97, 139 96, 128 101" stroke="#f472b6" strokeWidth="1" fill="none" opacity="0.6" />
          <path d="M162 118 C151 113, 139 113, 130 117" stroke="#a855f7" strokeWidth="1" fill="none" opacity="0.52" />
          <path d="M152 130 C143 126, 132 125, 124 129" stroke="#22d3ee" strokeWidth="1" fill="none" opacity="0.68" />

          <path
            d="M100 58 C100 80, 100 110, 100 142"
            stroke="rgba(125,211,252,0.4)"
            strokeWidth="1"
            strokeDasharray="4 4"
            fill="none"
          />

          <line x1="66" y1="80" x2="100" y2="100" stroke="#22d3ee" strokeWidth="0.6" opacity="0.45" strokeDasharray="3 3" />
          <line x1="45" y1="105" x2="100" y2="100" stroke="#a855f7" strokeWidth="0.6" opacity="0.38" strokeDasharray="3 3" />
          <line x1="134" y1="80" x2="100" y2="100" stroke="#f472b6" strokeWidth="0.6" opacity="0.45" strokeDasharray="3 3" />
          <line x1="154" y1="108" x2="100" y2="100" stroke="#34d399" strokeWidth="0.6" opacity="0.38" strokeDasharray="3 3" />

          <circle cx="66" cy="80" r={leftPulse} fill="#22d3ee" filter="url(#brain-hard-glow)" />
          <circle cx="45" cy="105" r="2.4" fill="#a855f7" filter="url(#brain-hard-glow)" />
          <circle cx="60" cy="130" r="2.5" fill="#34d399" filter="url(#brain-hard-glow)" />
          <circle cx="134" cy="80" r={rightPulse} fill="#f472b6" filter="url(#brain-hard-glow)" />
          <circle cx="154" cy="108" r="2.5" fill="#60a5fa" filter="url(#brain-hard-glow)" />
          <circle cx="138" cy="130" r="2.4" fill="#22d3ee" filter="url(#brain-hard-glow)" />
          <circle cx="100" cy="100" r={centerPulse} fill="url(#brain-left-grad)" filter="url(#brain-hard-glow)" />
        </svg>
      </div>

      <div className="brain-core-status">
        <div>
          <span className="brain-core-status-label">Notes indexed</span>
          <strong className="brain-core-status-value">{noteCount}</strong>
        </div>
        <div>
          <span className="brain-core-status-label">Clusters</span>
          <strong className="brain-core-status-value">{activeTagCount || 1}</strong>
        </div>
        <div>
          <span className="brain-core-status-label">Cognition</span>
          <strong className="brain-core-status-value">{Math.round(cognitiveLoad)}%</strong>
        </div>
      </div>
    </div>
  );
}

export default BrainCoreDisplay;
