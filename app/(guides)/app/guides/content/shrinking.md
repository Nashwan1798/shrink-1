Over 3,072 bytes? Go down this page in order. The stuff near the top usually saves the most.

## are you using the build script?

If you made your data URI by hand or with an online converter, look at it. Lots of `%3C` and `%20`, or `;base64,` near the start, means it's been encoded in a way that makes it much bigger. One of the SHRINK example apps was 44% bigger than it needed to be because of this. The build script from [setting up](/app/guides/setup) only escapes the three characters that have to be: `%`, `#` and line breaks. Switch to that.

## find what's big

Open `dist/index.html` in your editor. It's all on one line, so turn on word wrap first (Alt+Z in VS Code, or Option+Z on a Mac). It's messy, but you can usually tell where the bytes went. It tends to be long CSS, level data typed out by hand, lots of text, or two functions that are nearly the same.

## HTML

You can leave out:

- `<!doctype html>`, `<html>` and `<head>`
- quotes around attribute values that have no spaces, so `<canvas id=c>` works
- the closing `</body>`

Without the doctype, a few CSS layout rules work slightly differently. If your layout looks off, put it back and see if that fixes it.

## CSS

- Use shorthands: `font: 16px monospace` sets size and font in one go, and `inset: 0` sets top, right, bottom and left.
- `display: grid; place-items: center` centers something in two properties.
- `#` and `%` both cost 3 bytes in a data URI. `#f00` is 6 bytes and `red` is 3. `width: 100%` costs 2 more than it looks, so `100vw` can be cheaper.

## JavaScript

Terser (the part of the build that shrinks JavaScript) already shortens names and strips spaces. Anything past that depends on how you write the code.

If you've typed out a list of values, see if you can calculate them:

```colors
// 64 bytes once each # becomes %23, and you're stuck with 7 colors
const colors = ["#e33", "#e93", "#ee3", "#3e3", "#3ee", "#33e", "#93e"];

// 29 bytes after the build, and it gives you as many colors as you want
const color = (i) => `hsl(${i * 50} 80% 55%)`;
```

Store maps and patterns as strings and read them one character at a time. Use something other than `#` for walls, since `#` costs 3 bytes:

```map
// 8 wide, 3 tall. "w" is a wall
const map = "wwwwwwww" + "w......w" + "wwwwwwww";
const isWall = (x, y) => map[y * 8 + x] == "w";
```

- If you have `drawPlayer` and `drawEnemy` and they're almost the same, make one `drawThing` and pass in whatever's different.
- If you call `Math.sin` and friends a lot, write `const { sin, cos } = Math` once at the top. The build can rename `sin` to one letter but can't do that to `Math.sin`. It's only worth it if you use each one several times.
- `onkeydown = (e) => { ... }` is shorter than `addEventListener("keydown", ...)`, as long as nothing else in your app sets `onkeydown` too. Setting it again replaces the first one.

## still over

Cut a feature. It's usually faster than scraping off bytes one by one, and whoever plays it probably won't notice it's gone. Commit first so you can bring it back.

> Keep `src/index.html` readable, however tight you get. Reviewers check that it's the code your app is built from.
