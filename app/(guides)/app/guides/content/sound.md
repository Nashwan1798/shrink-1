No sound files allowed, so you make sound from scratch with the Web Audio API. An oscillator plays a tone (440 is an A, lower numbers are lower notes), and a gain node sets the volume from 0 to 1.

## it needs a click first

Browsers keep a page silent until someone clicks or presses a key on it. Make the `AudioContext` any earlier and nothing plays, with only a warning in the console to tell you why, which is an easy half hour to lose. The code below waits.

## beeps

Put this near the top of your script:

```beep
let audio;

// Make the audio context on the first click or key press.
// addEventListener is used here so it doesn't replace your own onpointerdown or onkeydown.
const unlock = () => (audio ??= new AudioContext());
addEventListener("pointerdown", unlock);
addEventListener("keydown", unlock);

function beep(freq, length = 0.2, type = "square", when) {
  if (!audio) return; // no click yet, so no sound
  when ??= audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  // Start at 0.2 and fade out. It fades to 0.001 instead of 0
  // because this kind of fade can't reach zero.
  gain.gain.setValueAtTime(0.2, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + length);
  osc.connect(gain).connect(audio.destination);
  osc.start(when);
  osc.stop(when + length);
}
```

After the first click, `beep(440)` plays a short A and `beep(220, 1, "sine")` plays a lower, softer one for a second. Before that click, `beep` just does nothing. For the third argument, `"sine"` is smooth, `"square"` sounds like an old console, `"sawtooth"` buzzes and `"triangle"` is in between. Each beep fades out at the end, because a sound that stops dead makes a click.

## sliding the pitch

Most game sounds are one note sliding up or down. This one goes from 200 to 800, which sounds like a jump:

```jump
function jump() {
  if (!audio) return;
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.15); // slide up
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain).connect(audio.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}
```

Slide it down slowly instead for game over.

## notes

```notes
// note number to frequency. 60 is middle C, and each +1 is one piano key higher
const note = (n) => 440 * 2 ** ((n - 69) / 12);

// these five sound fine together in any order
const scale = [0, 2, 4, 7, 9];

// a random note from the scale, starting at middle C or the C above it
const randomNote = () => note(60 + scale[(Math.random() * 5) | 0] + 12 * ((Math.random() * 2) | 0));
```

`beep(note(60))` is middle C. If you call `beep` three times in a row they all play at once, as a chord. To play notes one after another, give each one a start time:

```arpeggio
// call this from a click or key handler, after the audio has started
function arpeggio() {
  if (!audio) return;
  const now = audio.currentTime;
  beep(note(60), 0.2, "square", now);
  beep(note(64), 0.2, "square", now + 0.2);
  beep(note(67), 0.2, "square", now + 0.4);
}
```

For random music, use `randomNote()` so every note comes from the scale.

## drums

```drums
function noise(length, cutoff, when) {
  if (!audio) return;
  when ??= audio.currentTime;
  // a buffer full of random numbers is static
  const buffer = audio.createBuffer(1, audio.sampleRate * length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  source.buffer = buffer;
  filter.type = "highpass"; // only lets the high sounds through
  filter.frequency.value = cutoff; // about 7000 for a hi-hat, 1000 for a snare
  gain.gain.setValueAtTime(0.3, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + length);
  source.connect(filter).connect(gain).connect(audio.destination);
  source.start(when);
}

// a kick is a low tone that drops fast
function kick(when) {
  if (!audio) return;
  when ??= audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.setValueAtTime(150, when);
  osc.frequency.exponentialRampToValueAtTime(40, when + 0.3);
  gain.gain.setValueAtTime(0.8, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
  osc.connect(gain).connect(audio.destination);
  osc.start(when);
  osc.stop(when + 0.3);
}
```

`noise(0.05, 7000)` is a hi-hat, `noise(0.15, 1000)` is a snare, and `kick()` is a kick.

## a beat

This needs the drum code above. It stays in time even when `setInterval` runs a bit late, because each hit gets scheduled on the audio clock ahead of time.

```loop
const kicks = "x...x...x...x...";
const hats = "..x...x...x...xx"; // both patterns need the same length
const stepLength = 60 / 120 / 4; // 120 beats per minute, 4 steps per beat
let step = 0;
let nextTime = 0;

setInterval(() => {
  if (!audio) return;
  if (nextTime < audio.currentTime) nextTime = audio.currentTime;
  // schedule every step that's due in the next 0.1 seconds
  while (nextTime < audio.currentTime + 0.1) {
    if (kicks[step] == "x") kick(nextTime);
    if (hats[step] == "x") noise(0.05, 7000, nextTime);
    step = (step + 1) % kicks.length;
    nextTime += stepLength;
  }
}, 25);
```

Each character is a step, `x` for a hit and `.` for a rest. Change the patterns to change the beat, and keep them the same length.

## microphone

`getUserMedia` and an `AnalyserNode` let you read the mic, but it might not work for reviewers. Their frame can't ask for mic permission, and browsers handle it differently for data URIs. If you use it, catch the error, have a backup like picking an audio file, and explain how to test it in your README.

Keep it quiet. The code here uses 0.2 volume, and a few sounds at once get loud fast. Assume the reviewer has headphones on.
