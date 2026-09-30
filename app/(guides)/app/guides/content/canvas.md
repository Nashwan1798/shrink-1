A `<canvas>` is a rectangle you draw on with JavaScript. For the badge, the canvas has to be the main part of what people see. A little drawing in the corner of a page won't get it.

Everything below plugs into the [starting file](/app/guides/writing). That's where `c` (the canvas), `ctx` (what you draw with) and `draw(time)` come from.

## coordinates

`(0, 0)` is the top-left corner, `x` goes right, and `y` goes _down_ (backwards from math class). Everything's in pixels.

## drawing things

- `ctx.fillStyle = "red"` picks the color for whatever you draw after it.
- `ctx.fillRect(x, y, width, height)` draws a rectangle. Drawing one over the whole canvas is how you clear the screen.
- `ctx.beginPath(); ctx.arc(x, y, radius, 0, 7); ctx.fill();` draws a circle. `beginPath` starts a new shape, and without it every circle you've drawn gets filled again. The `0, 7` is the start and end angle. A full circle is about 6.28, so 7 covers it.
- `ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();` draws a line. Lines are black unless you set `ctx.strokeStyle = "white"` first, which you'll need on a black background.
- `ctx.font = "20px monospace"` and then `ctx.fillText("hi", x, y)` draws text.

## trails and rainbows

The starting file clears the screen every frame. If you cover it with see-through black instead, old frames fade out slowly and anything that moves leaves a trail. Replace the `draw` function with this:

```draw
function draw(time) {
  // a see-through rectangle instead of a clear leaves trails
  ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
  ctx.fillRect(0, 0, c.width, c.height);

  for (let i = 0; i < 12; i++) {
    const angle = time / 1000 + i / 2;
    ctx.fillStyle = `hsl(${i * 30} 90% 60%)`;
    ctx.beginPath();
    ctx.arc(c.width / 2 + Math.cos(angle) * 150, c.height / 2 + Math.sin(angle * 1.3) * 150, 10, 0, 7);
    ctx.fill();
  }
}
```

The backticks make a template string, and `${i * 30}` puts the value of `i * 30` into it. In `hsl()` the first number is the hue, from 0 to 360 around the color wheel, so each dot gets its own color.

## spinning something

`ctx.rotate` spins around `(0, 0)`, the top-left corner, so you move `(0, 0)` to the middle of the thing first and draw it centered there. Add this at the end of `draw`:

```spin
ctx.save();
ctx.translate(200, 150); // move to where the middle of the square should be
ctx.rotate(time / 500); // spin a bit more every frame
ctx.fillRect(-25, -25, 50, 50); // draw it centered on that point
ctx.restore(); // undo the move and the spin
```

If it spins around a corner instead of its middle, you probably drew it at `(0, 0)` instead of at `(-25, -25)`.

## setting every pixel

Effects like fire, plasma or static set the color of each pixel one by one, using `ImageData`, which holds 4 numbers per pixel (red, green, blue, and opacity), each from 0 to 255.

On a big screen that's millions of pixels, and it gets choppy. So cheat. Use a small canvas, like 160 by 90, and let CSS stretch it. This one is a whole file, so use it instead of the starting file, not inside it:

```src/index.html
<canvas id="c" width="160" height="90"></canvas>
<style>
  body { margin: 0; overflow: hidden; }
  canvas { width: 100vw; height: 100vh; image-rendering: pixelated; }
</style>
<script>
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(160, 90);

  function frame(time) {
    for (let y = 0; y < 90; y++) {
      for (let x = 0; x < 160; x++) {
        const v = Math.sin(x / 8 + time / 900) + Math.sin(y / 6 - time / 700);
        const i = (y * 160 + x) * 4; // where this pixel's 4 numbers start
        img.data[i] = 128 + 127 * Math.sin(v * 3); // red
        img.data[i + 1] = 128 + 127 * Math.sin(v * 3 + 2); // green
        img.data[i + 2] = 200; // blue
        img.data[i + 3] = 255; // opacity
      }
    }
    ctx.putImageData(img, 0, 0);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
</script>
```

> `image-rendering: pixelated` keeps the stretched pixels sharp. Take it out if you'd rather they blur, which can look nice for smoke or glow.

For gradients, images made in code, and the rest, there's [MDN's canvas tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial).
