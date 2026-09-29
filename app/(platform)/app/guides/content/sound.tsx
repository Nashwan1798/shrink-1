import { C, Code, H2, Note, P, UL } from "../prose";
import { SOUND_BEEP, SOUND_LOOP, SOUND_NOISE, SOUND_NOTES } from "./snippets";

export default function Sound() {
  return (
    <>
      <P>
        You can&rsquo;t load an audio file, so every sound gets made from scratch. The Web Audio API makes that easier
        than it sounds. An oscillator makes a tone, a gain node controls how loud it is, and you plug one into the
        other.
      </P>

      <H2>start on a click</H2>
      <P>
        Browsers won&rsquo;t play sound until the user has clicked or pressed a key. Create the{" "}
        <C>AudioContext</C> inside the first input handler, not when the page loads, or it starts suspended and stays
        silent.
      </P>

      <H2>one function for most sounds</H2>
      <Code name="beep">{SOUND_BEEP}</Code>
      <P>
        The fade-out matters. A tone that stops dead makes a click. The <C>type</C> changes the character:{" "}
        <C>sine</C> is soft, <C>square</C> sounds like an old console, <C>sawtooth</C> is buzzy, <C>triangle</C> is
        somewhere in between.
      </P>
      <UL>
        <li>jump: a square wave with its frequency ramping up</li>
        <li>hit: a short burst of noise (below)</li>
        <li>coin: two quick beeps, the second one higher</li>
        <li>game over: a slow sine sliding down</li>
      </UL>
      <P>
        To slide pitch, use <C>osc.frequency.exponentialRampToValueAtTime(target, when)</C> the same way the gain is
        faded.
      </P>

      <H2>notes</H2>
      <P>
        Pitches go up by a factor of 2 every octave, split into 12 steps, so one formula covers every note. Pick from a
        pentatonic scale and random melodies stop sounding random.
      </P>
      <Code name="notes">{SOUND_NOTES}</Code>

      <H2>drums from noise</H2>
      <P>
        Random samples make white noise. Filter out the low end and it sounds like a hi-hat or snare. A kick drum is a
        sine wave that drops fast in pitch.
      </P>
      <Code name="drums">{SOUND_NOISE}</Code>

      <H2>keeping time</H2>
      <P>
        <C>setTimeout</C> and <C>setInterval</C> drift by several milliseconds, which you can hear in a beat. Web Audio
        has its own clock, <C>audio.currentTime</C>, and everything takes a start time. So check often, and book the
        sounds that are coming up soon at exact times.
      </P>
      <Code name="loop">{SOUND_LOOP}</Code>

      <H2>microphone</H2>
      <P>
        <C>getUserMedia</C> gets mic input, and an <C>AnalyserNode</C> turns it into numbers you can draw. It&rsquo;s
        unreliable here though. The preview on SHRINK can&rsquo;t ask for mic access, and browsers are inconsistent
        about permissions on data URIs. If you use it, catch the error and fall back to something, like a file picker
        for an audio file, and explain how to test it in your README.
      </P>

      <Note>
        Keep the volume low. 0.2 gain on one sound is plenty, and a few playing at once add up. Assume the reviewer
        is wearing headphones.
      </Note>
    </>
  );
}
