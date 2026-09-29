import { A, C, Code, H2, H3, Note, P, UL } from "../prose";
import { THREE_PROJECTION, WEBGL } from "./snippets";

export default function Three() {
  return (
    <>
      <P>
        Two ways to do it. Projecting points yourself on a 2D canvas is short and easy to follow, and it&rsquo;s
        enough for wireframes, particles and starfields. A WebGL shader costs more bytes up front but gets you solid,
        lit shapes. Both count.
      </P>

      <H2>projecting it yourself</H2>
      <P>
        A point at <C>(x, y, z)</C> lands on screen at <C>(x / z, y / z)</C>, scaled up and moved to the center.
        Things further away get divided by more, so they shrink toward the middle. That&rsquo;s all perspective is.
        Rotation is sin and cos on two of the three axes.
      </P>
      <Code name="points">{THREE_PROJECTION}</Code>
      <UL>
        <li>sorting by depth and drawing far to near is how you fake which thing is in front</li>
        <li>
          for lines, project both ends of each edge and <C>lineTo</C> between them. A cube is 8 points and 12 edges
        </li>
        <li>to rotate on more axes, do the same sin/cos step again on another pair (y and z, say)</li>
      </UL>

      <H2>a WebGL shader</H2>
      <P>
        This draws one triangle that covers the screen and runs a small program, the fragment shader, for every pixel.
        The shader sends a ray out from the camera through that pixel and steps along it until it hits something. The
        scene is one function that says how far any point is from the nearest surface.
      </P>
      <P>
        Complete, working, and about 1.5kb after the build script, which leaves room for your own scene.
      </P>
      <Code name="src/index.html">{WEBGL}</Code>

      <H3>changing the scene</H3>
      <P>
        Everything happens in <C>scene()</C>. It returns a distance, and you build shapes from these:
      </P>
      <UL>
        <li>
          sphere: <C>length(p) - radius</C>
        </li>
        <li>
          box: <C>length(max(abs(p) - size, 0.))</C>
        </li>
        <li>
          floor: <C>p.y + 1.</C>
        </li>
        <li>
          two shapes together: <C>min(a, b)</C>. One cut out of the other: <C>max(a, -b)</C>
        </li>
        <li>
          infinite copies: <C>p = mod(p + 1., 2.) - 1.</C> before measuring
        </li>
      </UL>
      <P>
        <A href="https://iquilezles.org/articles/distfunctions/">Inigo Quilez&rsquo;s list of distance functions</A>{" "}
        has nearly every shape you&rsquo;d want.
      </P>

      <H3>things that trip people up</H3>
      <UL>
        <li>
          GLSL wants <C>1.</C> not <C>1</C> for floats. Mixing them is a compile error
        </li>
        <li>
          shader errors are silent. While writing it, log{" "}
          <C>gl.getShaderInfoLog(shader)</C> after compiling, and take it out before shipping
        </li>
        <li>
          no <C>#define</C> or other <C>#</C> lines. The build script puts shaders on one line, and those need their
          own
        </li>
        <li>
          if it&rsquo;s slow, render fewer pixels: set <C>c.width</C> to half of <C>innerWidth</C> and stretch it
          with CSS
        </li>
      </UL>

      <Note>
        The <C>glsl</C> tag in the example does nothing at runtime. It&rsquo;s a marker so the build script knows
        which strings are shaders and can squeeze their whitespace. Don&rsquo;t use <C>{"${}"}</C> inside them.
      </Note>
    </>
  );
}
