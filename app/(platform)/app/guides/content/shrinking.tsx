import { A, C, Code, H2, Note, P, UL } from "../prose";

export default function Shrinking() {
  return (
    <>
      <P>
        Roughly in order of how much each one saves. Most people who are over the limit are over because of the first
        two.
      </P>

      <H2>1. don&rsquo;t over-encode</H2>
      <P>
        Covered in <A href="/app/guides/setup">setup</A>, but
        it&rsquo;s the biggest one. Only <C>%</C>, <C>#</C> and newlines need encoding. Base64 is worse still: it makes
        everything a third bigger, every time.
      </P>

      <H2>2. look at what&rsquo;s actually big</H2>
      <P>
        Open <C>dist/index.html</C> and read it. Minified code is ugly but readable enough to spot the fat. It&rsquo;s
        usually one of these, not variable names:
      </P>
      <UL>
        <li>CSS. Long property lists for layout that could be two properties</li>
        <li>data written out as objects, like a level as an array of 40 objects</li>
        <li>three functions that do almost the same thing</li>
        <li>strings of UI text</li>
      </UL>

      <H2>3. write the HTML tight</H2>
      <P>
        The build script keeps your HTML as you wrote it, minus whitespace. Browsers accept a lot less than you&rsquo;d
        think, so drop what you don&rsquo;t need:
      </P>
      <UL>
        <li>
          no <C>{"<!doctype>"}</C>, <C>{"<html>"}</C> or <C>{"<head>"}</C>
        </li>
        <li>
          no quotes around attribute values without spaces: <C>{"<canvas id=c>"}</C>
        </li>
        <li>
          no closing <C>{"</body>"}</C>
        </li>
      </UL>
      <P>
        Leaving out the doctype puts the page in quirks mode. That&rsquo;s fine for a canvas app. If you&rsquo;re
        doing careful CSS layout and something looks off, that&rsquo;s the first thing to check.
      </P>

      <H2>4. CSS</H2>
      <UL>
        <li>
          Use shorthands: <C>font: 16px monospace</C>, <C>inset: 0</C>, <C>place-items: center</C>
        </li>
        <li>
          <C>display: grid; place-items: center</C> centers anything in two properties
        </li>
        <li>
          Every <C>#</C> costs 3 bytes after encoding. <C>red</C>, <C>tan</C> and <C>gold</C> are shorter than{" "}
          <C>%23f00</C>
        </li>
        <li>
          A <C>style</C> attribute is sometimes shorter than a <C>{"<style>"}</C> block with a selector, sometimes
          not. Count it
        </li>
      </UL>

      <H2>5. things terser can&rsquo;t do for you</H2>
      <P>
        Terser handles names, whitespace, and small stuff like <C>true</C> to <C>!0</C>. It can&rsquo;t change your
        approach, and that&rsquo;s where the real savings are.
      </P>
      <UL>
        <li>
          <strong>Generate instead of list.</strong> Colors from <C>{"hsl(${i * 40} 80% 60%)"}</C>, notes from a
          formula, positions from sin and cos. A loop is shorter than a table.
        </li>
        <li>
          <strong>Store data as strings.</strong> A level map as <C>&quot;#..#..##&quot;</C> and index into it, a
          drum pattern as <C>&quot;x...x.x.&quot;</C>. Much smaller than nested arrays.
        </li>
        <li>
          <strong>One function with parameters</strong> instead of three near-copies.
        </li>
        <li>
          <strong>Pull out Math once.</strong> <C>{"const { sin, cos, PI } = Math"}</C> lets terser rename them to
          single letters.
        </li>
        <li>
          <strong>Assign handlers directly.</strong> <C>{"onkeydown = e => ..."}</C> is shorter than{" "}
          <C>addEventListener</C> and does the same thing when you only need one.
        </li>
      </UL>
      <Code name="generate instead of list">{`
// 64 bytes once the # are encoded, and stuck at 7 colors
const colors = ["#e33", "#e93", "#ee3", "#3e3", "#3ee", "#33e", "#93e"];

// 27 bytes minified, any number of colors
const color = (i) => \`hsl(\${i * 50} 80% 55%)\`;
`}</Code>

      <H2>6. when you&rsquo;re a few hundred over</H2>
      <P>
        Cut a feature. It&rsquo;s nearly always the right call, and faster than an evening of squeezing out bytes one
        at a time. Commit before any big rewrite so you can go back.
      </P>

      <Note>
        Keep <C>src/index.html</C> readable. Reviewers check that your source is in the repo and builds the app. If you
        hand-golf a part because terser can&rsquo;t do it, leave a comment saying what it does.
      </Note>
    </>
  );
}
