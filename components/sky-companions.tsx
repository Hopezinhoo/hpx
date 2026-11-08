export function SkyCompanions() {
  return <div className="sky-companions" aria-hidden="true">
    <svg viewBox="0 0 160 76" fill="none" focusable="false">
      <g className="sky-sun-float">
        <g className="sun-rays" stroke="#dba349" strokeWidth="3" strokeLinecap="round">
          <path d="M40 7v5M40 60v5M11 36h5M64 36h5M19.5 15.5l3.5 3.5M57 53l3.5 3.5M19.5 56.5l3.5-3.5M57 19l3.5-3.5" />
        </g>
        <circle cx="40" cy="36" r="18" fill="#ffe39a" stroke="#384965" strokeWidth="2.3" />
        <circle cx="30" cy="40" r="3" fill="#f3b8aa" /><circle cx="50" cy="40" r="3" fill="#f3b8aa" />
        <g className="sun-eyes" fill="#384965"><ellipse cx="34" cy="34" rx="1.8" ry="2.3" /><ellipse cx="46" cy="34" rx="1.8" ry="2.3" /></g>
        <path d="M35 41q5 6 10 0" stroke="#384965" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className="sky-moon-float">
        <path d="M122 12C106 12 94 24 94 40c0 17 15 28 32 23 9-2 15-8 18-15-19 5-35-11-32-27 1-4 4-7 10-9Z" fill="#c8d2f4" stroke="#384965" strokeWidth="2.3" strokeLinejoin="round" />
        <circle cx="99" cy="43" r="2.6" fill="#b6b8df" />
        <g className="moon-eyes" fill="#384965"><ellipse cx="101" cy="35" rx="1.5" ry="2.1" /><ellipse cx="111" cy="35" rx="1.5" ry="2.1" /></g>
        <path d="M101 43q4 5 8 0" stroke="#384965" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      <path className="sky-star star-one" d="m139 10 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#ffe39a" stroke="#8ea4d7" strokeWidth="1.2" />
      <path className="sky-star star-two" d="m80 45 1.5 3.5L85 50l-3.5 1.5L80 55l-1.5-3.5L75 50l3.5-1.5Z" fill="#a7bfff" />
      <circle className="sky-star star-three" cx="153" cy="39" r="2" fill="#b5c8ff" />
    </svg>
  </div>;
}
