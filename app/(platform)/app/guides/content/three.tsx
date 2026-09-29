/* eslint-disable react/no-unescaped-entities */
import { A, C, Code, H2, H3, Note, P, UL } from "../prose";
import { THREE_PROJECTION, WEBGL } from "./snippets";

export default function Three() {
  return (
    <>
      <P>
        Either of the two ways below gets the badge. Start with the first one, where you do the math yourself on a
        normal canvas. The shader after it is for when you want solid shapes with lighting and don't mind more
        setup.
      </P>

      <H2>doing the math yourself</H2>
      <P>
        Train tracks look like they meet in the distance, because further-away things look smaller and closer to the
        middle of what you're looking at. In code, a point has <C>x</C>, <C>y</C>, and <C>z</C> for how far away it
        is, and dividing <C>x</C> and <C>y</C> by <C>z</C> gives you where it lands on the screen.
      </P>
      <P>
        To spin the points, you rotate them before dividing. That takes a bit of <C>sin</C> and <C>cos</C>, which
        you can use without knowing why it works.
      </P>
      <P>
        Replace the <C>draw</C> function in the <A href="/app/guides/writing">starting file</A> with this and you'll
        get a spinning cloud of 500 dots:
      </P>
      <Code name="points">{THREE_PROJECTION}</Code>
      <P>To tilt it as well as spin it, add these two lines just above <C>rz += 3</C>:</P>
      <Code name="tilt">{`
ry = y * cos(angle / 2) - rz * sin(angle / 2);
rz = y * sin(angle / 2) + rz * cos(angle / 2);
`}</Code>

      <H2>a WebGL shader</H2>
      <P>
        A shader is a small program that runs on the graphics card. The one that matters here (the "fragment
        shader") runs once for every pixel, and its job is to decide that pixel's color. It's written in GLSL, which
        is like JavaScript except you have to say what type everything is (<C>float</C>, <C>vec3</C> and so on).
      </P>
      <P>
        This demo uses raymarching. For each pixel, picture a line going from the camera, through that pixel, into
        the scene. The <C>scene</C> function tells you how far any point is from the nearest surface. So you move
        along the line by that distance, ask again, and keep going. When the distance gets tiny, you've hit a surface, and the pixel is colored by how much that
        surface faces the light.
      </P>
      <P>
        The JavaScript part sets up WebGL and draws one big triangle that covers the screen, so the shader has pixels
        to run on. You can leave it alone. This is a complete app that draws a spinning gold box. It builds to about
        1.6kb, so about half your space is left for your own scene.
      </P>
      <Code name="src/index.html">{WEBGL}</Code>

      <H3>your own scene</H3>
      <P>
        Everything you see comes from <C>scene()</C>, which returns how far <C>p</C> is from the nearest surface.
        Some shapes to build with:
      </P>
      <UL>
        <li>
          sphere: <C>length(p) - 1.</C> (1 is the radius)
        </li>
        <li>
          box: <C>length(max(abs(p) - .5, 0.))</C> (.5 is half its width)
        </li>
        <li>
          flat floor: <C>p.y + 1.</C>
        </li>
        <li>
          move a shape by subtracting from <C>p</C> first, so <C>length(p - vec3(2., 0., 0.)) - 1.</C> is a sphere
          moved to the right
        </li>
      </UL>
      <P>To show two shapes, work out both distances and return the smaller one:</P>
      <Code name="two shapes">{`
float scene(vec3 p) {
  float ball = length(p) - 1.;
  float ground = p.y + 1.;
  return min(ball, ground);
}
`}</Code>
      <P>
        <C>max(a, -b)</C> cuts shape <C>b</C> out of shape <C>a</C>. Inigo Quilez has a{" "}
        <A href="https://iquilezles.org/articles/distfunctions/">long list of shapes</A> written this way.
      </P>

      <H3>when it doesn't work</H3>
      <UL>
        <li>
          A broken shader gives you a black screen. Open the console (F12) and look for the error message. The demo
          logs it for you.
        </li>
        <li>
          GLSL is fussy about numbers. If <C>x</C> is a <C>float</C>, <C>x * 2</C> is an error and <C>x * 2.</C> is fine, because{" "}
          <C>2</C> is a whole number and <C>2.</C> is a decimal. Inside things like <C>vec3(0, 1, 0)</C> either
          works. If you get an error, check for a missing dot first.
        </li>
        <li>
          Don't use lines that start with <C>#</C>, like <C>#define</C>. The build puts the whole shader on one line,
          and those need their own line.
        </li>
        <li>
          If it's slow, draw fewer pixels. In <C>onresize</C>, use <C>innerWidth / 2</C> and{" "}
          <C>innerHeight / 2</C>, then add <C>width: 100vw; height: 100vh</C> to the canvas CSS so it still fills
          the screen.
        </li>
      </UL>

      <Note>
        <C>glsl</C> in front of the shader text is a marker for the build script, which uses it to find and squash
        your shaders. Don't use <C>{"${}"}</C> inside them. The marker only keeps the text before the first{" "}
        <C>{"${}"}</C>.
      </Note>
    </>
  );
}
