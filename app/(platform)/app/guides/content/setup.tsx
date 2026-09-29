import { A, C, Code, H2, Note, P, UL } from "../prose";
import { BUILD_SCRIPT } from "./snippets";

export default function Setup() {
  return (
    <>
      <P>
        Nobody writes these as one line. You write a normal HTML file, with indentation, comments and real variable
        names, and a script squashes it into the data URI. The readable file goes in your repo. The squashed line is
        what you ship.
      </P>

      <H2>the folder</H2>
      <Code name="layout">{`
my-app/
  src/index.html    the app, written normally
  build.mjs         turns src into the data URI
  dist/index.html   the minified app, for testing
  dist/uri.txt      the line you ship
  README.md
  package.json
`}</Code>
      <P>
        Keep the whole app in one HTML file: CSS in a <C>{"<style>"}</C> tag, JS in a <C>{"<script>"}</C> tag. It all
        ends up in one string anyway, and splitting it up only makes the build script longer.
      </P>

      <H2>editor and Hackatime</H2>
      <P>
        Write it in your editor with the <A href="https://hackatime.hackclub.com">Hackatime</A> plugin installed, and
        open the project folder rather than the single file, so the time lands on one Hackatime project. Time spent in
        online playgrounds usually doesn&rsquo;t get tracked, so don&rsquo;t build it in CodePen and paste it over at
        the end.
      </P>
      <P>One folder per app. Each Hackatime project can only count toward one ship.</P>

      <H2>start the repo</H2>
      <Code name="terminal">{`
mkdir my-app && cd my-app
git init
npm init -y
npm install --save-dev terser
mkdir src
echo node_modules > .gitignore
`}</Code>
      <P>
        Commit <C>dist/uri.txt</C> too, so anyone can grab the line without building it. Commit as you go. Twenty small
        commits over a week tell a reviewer a lot more than one commit on the last day.
      </P>

      <H2>the build script</H2>
      <P>
        Save this as <C>build.mjs</C>. Its only dependency is terser. Use it as is or change it, it&rsquo;s your
        project.
      </P>
      <Code name="build.mjs">{BUILD_SCRIPT}</Code>
      <P>What it does:</P>
      <UL>
        <li>minifies each script with terser, which renames variables and strips whitespace for you</li>
        <li>squeezes whitespace out of CSS and HTML</li>
        <li>
          squeezes shaders written as <C>{"glsl`...`"}</C>, if you do <A href="/app/guides/3d">3D</A>
        </li>
        <li>
          encodes only <C>%</C>, <C>#</C> and newlines, the three characters that break a data URI
        </li>
      </UL>
      <P>
        That last one matters more than it looks. A <C>#</C> starts a URL fragment, so everything after it gets cut
        off, and newlines get stripped when you paste into the address bar. Everything else, including{" "}
        <C>{"<"}</C>, <C>{">"}</C>, quotes and spaces, works fine raw. If you run the whole thing through{" "}
        <C>encodeURIComponent</C> instead, every <C>{"<"}</C> becomes <C>%3C</C>, three bytes instead of one. On some of
        the examples that added 40%.
      </P>
      <Code name="terminal">{`
node build.mjs
# 1570 / 3072 bytes, 1502 left
`}</Code>

      <Note>
        Terser renames your top-level variables and functions. That breaks inline attributes like{" "}
        <C>{'onclick="start()"'}</C>, because <C>start</C> won&rsquo;t be called that anymore. Set handlers from the
        script instead: <C>button.onclick = start</C>.
      </Note>

      <H2>the loop</H2>
      <UL>
        <li>
          Open <C>src/index.html</C> straight from disk and refresh as you edit. You don&rsquo;t need a server, since
          the app can&rsquo;t load anything anyway.
        </li>
        <li>
          Run the build every so often, and open <C>dist/index.html</C> to check the minifier didn&rsquo;t break
          anything. <C>node --watch-path=src build.mjs</C> rebuilds whenever you save.
        </li>
        <li>
          Before you ship, paste <C>dist/uri.txt</C> into a new tab&rsquo;s address bar. That&rsquo;s the real thing.
        </li>
      </UL>
    </>
  );
}
