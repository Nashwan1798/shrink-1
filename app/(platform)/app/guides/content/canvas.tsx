import { A, C, Code, H2, Note, P, UL } from "../prose";
import { CANVAS_PIXELS, CANVAS_TRAILS } from "./snippets";

export default function Canvas() {
  return (
    <>
      <P>
        Canvas is the cheapest way to get a lot on screen. One element, one context, and every drawing call is a few
        bytes. The badge is for apps drawn with it, not ones with a canvas off in a corner.
      </P>

      <H2>getting a context</H2>
      <Code name="setup">{`
<canvas id="c"></canvas>
<script>
  const ctx = c.getContext("2d");
  onresize = () => {
    c.width = innerWidth;
    c.height = innerHeight;
  };
  onresize();
</script>
`}</Code>
      <P>
        Setting <C>width</C> or <C>height</C> also clears the canvas and resets its settings (fill color, font,
        transforms). Some tiny demos resize every frame for exactly that reason. It works, but set your styles after
        it.
      </P>

      <H2>the calls you&rsquo;ll use most</H2>
      <UL>
        <li>
          <C>fillRect(x, y, w, h)</C>: the cheapest shape there is. Pixel art, bars, backgrounds, clearing the screen
        </li>
        <li>
          <C>beginPath()</C>, <C>arc(x, y, r, 0, 7)</C>, <C>fill()</C>: circles. 7 is just over 2π and shorter to type
        </li>
        <li>
          <C>moveTo</C>, <C>lineTo</C>, <C>stroke()</C>: lines and outlines
        </li>
        <li>
          <C>fillText(text, x, y)</C>: text, using whatever <C>ctx.font</C> is set to
        </li>
        <li>
          <C>save()</C>, <C>translate</C>, <C>rotate</C>, <C>restore()</C>: draw something rotated around its own center
        </li>
        <li>
          <C>globalAlpha</C>, <C>globalCompositeOperation = &quot;lighter&quot;</C>: glow and blending with no extra
          work
        </li>
      </UL>

      <H2>trails and color</H2>
      <P>
        Instead of clearing each frame, paint a mostly transparent rectangle over the last one. Old frames fade out and
        anything moving leaves a trail. Colors from <C>hsl()</C> let you cycle through the rainbow with one number.
      </P>
      <Code name="draw">{CANVAS_TRAILS}</Code>

      <H2>working per pixel</H2>
      <P>
        For effects like plasma, fire or noise, write pixels straight into an <C>ImageData</C>. Keep the buffer small
        and let CSS stretch it. 160×90 is 14,400 pixels, which any laptop can redo every frame. Full screen at
        1920×1080 is over 2 million, which is too slow in plain JS.
      </P>
      <Code name="pixels">{CANVAS_PIXELS}</Code>

      <Note>
        <C>image-rendering: pixelated</C> keeps the stretched pixels sharp. Leave it out and you get a soft blur, which
        also looks nice for some effects.
      </Note>

      <H2>more</H2>
      <P>
        <A href="https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D">
          CanvasRenderingContext2D on MDN
        </A>{" "}
        lists every method. <A href="https://www.dwitter.net">Dwitter</A> is a good place to see how far 140 characters
        of canvas can go.
      </P>
    </>
  );
}
