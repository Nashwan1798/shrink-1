Either of the two ways below gets the badge. Start with the first one, where you do the math yourself on a normal canvas. The shader after it is for when you want solid shapes with lighting and don't mind more setup.

## doing the math yourself

Train tracks look like they meet in the distance, because further-away things look smaller and closer to the middle of what you're looking at. In code, a point has `x`, `y`, and `z` for how far away it is, and dividing `x` and `y` by `z` gives you where it lands on the screen.

To spin the points, you rotate them before dividing. That takes a bit of `sin` and `cos`, which you can use without knowing why it works.

Replace the `draw` function in the [starting file](/app/guides/writing) with this and you'll get a spinning cloud of 500 dots:

```points
const { sin, cos, random } = Math;

// 500 random points in a cube that goes from -1 to 1
const points = Array.from({ length: 500 }, () => [random() * 2 - 1, random() * 2 - 1, random() * 2 - 1]);

function project([x, y, z], angle) {
  // spin around the up-down axis
  const rx = x * cos(angle) - z * sin(angle);
  let rz = x * sin(angle) + z * cos(angle);
  let ry = y;
  rz += 3; // push it away from the camera so it's in front of us
  const scale = c.height / rz; // further away = smaller
  return [c.width / 2 + rx * scale, c.height / 2 + ry * scale, rz];
}

function draw(time) {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, c.width, c.height);
  const projected = points.map((p) => project(p, time / 2000));
  projected.sort((a, b) => b[2] - a[2]); // far ones first, so near ones end up on top
  for (const [x, y, z] of projected) {
    const size = 12 / z;
    ctx.fillStyle = `hsl(40 100% ${90 - z * 15}%)`;
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
  }
}
```

To tilt it as well as spin it, add these two lines just above `rz += 3`:

```tilt
ry = y * cos(angle / 2) - rz * sin(angle / 2);
rz = y * sin(angle / 2) + rz * cos(angle / 2);
```

## a WebGL shader

A shader is a small program that runs on the graphics card. The one that matters here (the "fragment shader") runs once for every pixel, and its job is to decide that pixel's color. It's written in GLSL, which is like JavaScript except you have to say what type everything is (`float`, `vec3` and so on).

This demo uses raymarching. For each pixel, picture a line going from the camera, through that pixel, into the scene. The `scene` function tells you how far any point is from the nearest surface. So you move along the line by that distance, ask again, and keep going. When the distance gets tiny, you've hit a surface, and the pixel is colored by how much that surface faces the light.

The JavaScript part sets up WebGL and draws one big triangle that covers the screen, so the shader has pixels to run on. You can leave it alone. This is a complete app that draws a spinning gold box. It builds to about 1.6kb, so about half your space is left for your own scene.

```src/index.html
<body>
  <canvas id="c"></canvas>
  <style>
    /* full screen */
    body { margin: 0; background: #000; overflow: hidden; }
    canvas { display: block; }
  </style>
  <script>
    // marks shader text for the build script. it hands the text back unchanged
    const glsl = (s) => s[0];
    const gl = c.getContext("webgl");

    // places the big triangle. you can leave this one alone
    const vertex = glsl`
      attribute vec2 p;
      void main() { gl_Position = vec4(p, 0, 1); }
    `;

    // runs once for every pixel and decides its color
    const fragment = glsl`
      precision mediump float;
      uniform float t;
      uniform vec2 r;

      float scene(vec3 p) {
        p.xz *= mat2(cos(t), -sin(t), sin(t), cos(t));
        p.yz *= mat2(cos(t * .7), -sin(t * .7), sin(t * .7), cos(t * .7));
        return length(max(abs(p) - .6, 0.)) - .1;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy * 2. - r) / r.y;
        vec3 p = vec3(0, 0, -3), dir = normalize(vec3(uv, 1.5));
        float d = 1.;
        for (int i = 0; i < 80; i++) {
          d = scene(p);
          if (d < .001) break;
          p += dir * d;
        }
        vec3 color = vec3(0);
        if (d < .001) {
          vec2 e = vec2(.001, 0);
          vec3 n = normalize(vec3(
            scene(p + e.xyy) - scene(p - e.xyy),
            scene(p + e.yxy) - scene(p - e.yxy),
            scene(p + e.yyx) - scene(p - e.yyx)
          ));
          color = vec3(1, .75, .1) * max(dot(n, normalize(vec3(1, 1, -1))), .15);
        }
        gl_FragColor = vec4(color, 1);
      }
    `;

    const program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      console.log(gl.getShaderInfoLog(shader)); // shader errors show up here
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    gl.useProgram(program);

    // One triangle big enough to cover the whole screen.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const time = gl.getUniformLocation(program, "t");
    const size = gl.getUniformLocation(program, "r");

    onresize = () => {
      c.width = innerWidth;
      c.height = innerHeight;
      gl.viewport(0, 0, c.width, c.height);
      gl.uniform2f(size, c.width, c.height);
    };
    onresize();

    function frame(ms) {
      gl.uniform1f(time, ms / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  </script>
</body>
```

### your own scene

Everything you see comes from `scene()`, which returns how far `p` is from the nearest surface. Some shapes to build with:

- sphere: `length(p) - 1.` (1 is the radius)
- box: `length(max(abs(p) - .5, 0.))` (.5 is half its width)
- flat floor: `p.y + 1.`
- move a shape by subtracting from `p` first, so `length(p - vec3(2., 0., 0.)) - 1.` is a sphere moved to the right

To show two shapes, work out both distances and return the smaller one:

```scene
float scene(vec3 p) {
  float ball = length(p) - 1.;
  float ground = p.y + 1.;
  return min(ball, ground);
}
```

`max(a, -b)` cuts shape `b` out of shape `a`. Inigo Quilez has a [long list of shapes](https://iquilezles.org/articles/distfunctions/) written this way.

### when it doesn't work

- A broken shader gives you a black screen. Open the console (F12) and look for the error message. The demo logs it for you.
- GLSL is fussy about numbers. If `x` is a `float`, `x * 2` is an error and `x * 2.` is fine, because `2` is a whole number and `2.` is a decimal. Inside things like `vec3(0, 1, 0)` either works. If you get an error, check for a missing dot first.
- Don't use lines that start with `#`, like `#define`. The build puts the whole shader on one line, and those need their own line.
- If it's slow, draw fewer pixels. In `onresize`, use `innerWidth / 2` and `innerHeight / 2`, then add `width: 100vw; height: 100vh` to the canvas CSS so it still fills the screen.

> `glsl` in front of the shader text is a marker for the build script, which uses it to find and squash your shaders. Don't use `${}` inside them. The marker only keeps the text before the first `${}`.
