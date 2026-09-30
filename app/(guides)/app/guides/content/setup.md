Welcome to SHRINK! You might wonder... How the helly do i write these Data URIs? The truth it: nobody writes the data URI line by hand! You actually write a relatively HTML file, and a build script packs it into the one line :) It's quick and easy to set that up:

## 1. install things

1. An editor. I'd personally recommend [VS Code](https://code.visualstudio.com) if you're getting started.
2. [Hackatime](https://hackatime.hackclub.com). That's how we track how long you code! You get 1 BITEs per hour.
3. [Node.js](https://nodejs.org), which comes with `npm`. The purpose is that it runs the build script.
4. [git](https://git-scm.com), and a [GitHub](https://github.com) (or whatever git host you use) account.

## 2. make the folder

Make a new folder called `my-app` (or whatever name you want). In VS Code, go to File → Open Folder and pick it. Your work should be primary in that folder so hackatime'll count!

Then open a terminal inside VS Code with Terminal → New Terminal (if you're not using VS Code just do it whatever way you want.) Check that Node and git are there:

```terminal
node -v
git --version
```

## 3. set up the project

```terminal
git init
npm init -y
npm install --save-dev terser
```

By running these commands, it makes a `package.json` and installs terser, which shrinks JavaScript. Now make these files in your folder:

- `src/index.html`, with this to start. You'll replace it with your app soon :D

```src/index.html
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
```

All of your project goes in this file! Use ONE `<style>` tag for CSS and ONE `<script>` tag for JavaScript. It'll essentially functions as a HTML file, but cooler :-D

## 4. add the build script

Make `build.mjs` in your folder. It's DEFINITELY okay if you don't understand it! Basically all it does is it shrinks your file to a one-line Data URI.

```build.mjs
// Turns src/index.html into one data URI. Run: node build.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { minify } from "terser";

const LIMIT = 3072;
const src = readFileSync("src/index.html", "utf8");

// Squeeze whitespace in shaders written as glsl`...` (terser leaves strings alone).
function glsl(code) {
  return code
    .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([-+*\/=<>(){}\[\];,!&|?:])\s*/g, "$1")
    .trim();
}

let html = "";
for (const part of src.split(/(<script>[\s\S]*?<\/script>|<style>[\s\S]*?<\/style>)/)) {
  if (part.startsWith("<script>")) {
    const js = part.slice(8, -9).replace(/glsl`([^`]*)`/g, (_, s) => JSON.stringify(glsl(s)));
    const { code } = await minify(js, { toplevel: true, compress: { passes: 3 } });
    html += "<script>" + code + "</script>";
  } else if (part.startsWith("<style>")) {
    html += part
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*([{};:,>])\s*/g, "$1")
      .replace(/;}/g, "}");
  } else {
    html += part.replace(/<!--[\s\S]*?-->/g, "").replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
  }
}

// Only these three break a data URI. Encoding anything else costs bytes for nothing.
const uri = "data:text/html," + html.replace(/%/g, "%25").replace(/#/g, "%23").replace(/\n/g, "%0A");

mkdirSync("dist", { recursive: true });
writeFileSync("dist/index.html", html);
writeFileSync("dist/uri.txt", uri);

const bytes = Buffer.byteLength(uri);
console.log(bytes + " / " + LIMIT + " bytes, " + (bytes > LIMIT ? bytes - LIMIT + " over" : LIMIT - bytes + " left"));
```

```terminal
node build.mjs
```

It prints how many bytes you've used (the test file is around 200) and makes a `dist` folder. It exports to `dist/uri.txt`, which is your app as one line in Data URI, which is what you paste into the ship form! You can check it out by pasting the URI link in your browser.

## 5. put it on GitHub (or whatever git provider you use)

On GitHub, click + in the top right, then New repository. Make it **Public**, since ships need a public repo :D In the terminal, you run:

```terminal
git add .
git commit -m "first commit!"
```

GitHub's page for the new repo shows a box called "…or push an existing repository from the command line". Copy those three lines and run them. (the one that ends with `git push`)

To commit:

```terminal
git add .
git commit -m "say what you changed"
git push
```

Try to push frequently when you work!. The reviewer should be able to see as you work so we know your work is real. (We do a lot of fraud checks!!)

## How do i work?

Edit `src/index.html` and keep it open in a browser tab (drag the file onto the tab).

If you get a blank page, press F12 (Cmd+Option+J on a Mac) to open the console.
