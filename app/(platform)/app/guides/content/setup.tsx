/* eslint-disable react/no-unescaped-entities */
import { A, C, Code, H2, Note, OL, P, UL } from "../prose";
import { BUILD_SCRIPT } from "./snippets";

export default function Setup() {
  return (
    <>
      <P>
        Nobody writes the data URI by hand. You write a normal HTML file, and a build script packs it into the one
        line you submit. Getting that set up takes about 15 minutes.
      </P>

      <H2>1. install things</H2>
      <OL>
        <li>
          An editor. <A href="https://code.visualstudio.com">VS Code</A> if you don't have one.
        </li>
        <li>
          <A href="https://hackatime.hackclub.com">Hackatime</A>. Sign in there and follow its steps to add it to your
          editor. It tracks how long you code, and you get BITES for that time.
        </li>
        <li>
          <A href="https://nodejs.org">Node.js</A>, which comes with <C>npm</C>. It runs the build script.
        </li>
        <li>
          <A href="https://git-scm.com">git</A>, and a <A href="https://github.com">GitHub</A> account.
        </li>
      </OL>
      <P>
        If VS Code was open while you installed these, restart it. Also, Hackatime only sees your editor, so time
        spent writing code on a site like CodePen won't count.
      </P>

      <H2>2. make the folder</H2>
      <P>
        Make a new folder called <C>my-app</C> (Finder on a Mac, File Explorer on Windows), somewhere you'll find it
        again. In VS Code, go to File → Open Folder and pick it. Hackatime names the project after the folder, so
        every app gets its own folder.
      </P>
      <P>
        Then open a terminal inside VS Code with Terminal → New Terminal. It starts in your folder. Check Node and
        git are there:
      </P>
      <Code name="terminal">{`
node -v
git --version
`}</Code>
      <P>
        Both should print a version. On Windows, if <C>npm</C> or <C>node</C> complains that "running scripts is
        disabled", click the arrow next to the + in the terminal panel and switch to Command Prompt.
      </P>
      <P>If you've never used git on this computer, tell it who you are (use your GitHub email):</P>
      <Code name="terminal">{`
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
`}</Code>

      <H2>3. set up the project</H2>
      <Code name="terminal">{`
git init
npm init -y
npm install --save-dev terser
`}</Code>
      <P>
        That makes a <C>package.json</C> and installs terser, which shrinks JavaScript. Now make these files in VS
        Code:
      </P>
      <UL>
        <li>
          <C>.gitignore</C> (starts with a dot) with just <C>node_modules</C> in it, so git skips that big folder
        </li>
        <li>
          <C>src/index.html</C>, with this to start. You'll replace it with your app later.
        </li>
      </UL>
      <Code name="src/index.html">{`
<body>
  <h1>it works</h1>
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
        All of your app goes in this file. Use one <C>{"<style>"}</C> tag for CSS and one <C>{"<script>"}</C> tag
        for JavaScript, written exactly like that, with nothing extra like <C>type="module"</C> or <C>src=</C>{" "}
        inside the tag, or the build can't handle them.
      </P>

      <H2>4. add the build script</H2>
      <P>
        Make <C>build.mjs</C> next to <C>package.json</C> and paste this in. You don't need to understand it.
      </P>
      <Code name="build.mjs">{BUILD_SCRIPT}</Code>
      <Code name="terminal">{`
node build.mjs
`}</Code>
      <P>
        It prints how many bytes you've used (the test file is around 200) and makes a <C>dist</C> folder.{" "}
        <C>dist/uri.txt</C> is your app as one line, which is what you paste into the ship form.{" "}
        <C>dist/index.html</C> is the same shrunk code as a normal file.
      </P>
      <P>
        Try it: copy everything in <C>uri.txt</C>, paste it into your browser's address bar and press enter. Click
        "it works" and it should change.
      </P>

      <Note>
        The build renames your functions and variables. So <C>{'<button onclick="start()">'}</C> breaks after a
        build, because <C>start</C> has a new name. Hook up events in the script instead:{" "}
        <C>button.onclick = start</C>.
      </Note>

      <H2>5. put it on GitHub</H2>
      <P>
        On GitHub, click + in the top right, then New repository. Make it <strong>Public</strong>, since ships need
        a public repo, and leave "Add a README" off. Then back in the terminal:
      </P>
      <Code name="terminal">{`
git add .
git commit -m "first version"
`}</Code>
      <P>
        GitHub's page for the new repo shows a box called "…or push an existing repository from the command line".
        Copy those three lines and run them. They end with <C>git push</C>.
      </P>
      <P>
        That first push needs you to log in. On Windows a browser window pops up. On a Mac it asks for a password in
        the terminal, and your GitHub password won't work there, so install{" "}
        <A href="https://cli.github.com">GitHub CLI</A> first, run <C>gh auth login</C>, and say yes when it asks
        about git. (<A href="https://desktop.github.com">GitHub Desktop</A> also works if you'd rather click
        buttons.)
      </P>
      <P>After that, whenever you get something working:</P>
      <Code name="terminal">{`
git add .
git commit -m "say what you changed"
git push
`}</Code>
      <P>
        Try to push most days. The reviewer can see every commit, and one giant commit on the last night looks like
        the code came from somewhere else.
      </P>

      <H2>day to day</H2>
      <P>
        Edit <C>src/index.html</C> and keep it open in a browser tab (drag the file onto the tab). Refresh after each
        change.
      </P>
      <P>
        Every so often, run the build and paste <C>uri.txt</C> into the address bar, because a few things work in
        the plain file but not in the real thing. Minifying can occasionally break code, and <C>localStorage</C>{" "}
        works in the file but not in a data URI.
      </P>
      <P>
        If you get a blank page, press F12 (Cmd+Option+J on a Mac) to open the console. Errors show up in red, with
        the line number.
      </P>
    </>
  );
}
