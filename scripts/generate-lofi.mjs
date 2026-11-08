// Original HPX instrumental: warm keys, a soft bass line and swung drums.
// Generates the source WAV; the published MP3 is encoded separately with FFmpeg.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rate = 32000;
const beat = 60 / 74;
const bars = 16;
const duration = bars * 4 * beat;
const length = Math.round(duration * rate);
const left = new Float32Array(length);
const right = new Float32Array(length);
const keys = new Float32Array(length);
const tau = 2 * Math.PI;
let seed = 18731;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const wrap = i => ((i % length) + length) % length;

function piano(at, midi, velocity = 1, pan = 0, seconds = 2.3) {
  const start = Math.round(at * rate);
  const frequency = hz(midi);
  for (let i = 0; i < seconds * rate; i++) {
    const t = i / rate;
    const envelope = (1 - Math.exp(-t / .006)) * Math.exp(-t / .65);
    const bell = Math.sin(tau * frequency * t + .34 * Math.sin(tau * frequency * 2 * t) * Math.exp(-t * 3));
    const tone = (bell + .12 * Math.sin(tau * frequency * 2.003 * t)) * envelope * velocity * .033;
    const index = wrap(start + i);
    keys[index] += tone;
    left[index] += tone * (1 - pan * .28);
    right[index] += tone * (1 + pan * .28);
  }
}

function bass(at, midi, seconds, velocity = 1) {
  const start = Math.round(at * rate);
  const frequency = hz(midi);
  for (let i = 0; i < seconds * rate; i++) {
    const t = i / rate;
    const envelope = Math.min(1, t / .025) * Math.min(1, (seconds - t) / .08) * Math.exp(-t * .65);
    const value = (Math.sin(tau * frequency * t) + .12 * Math.sin(tau * frequency * 2 * t)) * envelope * .085 * velocity;
    const index = wrap(start + i);
    left[index] += value; right[index] += value;
  }
}

function drum(at, kind, velocity = 1) {
  const start = Math.round(at * rate);
  const seconds = kind === "kick" ? .38 : kind === "snare" ? .19 : .065;
  let low = 0;
  for (let i = 0; i < seconds * rate; i++) {
    const t = i / rate;
    const white = random() * 2 - 1;
    low += .2 * (white - low);
    let value;
    if (kind === "kick") value = Math.sin(tau * (48 * t + 3.8 * (1 - Math.exp(-t * 28)))) * Math.exp(-t * 17) * .21;
    else if (kind === "snare") value = ((white - low) * .043 + Math.sin(tau * 178 * t) * .025) * Math.exp(-t * 29);
    else value = (white - low) * Math.exp(-t * 75) * .015;
    const index = wrap(start + i);
    left[index] += value * velocity; right[index] += value * velocity * (kind === "hat" ? .83 : 1);
  }
}

const chords = [
  { root: 41, notes: [53, 57, 60, 64, 67] },
  { root: 40, notes: [52, 55, 59, 62] },
  { root: 38, notes: [50, 53, 57, 60, 64] },
  { root: 43, notes: [53, 57, 59, 62] },
  { root: 36, notes: [52, 55, 59, 62] },
  { root: 33, notes: [48, 52, 55, 59] },
  { root: 38, notes: [50, 53, 57, 60, 64] },
  { root: 43, notes: [53, 57, 59, 64] },
];
const melody = [[69, 67], [67, 64], [65, 64], [62, 59], [64, 67], [71, 69], [65, 64], [62, 67]];
for (let bar = 0; bar < bars; bar++) {
  const at = bar * 4 * beat;
  const chord = chords[bar % chords.length];
  for (const [index, note] of chord.notes.entries()) {
    piano(at + index * .012, note, .68, (index - 2) * .3);
    piano(at + 2.6 * beat + index * .009, note, .32, (2 - index) * .25, 1.7);
  }
  bass(at, chord.root, beat * 1.6);
  bass(at + beat * 2.05, chord.root + (bar % 4 === 3 ? 7 : 0), beat * 1.45, .72);
  drum(at, "kick", .9);
  drum(at + beat * 2, "kick", .75);
  if (bar % 4 === 2) drum(at + beat * 2.75, "kick", .38);
  drum(at + beat * 1.025, "snare", .85);
  drum(at + beat * 3.025, "snare", .76);
  for (let step = 0; step < 8; step++) drum(at + (step * .5 + (step % 2 ? .075 : 0)) * beat, "hat", .55 + random() * .35);
  const phrase = melody[bar % melody.length];
  if (bar % 4 !== 3 || bar > 7) {
    piano(at + beat * 1.5, phrase[0], .33, -.3, 1.8);
    piano(at + beat * 3.25, phrase[1], .26, .3, 1.5);
  }
}

// Circular stereo echoes make the end join the beginning without a hard cut.
for (let i = 0; i < length; i++) {
  left[i] += keys[wrap(i - Math.round(beat * .75 * rate))] * .19 + keys[wrap(i - Math.round(.113 * rate))] * .08;
  right[i] += keys[wrap(i - Math.round(beat * 1.5 * rate))] * .14 + keys[wrap(i - Math.round(.167 * rate))] * .08;
}
let filterLeft = 0, filterRight = 0, noise = 0;
const alpha = 1 - Math.exp(-tau * 4100 / rate);
for (let pass = 0; pass < 2; pass++) {
  for (let i = 0; i < length; i++) {
    const vinyl = (random() * 2 - 1) * .0008;
    noise += .09 * (vinyl - noise);
    filterLeft += alpha * (left[i] + noise - filterLeft);
    filterRight += alpha * (right[i] + noise - filterRight);
    if (pass === 1) { left[i] = Math.tanh(filterLeft * 1.45) * .7; right[i] = Math.tanh(filterRight * 1.45) * .7; }
  }
}

const pcm = Buffer.alloc(length * 4);
let peak = 0, energy = 0;
for (let i = 0; i < length; i++) {
  for (const [channel, value] of [[0, left[i]], [1, right[i]]]) {
    peak = Math.max(peak, Math.abs(value)); energy += value * value;
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), i * 4 + channel * 2);
  }
}
const header = Buffer.alloc(44);
header.write("RIFF"); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVE", 8); header.write("fmt ", 12);
header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
const directory = new URL("../.sites-runtime/", import.meta.url);
mkdirSync(directory, { recursive: true });
mkdirSync(new URL("../public/audio/", import.meta.url), { recursive: true });
const output = new URL("hpx-lofi-source.wav", directory);
writeFileSync(output, Buffer.concat([header, pcm]));
if (peak >= 1 || energy === 0) throw new Error("Invalid audio levels");
console.log(JSON.stringify({ file: fileURLToPath(output), durationSeconds: duration, peak, rms: Math.sqrt(energy / (length * 2)) }));
