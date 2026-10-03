## what should you make?

How large is 3kb? What can you even do with 3kb? 3kb is roughly 3000 characters. That's enough for a simple game or shader! One simple rule you can keep in mind: if you can't say what it does in one sentence, it's too big! My suggestion would be to build the basics first, and after finishing, look at how much space you have left to add other stuff.

## you don't have to compress everything in the very beginning!

Name your variables so you can understand them and write comments! The build script shortens variable and function names and removes comments anyways. The only thing it can't shorten is property names (the bit after the dot, like `player.speed`), so don't make those super long.

## how do i start?

Do it however you want! :p At the end of the daym it's just a HTML file. Here's an example project you can put into `src/index.html` if you don't know where to start. It's a red square sliding across the screen animation.

```src/index.html
<body>
  <canvas id="c"></canvas>
  <style>
    body { margin: 0; overflow: hidden; background: black; }
  </style>
  <script>
    const ctx = c.getContext("2d");

    // variables for the entire app
    let player = { x: 100, y: 100 };

    function update(dt) {
      // move 50 pixels every second, and wrap around at the edge
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

## no libraries

Nothing can load from the internet! Everything will have to all be local JavaScript. The browser gives you more than you'd think though! `<input type=range>` is a slider, `<input type=color>` is a color picker, `contenteditable` lets you type into anything, and fonts like `monospace` and `sans-serif`.


## need help?

Ask in #shrink on Slack!

## Other resources 
Check out [Dwitter](https://www.dwitter.net) and [js13k](https://js13kgames.com)! They're both a site full of projects under a specific size limit, One for graphics, and one for games.
