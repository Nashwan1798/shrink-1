/* eslint-disable react/no-unescaped-entities */
import { C, Code, H2, P } from "../prose";
import { SOUND_ARPEGGIO, SOUND_BEEP, SOUND_JUMP, SOUND_LOOP, SOUND_NOISE, SOUND_NOTES } from "./snippets";

export default function Sound() {
  return (
    <>
      <P>
        No sound files allowed, so you make sound from scratch with the Web Audio API. An oscillator plays a tone
        (440 is an A, lower numbers are lower notes), and a gain node sets the volume from 0 to 1.
      </P>

      <H2>it needs a click first</H2>
      <P>
        Browsers keep a page silent until someone clicks or presses a key on it. Make the <C>AudioContext</C> any
        earlier and nothing plays, with only a warning in the console to tell you why, which is an easy half hour
        to lose. The code below waits.
      </P>

      <H2>beeps</H2>
      <P>Put this near the top of your script:</P>
      <Code name="beep">{SOUND_BEEP}</Code>
      <P>
        After the first click, <C>beep(440)</C> plays a short A and <C>beep(220, 1, "sine")</C> plays a lower,
        softer one for a second. Before that click, <C>beep</C> just does nothing. For the third argument,{" "}
        <C>"sine"</C> is smooth, <C>"square"</C> sounds like an old console, <C>"sawtooth"</C> buzzes and{" "}
        <C>"triangle"</C> is in between. Each beep fades out at the end, because a sound that stops dead makes a
        click.
      </P>

      <H2>sliding the pitch</H2>
      <P>Most game sounds are one note sliding up or down. This one goes from 200 to 800, which sounds like a jump:</P>
      <Code name="jump">{SOUND_JUMP}</Code>
      <P>Slide it down slowly instead for game over.</P>

      <H2>notes</H2>
      <Code name="notes">{SOUND_NOTES}</Code>
      <P>
        <C>beep(note(60))</C> is middle C. If you call <C>beep</C> three times in a row they all play at once, as a
        chord. To play notes one after another, give each one a start time:
      </P>
      <Code name="one after another">{SOUND_ARPEGGIO}</Code>
      <P>For random music, use <C>randomNote()</C> so every note comes from the scale.</P>

      <H2>drums</H2>
      <Code name="drums">{SOUND_NOISE}</Code>
      <P>
        <C>noise(0.05, 7000)</C> is a hi-hat, <C>noise(0.15, 1000)</C> is a snare, and <C>kick()</C> is a kick.
      </P>

      <H2>a beat</H2>
      <P>
        This needs the drum code above. It stays in time even when <C>setInterval</C> runs a bit late, because each
        hit gets scheduled on the audio clock ahead of time.
      </P>
      <Code name="loop">{SOUND_LOOP}</Code>
      <P>
        Each character is a step, <C>x</C> for a hit and <C>.</C> for a rest. Change the patterns to change the
        beat, and keep them the same length.
      </P>

      <H2>microphone</H2>
      <P>
        <C>getUserMedia</C> and an <C>AnalyserNode</C> let you read the mic, but it might not work for reviewers. Their
        frame can't ask for mic permission, and browsers handle it differently for data URIs. If you use it, catch
        the error, have a backup like picking an audio file, and explain how to test it in your README.
      </P>

      <P>
        Keep it quiet. The code here uses 0.2 volume, and a few sounds at once get loud fast. Assume the reviewer
        has headphones on.
      </P>
    </>
  );
}
