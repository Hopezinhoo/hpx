import type { CSSProperties } from "react";

const meteors = [
  { x: "96%", y: "-8%", delay: "-2s", duration: "11s", length: "150px" },
  { x: "70%", y: "12%", delay: "-7s", duration: "14s", length: "110px" },
  { x: "112%", y: "28%", delay: "-4s", duration: "17s", length: "175px" },
  { x: "44%", y: "-4%", delay: "-10s", duration: "16s", length: "95px" },
  { x: "90%", y: "65%", delay: "-12s", duration: "21s", length: "125px" },
];

export function ShootingStars() {
  return <div className="starfield" aria-hidden="true">
    <span className="star-layer distant-stars" />
    <span className="star-layer near-stars" />
    {meteors.map((meteor, index) => <span key={index} className="shooting-star" style={{ "--meteor-x": meteor.x, "--meteor-y": meteor.y, "--meteor-delay": meteor.delay, "--meteor-duration": meteor.duration, "--meteor-length": meteor.length } as CSSProperties} />)}
  </div>;
}
