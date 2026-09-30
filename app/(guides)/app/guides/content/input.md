Steering, drawing, playing notes: anything where the person is in control the whole time gets this badge. A start button isn't enough on its own. The examples here change the red square from the [starting file](/app/guides/writing).

## keyboard

If you move the player inside `onkeydown`, holding a key moves it once, pauses, and then keeps going, which is awful in a game. Instead, remember which keys are down:

```keys
const held = {};
onkeydown = (e) => {
  held[e.code] = true;
  // stop arrows and space from scrolling the page
  if (e.code.startsWith("Arrow") || e.code == "Space") e.preventDefault();
};
onkeyup = (e) => (held[e.code] = false);
```

and then replace `update` with this, so it moves while the key is held:

```update
function update(dt) {
  if (held.ArrowLeft || held.KeyA) player.x -= 200 * dt;
  if (held.ArrowRight || held.KeyD) player.x += 200 * dt;
}
```

`e.code` names the physical key (`"KeyA"`, `"ArrowLeft"`, `"Space"`), so WASD still works on French or German keyboards, and holding shift doesn't mess it up.

## mouse and touch

Pointer events cover mouse and touch at once:

```pointer
let pointer = { x: 0, y: 0, down: false };

onpointermove = (e) => {
  // turn the position on screen into a position on the canvas,
  // even if the canvas is moved or stretched with CSS
  const box = c.getBoundingClientRect();
  pointer.x = ((e.clientX - box.left) * c.width) / box.width;
  pointer.y = ((e.clientY - box.top) * c.height) / box.height;
};
onpointerdown = (e) => {
  pointer.down = true;
  onpointermove(e);
};
onpointerup = () => (pointer.down = false);
```

Then use it in `update`. For example, `if (pointer.down) player.x = pointer.x;` makes the square follow your finger or mouse while it's pressed. On phones, also add `touch-action: none` to the `body` CSS, or dragging will scroll the page.

## click to start

In the frame reviewers use, key presses do nothing until someone clicks the app. So if your app uses the keyboard, wait for a click:

```start
let started = false;
addEventListener("pointerdown", () => (started = true));
```

Put `if (!started) return;` as the first line of `update`, and at the end of `draw`:

```draw
if (!started) {
  ctx.fillStyle = "white";
  ctx.font = "20px monospace";
  ctx.fillText("click to start", 20, 40);
}
```

This uses `addEventListener` so it doesn't replace the `onpointerdown` from the pointer code.

## sliders

For tools and instruments, a normal HTML slider is small and works everywhere. Put it next to the canvas. The `position: fixed` keeps it on top of the canvas instead of hidden below it:

```html
<input type="range" id="speed" min="0" max="300" value="50" style="position: fixed; top: 10px; left: 10px">
```

Then in `update`, use `speed.value` where the starting file has `50`. Keep this code in the same `<script>` tag as everything else. If you add a second one, the build renames things differently in each and they stop finding each other.

## show the controls

Put them on screen, even as one line of small grey text like "arrows to move, space to jump". Most people start pressing things before they'd ever open a README.
