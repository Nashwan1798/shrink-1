/* eslint-disable react/no-unescaped-entities */
import { A, C, Code, H2, P } from "../prose";
import { INPUT_KEYS, INPUT_POINTER, INPUT_UPDATE } from "./snippets";

export default function Input() {
  return (
    <>
      <P>
        Steering, drawing, playing notes: anything where the person is in control the whole time gets this badge. A
        start button isn't enough on its own. The examples here change the red square from the{" "}
        <A href="/app/guides/writing">starting file</A>.
      </P>

      <H2>keyboard</H2>
      <P>
        If you move the player inside <C>onkeydown</C>, holding a key moves it once, pauses, and then keeps going,
        which is awful in a game. Instead, remember which keys are down:
      </P>
      <Code name="keys">{INPUT_KEYS}</Code>
      <P>and then replace <C>update</C> with this, so it moves while the key is held:</P>
      <Code name="update">{INPUT_UPDATE}</Code>
      <P>
        <C>e.code</C> names the physical key (<C>"KeyA"</C>, <C>"ArrowLeft"</C>, <C>"Space"</C>), so WASD still works
        on French or German keyboards, and holding shift doesn't mess it up.
      </P>

      <H2>mouse and touch</H2>
      <P>Pointer events cover mouse and touch at once:</P>
      <Code name="pointer">{INPUT_POINTER}</Code>
      <P>
        Then use it in <C>update</C>. For example, <C>if (pointer.down) player.x = pointer.x;</C> makes the square
        follow your finger or mouse while it's pressed. On phones, also add <C>touch-action: none</C> to the{" "}
        <C>body</C> CSS, or dragging will scroll the page.
      </P>

      <H2>click to start</H2>
      <P>
        In the frame reviewers use, key presses do nothing until someone clicks the app. So if your app uses the
        keyboard, wait for a click:
      </P>
      <Code name="start">{`
let started = false;
addEventListener("pointerdown", () => (started = true));
`}</Code>
      <P>
        Put <C>if (!started) return;</C> as the first line of <C>update</C>, and at the end of <C>draw</C>:
      </P>
      <Code name="end of draw">{`
if (!started) {
  ctx.fillStyle = "white";
  ctx.font = "20px monospace";
  ctx.fillText("click to start", 20, 40);
}
`}</Code>
      <P>
        This uses <C>addEventListener</C> so it doesn't replace the <C>onpointerdown</C> from the pointer code.
      </P>

      <H2>sliders</H2>
      <P>
        For tools and instruments, a normal HTML slider is small and works everywhere. Put it next to the canvas.
        The <C>position: fixed</C> keeps it on top of the canvas instead of hidden below it:
      </P>
      <Code name="html">{`
<input type="range" id="speed" min="0" max="300" value="50" style="position: fixed; top: 10px; left: 10px">
`}</Code>
      <P>
        Then in <C>update</C>, use <C>speed.value</C> where the starting file has <C>50</C>. Keep this code in the
        same <C>{"<script>"}</C> tag as everything else. If you add a second one, the build renames things
        differently in each and they stop finding each other.
      </P>

      <H2>show the controls</H2>
      <P>
        Put them on screen, even as one line of small grey text like "arrows to move, space to jump". Most people
        start pressing things before they'd ever open a README.
      </P>
    </>
  );
}
