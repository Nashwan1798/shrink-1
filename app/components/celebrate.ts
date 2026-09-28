import confetti from "canvas-confetti";

export function celebrate(): () => void {
  const base = { disableForReducedMotion: true };
  confetti({ ...base, particleCount: 90, spread: 100, startVelocity: 48, origin: { x: 0.5, y: 0.75 } });

  const end = Date.now() + 1100;
  let frame = 0;
  const stream = () => {
    confetti({ ...base, particleCount: 3, angle: 60, spread: 55, startVelocity: 62, origin: { x: 0, y: 1 } });
    confetti({ ...base, particleCount: 3, angle: 120, spread: 55, startVelocity: 62, origin: { x: 1, y: 1 } });
    if (Date.now() < end) frame = requestAnimationFrame(stream);
  };
  frame = requestAnimationFrame(stream);
  return () => cancelAnimationFrame(frame);
}
