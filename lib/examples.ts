import {
  CUBE_DATA_URI,
  DRUMS_DATA_URI,
  FLAPPY_DATA_URI,
  MORSE_DATA_URI,
  PIANO_DATA_URI,
  PLASMA_DATA_URI,
  SNAKE_DATA_URI,
  THEREMIN_DATA_URI,
  VISUALIZER_DATA_URI,
} from "@/app/components/example-uris";
import { GAME_DATA_URI } from "@/app/components/game-data-uri";

export const EXAMPLES: { title: string; size: string; uri: string; thumb: string }[] = [
  { title: "Space fighter", size: "2.7kb", uri: GAME_DATA_URI, thumb: "/design/project-thumb.png" },
  {
    title: "Flappy square",
    size: "1.4kb",
    uri: FLAPPY_DATA_URI,
    thumb: "/design/thumb-flappy.png",
  },
  {
    title: "Piano",
    size: "1.2kb",
    uri: PIANO_DATA_URI,
    thumb: "/design/thumb-piano.png",
  },
  {
    title: "Audio visualizer",
    size: "1.1kb",
    uri: VISUALIZER_DATA_URI,
    thumb: "/design/thumb-visualizer.png",
  },
  {
    title: "Snake",
    size: "1.3kb",
    uri: SNAKE_DATA_URI,
    thumb: "/design/thumb-snake.png",
  },
  {
    title: "Morse beeper",
    size: "1.2kb",
    uri: MORSE_DATA_URI,
    thumb: "/design/thumb-morse.png",
  },
  {
    title: "Plasma",
    size: "0.7kb",
    uri: PLASMA_DATA_URI,
    thumb: "/design/thumb-plasma.png",
  },
  {
    title: "Drum machine",
    size: "1.6kb",
    uri: DRUMS_DATA_URI,
    thumb: "/design/thumb-drums.png",
  },
  {
    title: "3D cube",
    size: "1.3kb",
    uri: CUBE_DATA_URI,
    thumb: "/design/thumb-cube.png",
  },
  {
    title: "Theremin",
    size: "1.3kb",
    uri: THEREMIN_DATA_URI,
    thumb: "/design/thumb-theremin.png",
  },
];
