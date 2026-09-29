import { A, C, Code, H2, Note, OL, P, UL } from "../prose";

export default function Shipping() {
  return (
    <>
      <H2>what gets checked</H2>
      <P>When you ship, these run before a reviewer ever sees it:</P>
      <OL>
        <li>you&rsquo;ve verified your identity with Hack Club</li>
        <li>there&rsquo;s an address on your Hack Club account</li>
        <li>at least 30 minutes on Hackatime for the projects you pick</li>
        <li>the app doesn&rsquo;t try to load anything from the internet</li>
        <li>a public repo on GitHub, GitLab or Codeberg</li>
        <li>a README that actually explains the app</li>
        <li>the app&rsquo;s readable source is in the repo</li>
      </OL>
      <P>
        Then a person reviews it. They open the app, read the README, look through the code, and decide on hours and
        badges.
      </P>

      <H2>what goes in the repo</H2>
      <UL>
        <li>
          <C>src/</C> with the readable version. A repo that only has the minified line fails the source check
        </li>
        <li>the build script, so someone else can rebuild it</li>
        <li>
          <C>dist/uri.txt</C>, so people can try it without building
        </li>
        <li>the README</li>
      </UL>

      <H2>the README</H2>
      <P>
        Nobody wants an essay. They want to know what it is, how to use it, and what was interesting about making it.
        Write it the way you&rsquo;d explain the app to a friend who asked. A generated README reads like every other
        generated README, and reviewers read a lot of them.
      </P>
      <P>A structure that covers it:</P>
      <Code name="README.md">{`
# name of the app

What it is, in a sentence or two.

## how to use it
Controls, or what to click first.

## how it works
The part you're proud of or that took longest. A few lines is enough.

## building
npm install
node build.mjs    # writes dist/uri.txt

## size
2,811 bytes.
`}</Code>
      <P>
        Screenshots and GIFs in the README are good. The size limit only applies to the app, not the repo.
      </P>

      <H2>claiming badges</H2>
      <P>
        Each badge raises how many BITES the project can earn. Claim the ones your app really uses, and say in the
        README where it uses them. Reviewers check each one, and a badge for a feature that&rsquo;s barely there
        gets taken off.
      </P>
      <UL>
        <li>
          <A href="/app/guides/canvas">canvas</A>: the app is drawn with the Canvas API
        </li>
        <li>
          <A href="/app/guides/sound">web audio</A>: it makes sound with the Web Audio API
        </li>
        <li>
          <A href="/app/guides/input">interactive</A>: it reacts to keyboard, mouse, touch or mic
        </li>
        <li>
          <A href="/app/guides/3d">3D</A>: it renders something in three dimensions
        </li>
      </UL>

      <H2>hours</H2>
      <P>
        You get 1 BITE per hour tracked on Hackatime, up to the project&rsquo;s cap. The reviewer can adjust the
        hours if they don&rsquo;t match the work in the repo.
      </P>

      <Note>
        If a ship gets sent back, the reviewer&rsquo;s message says why. Fix that and ship again.
      </Note>
    </>
  );
}
