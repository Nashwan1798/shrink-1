/* eslint-disable react/no-unescaped-entities */
import { BADGES, BADGE_BY_SLUG, BASE_CAP } from "@/lib/program";

import { A, C, Code, H2, Note, OL, P, UL } from "../prose";

const CANVAS = BADGE_BY_SLUG.get("canvas")!.bites;

export default function Shipping() {
  return (
    <>
      <H2>what gets checked</H2>
      <P>
        When you ship, the site checks these first. If one fails, it tells you what to fix. The first two are done
        from the list on your <A href="/app">home page</A>.
      </P>
      <OL>
        <li>you've verified your identity with Hack Club</li>
        <li>your Hack Club account has an address (prizes get mailed there)</li>
        <li>the Hackatime projects you pick on the ship form add up to at least 30 minutes</li>
        <li>the app doesn't load anything from the internet</li>
        <li>your repo is public, on GitHub, GitLab or Codeberg</li>
        <li>the repo has a README that explains the app</li>
        <li>the readable code for the app is in the repo</li>
      </OL>
      <P>Then a reviewer tries your app, reads the README and the code, and decides on hours and badges.</P>

      <H2>what goes in the repo</H2>
      <UL>
        <li>
          <C>src/index.html</C>. A repo with only the one-liner in it fails the code check.
        </li>
        <li>
          <C>build.mjs</C> and <C>package.json</C>
        </li>
        <li>
          <C>dist/uri.txt</C>, so people can try the app without building it
        </li>
        <li>
          <C>README.md</C>
        </li>
      </UL>

      <H2>the README</H2>
      <P>
        Say what it is, how to use it, and one thing about how you made it. Short is fine, and write it yourself. AI-written READMEs all sound the same, and reviewers read a lot of them.
      </P>
      <P>You could lay it out like this, and change whatever you want:</P>
      <Code name="README.md">{`
# name of your app

What it is, in a sentence or two.

## how to use it
The controls, or what to click first.

## how it works
Something that was tricky, or a part you like.

## building
\`\`\`
npm install
node build.mjs
\`\`\`
The data URI ends up in dist/uri.txt. It's ____ bytes.
`}</Code>
      <P>
        A screenshot or GIF of it running helps too. The 3kb limit is only for the app, so the repo can have anything
        in it.
      </P>

      <H2>badges</H2>
      <P>
        On the ship form you tick the badges your app earned, and the reviewer checks them. Only tick the ones it
        really uses, and say in the README where. If it barely uses one, like a single beep, the reviewer will
        probably take that badge off.
      </P>
      <UL>
        <li>
          <A href="/app/guides/canvas">canvas</A>: drawn with the Canvas API
        </li>
        <li>
          <A href="/app/guides/sound">web audio</A>: makes sound with the Web Audio API
        </li>
        <li>
          <A href="/app/guides/input">interactive</A>: responds to the keyboard, mouse or touch
        </li>
        <li>
          <A href="/app/guides/3d">3D</A>: shows something in 3D
        </li>
      </UL>

      <H2>how BITES work</H2>
      <P>
        BITES are what you spend in the <A href="/app/shop">shop</A>. You get 1 for every hour on Hackatime, but each
        ship has a cap. The cap starts at {BASE_CAP}, and each badge raises it:{" "}
        {BADGES.map((b, i) => (
          <span key={b.slug}>
            {i > 0 && (i === BADGES.length - 1 ? " and " : ", ")}
            {b.title.replace(/[<>]/g, "")} +{b.bites}
          </span>
        ))}
        .
      </P>
      <P>
        So 10 hours with no badges gets you {BASE_CAP} BITES. 10 hours with the canvas badge (cap of {BASE_CAP + CANVAS})
        gets you all 10. The reviewer can lower the hours if they don't match the work in the repo.
      </P>

      <Note>If your ship gets sent back, the reviewer's message says why. Fix it and ship again.</Note>
    </>
  );
}
