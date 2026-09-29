/* eslint-disable react/no-unescaped-entities */
import { A, C, Code, H2, Note, P, UL } from "../prose";
import { CANVAS_PIXELS, CANVAS_ROTATE, CANVAS_TRAILS } from "./snippets";

export default function Canvas() {
  return (
    <>
      <P>
        A <C>{"<canvas>"}</C> is a rectangle you draw on with JavaScript. For the badge, the canvas has to be the
        main part of what people see. A little drawing in the corner of a page won't get it.
      </P>
      <P>
        Everything below plugs into the <A href="/app/guides/writing">starting file</A>. That's where <C>c</C> (the
        canvas), <C>ctx</C> (what you draw with) and <C>draw(time)</C> come from.
      </P>

      <H2>coordinates</H2>
      <P>
        <C>(0, 0)</C> is the top-left corner, <C>x</C> goes right, and <C>y</C> goes <em>down</em> (backwards from
        math class). Everything's in pixels.
      </P>

      <H2>drawing things</H2>
      <UL>
        <li>
          <C>ctx.fillStyle = "red"</C> picks the color for whatever you draw after it.
        </li>
        <li>
          <C>ctx.fillRect(x, y, width, height)</C> draws a rectangle. Drawing one over the whole canvas is how you
          clear the screen.
        </li>
        <li>
          <C>ctx.beginPath(); ctx.arc(x, y, radius, 0, 7); ctx.fill();</C> draws a circle. <C>beginPath</C> starts a
          new shape, and without it every circle you've drawn gets filled again. The <C>0, 7</C> is the start and end
          angle. A full circle is about 6.28, so 7 covers it.
        </li>
        <li>
          <C>ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();</C> draws a line. Lines are black
          unless you set <C>ctx.strokeStyle = "white"</C> first, which you'll need on a black background.
        </li>
        <li>
          <C>ctx.font = "20px monospace"</C> and then <C>ctx.fillText("hi", x, y)</C> draws text.
        </li>
      </UL>

      <H2>trails and rainbows</H2>
      <P>
        The starting file clears the screen every frame. If you cover it with see-through black instead, old frames
        fade out slowly and anything that moves leaves a trail. Replace the <C>draw</C> function with this:
      </P>
      <Code name="draw">{CANVAS_TRAILS}</Code>
      <P>
        The backticks make a template string, and <C>{"${i * 30}"}</C> puts the value of <C>i * 30</C> into it. In{" "}
        <C>hsl()</C> the first number is the hue, from 0 to 360 around the color wheel, so each dot gets its own
        color.
      </P>

      <H2>spinning something</H2>
      <P>
        <C>ctx.rotate</C> spins around <C>(0, 0)</C>, the top-left corner, so you move <C>(0, 0)</C> to the middle of
        the thing first and draw it centered there. Add this at the end of <C>draw</C>:
      </P>
      <Code name="spin">{CANVAS_ROTATE}</Code>
      <P>
        If it spins around a corner instead of its middle, you probably drew it at <C>(0, 0)</C> instead of at{" "}
        <C>(-25, -25)</C>.
      </P>

      <H2>setting every pixel</H2>
      <P>
        Effects like fire, plasma or static set the color of each pixel one by one, using <C>ImageData</C>, which
        holds 4 numbers per pixel (red, green, blue, and opacity), each from 0 to 255.
      </P>
      <P>
        On a big screen that's millions of pixels, and it gets choppy. So cheat. Use a small canvas, like 160 by 90,
        and let CSS stretch it. This one is a whole file, so use it instead of the starting file, not inside it:
      </P>
      <Code name="src/index.html">{CANVAS_PIXELS}</Code>

      <Note>
        <C>image-rendering: pixelated</C> keeps the stretched pixels sharp. Take it out if you'd rather they blur,
        which can look nice for smoke or glow.
      </Note>

      <P>
        For gradients, images made in code, and the rest, there's{" "}
        <A href="https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial">MDN's canvas tutorial</A>.
      </P>
    </>
  );
}
