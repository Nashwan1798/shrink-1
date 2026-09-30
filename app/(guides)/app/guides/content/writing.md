## pick an idea that fits

3kb is about 3,000 characters of minified code, which is enough for a whole game or instrument as long as it does one main thing. Menus and levels on top of that usually won't fit. One sentence test: if you can't say what it does in one, it's too big, and the extras can wait until the end when you know how much room is left.

## write it long first

Give variables real names and write comments. The build shortens variable and function names and removes comments, so none of that counts against you. The one catch is property names, the part after a dot like `player.speed`, which stay exactly as you typed them. Keep those short-ish.

## a starting file

Most apps here keep some state (where the player is, the score), change it a little every frame in `update`, paint it in `draw`, and change it again when someone presses something. Here's an empty version. Paste it into `src/index.html` and a red square slides across the screen. The badge guides give you code to swap into it.

```src/index.html
<body>
  <canvas id="c"></canvas>
  <style>
    body { margin: 0; overflow: hidden; background: black; }
  </style>
  <script>
    const ctx = c.getContext("2d");

    // everything the app needs to remember goes up here
    let player = { x: 100, y: 100 };

    function update(dt) {
      // move 50 pixels per second, and wrap around at the edge
      player.x = (player.x + 50 * dt) % c.width;
    }

    function draw(time) {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "tomato";
      ctx.fillRect(player.x, player.y, 20, 20);
    }

    onresize = () => {
      c.width = innerWidth;
      c.height = innerHeight;
    };
    onresize();

    let last = 0;
    function frame(now) {
      update(Math.min((now - last) / 1000, 0.1));
      last = now;
      draw(now);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  </script>
</body>
```

A few things in there you might not have seen:

- `c` is never declared. An element with `id="c"` automatically gets a variable called `c`.
- `requestAnimationFrame(frame)` runs `frame` right before the browser next draws the screen, and `frame` asks for that again at the end. That's the loop, about 60 times a second.
- `dt` is the seconds since the last frame, so `50 * dt` means "50 pixels per second". It moves the same speed on a 60Hz monitor as on a 144Hz one.
- `time` is milliseconds since the page opened.

Apps that are mostly buttons and text can skip the canvas and the loop.

## no libraries

Nothing can be loaded from the internet (and libraries are too big anyway), so it's all plain JavaScript. `<input type=range>` gives you a slider, `<input type=color>` a color picker, and `contenteditable` makes any element typeable. Fonts like `monospace` and `sans-serif` are free.

## things that don't work

- `localStorage` throws an error in a data URI, so scores can't be saved. If you use it, wrap it in `try`/`catch`.
- Images, fonts and sounds from other sites are all blocked. Draw or generate what you need.
- Emoji and accented letters need `<meta charset=utf-8>` at the top, or they turn into garbage.

## where reviewers run it

Reviewers open your app in a frame on the SHRINK site. It's the same as the address bar except for two things. `alert()`, `confirm()` and `prompt()` are blocked, so show messages on the page. And the keyboard does nothing until someone clicks the app, which the [input guide](/app/guides/input) has a fix for.

## stuck?

Ask in #shrink on Slack. [MDN](https://developer.mozilla.org) documents everything these guides use, and [Dwitter](https://www.dwitter.net) and [js13k](https://js13kgames.com) are full of tricks for tiny code. Use code from these guides freely. Anything you find elsewhere, work out how it does what it does and then write your own version, since the reviewer does read your code and pasted code stands out.
