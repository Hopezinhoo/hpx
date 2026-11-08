type Playable = { play(): Promise<void> };
const interactionEvents = ["pointerdown", "touchend", "click", "keydown"];

// Try immediately, then retry within a real interaction if the browser blocks audio.
// Calling cancel also prevents a later page click from undoing a manual pause.
export function enableLofiAutoplay(media: Playable, events: EventTarget, ignore: (event: Event) => boolean = () => false) {
  let active = true;
  let pending = false;
  const removeListeners = () => {
    for (const type of interactionEvents) events.removeEventListener(type, onInteraction, true);
  };
  const attempt = () => {
    if (!active || pending) return;
    pending = true;
    try {
      // Keep play() synchronous with the user gesture; do not defer it to a timer.
      void media.play().then(() => { active = false; removeListeners(); }, () => {}).finally(() => { pending = false; });
    } catch { pending = false; }
  };
  const onInteraction = (event: Event) => { if (!ignore(event)) attempt(); };
  for (const type of interactionEvents) events.addEventListener(type, onInteraction, { capture: true, passive: true });
  attempt();
  return () => { active = false; removeListeners(); };
}
