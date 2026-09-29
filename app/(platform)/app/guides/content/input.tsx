import { C, Code, H2, Note, P, UL } from "../prose";
import { INPUT_KEYS, INPUT_POINTER } from "./snippets";

export default function Input() {
  return (
    <>
      <P>
        The badge is for apps where input changes what happens. A game you steer, an instrument you play, a toy that
        follows your mouse. A single start button doesn&rsquo;t count for much.
      </P>

      <H2>keyboard</H2>
      <P>
        Don&rsquo;t move things inside <C>onkeydown</C>. It fires once, pauses, then repeats at whatever rate the
        user&rsquo;s OS is set to. Record which keys are held, and read that in your update loop.
      </P>
      <Code name="keys">{INPUT_KEYS}</Code>
      <UL>
        <li>
          <C>e.key</C> is the character (<C>&quot;a&quot;</C>, <C>&quot;A&quot;</C>, <C>&quot;ArrowUp&quot;</C>).{" "}
          <C>e.code</C> is the physical key (<C>&quot;KeyA&quot;</C>), which stays put on non-QWERTY layouts. Use{" "}
          <C>code</C> for WASD
        </li>
        <li>
          <C>preventDefault()</C> on arrows and space stops the page from scrolling
        </li>
      </UL>

      <H2>mouse and touch together</H2>
      <P>
        Pointer events cover mouse, touch and pen with one set of handlers, so there&rsquo;s no need for separate touch
        code.
      </P>
      <Code name="pointer">{INPUT_POINTER}</Code>
      <P>
        Add <C>touch-action: none</C> to the body&rsquo;s CSS, otherwise dragging on a phone scrolls or zooms the page
        instead.
      </P>

      <H2>inputs the browser already has</H2>
      <P>
        For tools and instruments, built-in form elements are nearly free and work everywhere. A{" "}
        <C>{"<input type=range>"}</C> with an <C>oninput</C> handler is a slider in about 40 bytes.
      </P>

      <H2>make the controls obvious</H2>
      <P>
        Nobody reads the README before they try it. Put the controls on screen, even if it&rsquo;s one line of small
        text. &ldquo;arrows to move, space to jump&rdquo; costs 30 bytes and saves every reviewer a minute of guessing.
      </P>

      <Note>
        In a frame, key presses only arrive after the frame has been clicked. If your app is keyboard-only, say
        &ldquo;click to start&rdquo; somewhere, and don&rsquo;t start the game until then.
      </Note>
    </>
  );
}
