Here's some tips on how you can save space if you're over 3kb!

## are you using the build script?

If you made your data URI by hand or with an online converter... don't! First our build script does a really good job shrinking, second is that we'd love to see your source non shrinked script!

## find what's big

Try to spot what's using space, open the `dist/index.html` file in your editor (turn on word wrap) You can usually tell where the bytes went. It tends to be long CSS, other mic data typed out by hand, lots of text, etc.

## HTML

You can actually leave out some of these just fine!

- `<!doctype html>`, `<html>` and `<head>`
- quotes around attribute values that have no spaces, so `<canvas id=c>` works
- the closing `</body>`

Without the doctype, a few CSS layout rules work slightly differently. If your layout looks off, put it back and see if that fixes it.

## CSS

- `display: grid; place-items: center` centers something in two properties.
- `#` and `%` both cost 3 bytes in a data URI! So `#f00` is 6 bytes and `red` is 3. `width: 100%` costs 2 more than it looks, so `100vw` can be cheaper!!

## JavaScript

Terser (the part of the build that shrinks JavaScript) already shortens names and strips spaces. So it really depends on how you write code to further shrink it.

## HELP ITS STILL OVER THE CAP!!!!

Consider removing a feature? It's usually faster than trying very hard to optimize everything, and whoever tries your project probably won't notice it's gone if it's not there in the first place. 

> Keep `src/index.html`, your source file, readable, however tight you get!
