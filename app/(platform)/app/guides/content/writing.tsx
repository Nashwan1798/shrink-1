/* eslint-disable react/no-unescaped-entities */
import { A, C, Code, H2, P, UL } from "../prose";
import { SKELETON } from "./snippets";

export default function Writing() {
  return (
    <>
      <H2>pick an idea that fits</H2>
      <P>
        3kb is about 3,000 characters of minified code, which is enough for a whole game or instrument as long as it
        does one main thing. Menus and levels on top of that usually won't fit. One sentence test: if you can't say
        what it does in one, it's too big, and the extras can wait until the end when you know how much room is
        left.
      </P>

      <H2>write it long first</H2>
      <P>
        Give variables real names and write comments. The build shortens variable and function names and removes
        comments, so none of that counts against you. The one catch is property names, the part after a dot like{" "}
        <C>player.speed</C>, which stay exactly as you typed them. Keep those short-ish.
      </P>

      <H2>a starting file</H2>
      <P>
        Most apps here keep some state (where the player is, the score), change it a little every frame in{" "}
        <C>update</C>, paint it in <C>draw</C>, and change it again when someone presses something. Here's an empty
        version. Paste it into <C>src/index.html</C> and a red square slides across the screen. The badge
        guides give you code to swap into it.
      </P>
      <Code name="src/index.html">{SKELETON}</Code>
      <P>A few things in there you might not have seen:</P>
      <UL>
        <li>
          <C>c</C> is never declared. An element with <C>id="c"</C> automatically gets a variable called <C>c</C>.
        </li>
        <li>
          <C>requestAnimationFrame(frame)</C> runs <C>frame</C> right before the browser next draws the screen, and{" "}
          <C>frame</C> asks for that again at the end. That's the loop, about 60 times a second.
        </li>
        <li>
          <C>dt</C> is the seconds since the last frame, so <C>50 * dt</C> means "50 pixels per second". It moves the
          same speed on a 60Hz monitor as on a 144Hz one.
        </li>
        <li>
          <C>time</C> is milliseconds since the page opened.
        </li>
      </UL>
      <P>Apps that are mostly buttons and text can skip the canvas and the loop.</P>

      <H2>no libraries</H2>
      <P>
        Nothing can be loaded from the internet (and libraries are too big anyway), so it's all plain JavaScript.{" "}
        <C>{"<input type=range>"}</C> gives you a slider, <C>{"<input type=color>"}</C> a color picker, and{" "}
        <C>contenteditable</C> makes any element typeable. Fonts like <C>monospace</C> and <C>sans-serif</C> are free.
      </P>

      <H2>things that don't work</H2>
      <UL>
        <li>
          <C>localStorage</C> throws an error in a data URI, so scores can't be saved. If you use it, wrap it in{" "}
          <C>try</C>/<C>catch</C>.
        </li>
        <li>Images, fonts and sounds from other sites are all blocked. Draw or generate what you need.</li>
        <li>
          Emoji and accented letters need <C>{"<meta charset=utf-8>"}</C> at the top, or they turn into garbage.
        </li>
      </UL>

      <H2>where reviewers run it</H2>
      <P>
        Reviewers open your app in a frame on the SHRINK site. It's the same as the address bar except for two
        things. <C>alert()</C>, <C>confirm()</C> and <C>prompt()</C> are blocked, so show messages on the page. And
        the keyboard does nothing until someone clicks the app, which the{" "}
        <A href="/app/guides/input">input guide</A> has a fix for.
      </P>

      <H2>stuck?</H2>
      <P>
        Ask in #shrink on Slack. <A href="https://developer.mozilla.org">MDN</A> documents everything these guides
        use, and <A href="https://www.dwitter.net">Dwitter</A> and <A href="https://js13kgames.com">js13k</A> are
        full of tricks for tiny code. Use code from these guides freely. Anything you find elsewhere, work out how it
        does what it does and then write your own version, since the reviewer does read your code and pasted code
        stands out.
      </P>
    </>
  );
}
