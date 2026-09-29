/* eslint-disable react/no-unescaped-entities */
import { A, C, Code, H2, Note, P, UL } from "../prose";

export default function Shrinking() {
  return (
    <>
      <P>
        Over 3,072 bytes? Go down this page in order. The stuff near the top usually saves the most.
      </P>

      <H2>are you using the build script?</H2>
      <P>
        If you made your data URI by hand or with an online converter, look at it. Lots of <C>%3C</C> and <C>%20</C>,
        or <C>;base64,</C> near the start, means it's been encoded in a way that makes it much bigger. One of the
        SHRINK example apps was 44% bigger than it needed to be because of this. The build script from{" "}
        <A href="/app/guides/setup">setting up</A> only escapes the three characters that have to be: <C>%</C>,{" "}
        <C>#</C> and line breaks. Switch to that.
      </P>

      <H2>find what's big</H2>
      <P>
        Open <C>dist/index.html</C> in your editor. It's all on one line, so turn on word wrap first (Alt+Z in VS
        Code, or Option+Z on a Mac). It's messy, but you can usually tell where the bytes went. It tends to be long
        CSS, level data typed out by hand, lots of text, or two functions that are nearly the same.
      </P>

      <H2>HTML</H2>
      <P>You can leave out:</P>
      <UL>
        <li>
          <C>{"<!doctype html>"}</C>, <C>{"<html>"}</C> and <C>{"<head>"}</C>
        </li>
        <li>
          quotes around attribute values that have no spaces, so <C>{"<canvas id=c>"}</C> works
        </li>
        <li>
          the closing <C>{"</body>"}</C>
        </li>
      </UL>
      <P>
        Without the doctype, a few CSS layout rules work slightly differently. If your layout looks off, put it back
        and see if that fixes it.
      </P>

      <H2>CSS</H2>
      <UL>
        <li>
          Use shorthands: <C>font: 16px monospace</C> sets size and font in one go, and <C>inset: 0</C> sets top,
          right, bottom and left.
        </li>
        <li>
          <C>display: grid; place-items: center</C> centers something in two properties.
        </li>
        <li>
          <C>#</C> and <C>%</C> both cost 3 bytes in a data URI. <C>#f00</C> is 6 bytes and <C>red</C> is 3.{" "}
          <C>width: 100%</C> costs 2 more than it looks, so <C>100vw</C> can be cheaper.
        </li>
      </UL>

      <H2>JavaScript</H2>
      <P>
        Terser (the part of the build that shrinks JavaScript) already shortens names and strips spaces. Anything
        past that depends on how you write the code.
      </P>
      <P>If you've typed out a list of values, see if you can calculate them:</P>
      <Code name="colors">{`
// 64 bytes once each # becomes %23, and you're stuck with 7 colors
const colors = ["#e33", "#e93", "#ee3", "#3e3", "#3ee", "#33e", "#93e"];

// 29 bytes after the build, and it gives you as many colors as you want
const color = (i) => \`hsl(\${i * 50} 80% 55%)\`;
`}</Code>
      <P>
        Store maps and patterns as strings and read them one character at a time. Use something other than{" "}
        <C>#</C> for walls, since <C>#</C> costs 3 bytes:
      </P>
      <Code name="map">{`
// 8 wide, 3 tall. "w" is a wall
const map = "wwwwwwww" + "w......w" + "wwwwwwww";
const isWall = (x, y) => map[y * 8 + x] == "w";
`}</Code>
      <UL>
        <li>
          If you have <C>drawPlayer</C> and <C>drawEnemy</C> and they're almost the same, make one <C>drawThing</C>{" "}
          and pass in whatever's different.
        </li>
        <li>
          If you call <C>Math.sin</C> and friends a lot, write <C>{"const { sin, cos } = Math"}</C> once at the top.
          The build can rename <C>sin</C> to one letter but can't do that to <C>Math.sin</C>. It's only worth it if
          you use each one several times.
        </li>
        <li>
          <C>{"onkeydown = (e) => { ... }"}</C> is shorter than <C>addEventListener("keydown", ...)</C>, as long as
          nothing else in your app sets <C>onkeydown</C> too. Setting it again replaces the first one.
        </li>
      </UL>

      <H2>still over</H2>
      <P>
        Cut a feature. It's usually faster than scraping off bytes one by one, and whoever plays it probably won't
        notice it's gone. Commit first so you can bring it back.
      </P>

      <Note>
        Keep <C>src/index.html</C> readable, however tight you get. Reviewers check that it's the code your app is
        built from.
      </Note>
    </>
  );
}
