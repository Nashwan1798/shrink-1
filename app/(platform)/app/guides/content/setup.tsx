/* eslint-disable react/no-unescaped-entities */
import { A, C, Code, H2, Note, OL, P, UL } from "../prose";
import { BUILD_SCRIPT } from "./snippets";

export default function Setup() {
  return (
    <>
      <P>
        Welcome to SHRINK! You might wonder... How the helly do i write these Data URIs? The truth it: nobody writes the data URI line by hand! You actually write a relatively HTML file, and a build script packs it into the one
        line :) It's quick and easy to set that up:
      </P>

      <H2>1. install things</H2>
      <OL>
        <li>
          An editor. I'd personally recommend <A href="https://code.visualstudio.com">VS Code</A> if you're getting started.
        </li>
        <li>
          <A href="https://hackatime.hackclub.com">Hackatime</A>. That's how we track how long you code! You get 1 BITEs per hour.
        </li>
        <li>
          <A href="https://nodejs.org">Node.js</A>, which comes with <C>npm</C>. The purpose is that it runs the build script.
        </li>
        <li>
          <A href="https://git-scm.com">git</A>, and a <A href="https://github.com">GitHub</A> (or whatever git host you use) account.
        </li>
      </OL>

      <H2>2. make the folder</H2>
      <P>
        Make a new folder called <C>my-app</C> (or whatever name you want). In VS Code, go to File → Open Folder and pick it.
        Your work should be primary in that folder so hackatime'll count!
      </P>
      <P>
        Then open a terminal inside VS Code with Terminal → New Terminal (if you're not using VS Code just do it whatever way you want.) Check that Node and
        git are there:
      </P>
      <Code name="terminal">{`
node -v
git --version
`}</Code>

      <H2>3. set up the project</H2>
      <Code name="terminal">{`
git init
npm init -y
npm install --save-dev terser
`}</Code>
      <P>
        By running these commands, it makes a <C>package.json</C> and installs terser, which shrinks JavaScript. Now make these files in your folder:
      </P>
      <UL>
        <li>
          <C>src/index.html</C>, with this to start. You'll replace it with your app soon :D
        </li>
      </UL>
      <Code name="src/index.html">{`
<body>
  <h1>it works!</h1>
  <style>
    body { background: black; color: white; font-family: sans-serif; }
  </style>
  <script>
    const title = document.querySelector("h1");
    title.onclick = () => (title.textContent = "you clicked it");
  </script>
</body>
`}</Code>
      <P>
        All of your project goes in this file! Use ONE <C>{"<style>"}</C> tag for CSS and ONE <C>{"<script>"}</C> tag
        for JavaScript. It'll essentially functions as a HTML file, but cooler :-D
      </P>

      <H2>4. add the build script</H2>
      <P>
        Make <C>build.mjs</C> in your folder. It's DEFINITELY okay if you don't understand it! Basically all it does is it shrinks your file to a one-line Data URI.
      </P>
      <Code name="build.mjs">{BUILD_SCRIPT}</Code>
      <Code name="terminal">{`
node build.mjs
`}</Code>
      <P>
        It prints how many bytes you've used (the test file is around 200) and makes a <C>dist</C> folder.{" "}
        It exports to <C>dist/uri.txt</C>, which is your app as one line in Data URI, which is what you paste into the ship form!{" "}
        You can check it out by pasting the URI link in your browser.
      </P>

      <H2>5. put it on GitHub (or whatever git provider you use)</H2>
      <P>
        On GitHub, click + in the top right, then New repository. Make it <strong>Public</strong>, since ships need
        a public repo :D In the terminal, you run:
      </P>
      <Code name="terminal">{`
git add .
git commit -m "first commit!"
`}</Code>
      <P>
        GitHub's page for the new repo shows a box called "…or push an existing repository from the command line".
        Copy those three lines and run them. (the one that ends with <C>git push</C>)
      </P>

      <P>To commit:</P>
      <Code name="terminal">{`
git add .
git commit -m "say what you changed"
git push
`}</Code>
      <P>
        Try to push frequently when you work!. The reviewer should be able to see as you work so we know your work is real. (We do a lot of fraud checks!!)
      </P>

      <H2>How do i work?</H2>
      <P>
        Edit <C>src/index.html</C> and keep it open in a browser tab (drag the file onto the tab).
      </P>
      <P>
        If you get a blank page, press F12 (Cmd+Option+J on a Mac) to open the console.
      </P>
    </>
  );
}
