import { A, C, Code, H2, Note, P, UL } from "../prose";
import { SKELETON } from "./snippets";

export default function Writing() {
  return (
    <>
      <H2>pick something that fits</H2>
      <P>
        3kb is roughly 3,000 characters after minifying. That&rsquo;s room for one idea done properly. It is not room
        for menus, levels, settings and a tutorial. The apps that turn out well usually have one mechanic or one toy at
        the center, and the time goes into making that feel good.
      </P>
      <P>
        A decent test: can you describe the whole app in one sentence without using &ldquo;and&rdquo;? If not, cut
        until you can, and add things back if you have bytes left at the end.
      </P>

      <H2>ignore the size at first</H2>
      <P>
        Write it readable. Long names, comments, blank lines. Terser strips and renames all of that for free, so short
        names in your source save you nothing. Run the build now and then to see where you stand. If you&rsquo;re at
        2kb with half the features done, it&rsquo;s better to find out early.
      </P>

      <H2>a shape that works for most apps</H2>
      <P>
        Most of these come down to the same thing: some state, a function that changes it over time, a function that
        draws it, and input handlers that poke it. This is a starting point, not a template to fill in:
      </P>
      <Code name="src/index.html">{SKELETON}</Code>
      <P>
        Two things in there that look odd. <C>c</C> is never declared: an element with <C>id=&quot;c&quot;</C> is
        available as a global called <C>c</C>, which saves you a <C>getElementById</C>. And <C>dt</C> is capped at 0.1
        seconds, so when the tab is in the background and comes back, things don&rsquo;t jump across the screen.
      </P>

      <H2>no libraries</H2>
      <P>
        Nothing can be loaded from the network, and even a small library minified is bigger than your whole budget. The
        browser has enough built in. Canvas for drawing, Web Audio for sound, plain DOM elements for UI.
      </P>
      <P>Things that cost almost nothing because the browser does the work:</P>
      <UL>
        <li>
          <C>{"<input type=range>"}</C>, <C>{"<input type=color>"}</C>, <C>{"<select>"}</C>, <C>{"<button>"}</C>
        </li>
        <li>
          <C>contenteditable</C> for a text area that looks like part of the page
        </li>
        <li>CSS transitions and animations, instead of animating in JS</li>
        <li>
          <C>font: 20px monospace</C> and the other built-in font families
        </li>
      </UL>

      <H2>things that don&rsquo;t work</H2>
      <UL>
        <li>
          <strong>localStorage.</strong> A data URI has no origin, so storage throws an error. High scores reset on
          reload. If you want to try it anyway, wrap it in <C>try</C>/<C>catch</C>.
        </li>
        <li>
          <strong>Fonts, images, sounds from anywhere else.</strong> All blocked. If you want an image, draw it, or
          store it in a string and decode it yourself.
        </li>
        <li>
          <strong>Emoji and non-English text, by default.</strong> Without a charset, browsers read the URI as the
          wrong encoding and you get garbage. Add <C>{"<meta charset=utf-8>"}</C> if you need them. Each emoji is
          about 4 bytes, which is still cheap for a picture.
        </li>
      </UL>

      <H2>test it in more than one place</H2>
      <P>
        The preview on SHRINK runs your app in a sandboxed frame with the network blocked. That&rsquo;s what reviewers
        see first, so check it there. Try another browser if you have one, and a phone if your app takes touch. If
        it only works with a keyboard, that&rsquo;s fine, but say so on screen.
      </P>

      <Note>
        Keyboard apps inside a frame only get key presses after the frame is clicked. Put &ldquo;click to start&rdquo;
        somewhere visible.
      </Note>

      <H2>when you&rsquo;re stuck</H2>
      <P>
        Ask in #shrink on Slack. For tricks, <A href="https://www.dwitter.net">Dwitter</A> has thousands of 140-character
        canvas demos and <A href="https://js13kgames.com">js13k</A> has years of small games with source. Read how they
        did something, then close the tab and write it yourself. Reviewers look at your source, and a copy is easy to
        spot. <A href="https://developer.mozilla.org">MDN</A> covers every API mentioned in these guides.
      </P>
    </>
  );
}
