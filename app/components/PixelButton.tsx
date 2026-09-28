import type { ButtonHTMLAttributes } from "react";

const base =
  "font-pixel inline-flex cursor-pointer items-center gap-[0.5em] border-[0.1em] px-[1em] py-[0.4em] font-medium leading-none outline outline-[0.1em] select-none active:translate-y-[0.1em] disabled:cursor-not-allowed disabled:opacity-50";

export const pixelButtonVariants = {
  light: "border-black bg-white text-black outline-white hover:bg-accent focus-visible:bg-accent focus-visible:outline-black",
  dark: "border-white bg-black text-white outline-black hover:bg-accent hover:text-black focus-visible:bg-accent focus-visible:text-black",
} as const;

type Variant = keyof typeof pixelButtonVariants;

export const pixelButtonClass = `${base} ${pixelButtonVariants.light}`;

export default function PixelButton({
  className = "",
  variant = "light",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`${base} ${pixelButtonVariants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function OpenIcon({ className = "size-[1em]" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`fill-current ${className}`}>
      <path d="M17 21H5v-2h12v2ZM5 19H3V7h2v12Zm14 0h-2v-6h2v6Zm-8-4H9v-2h2v2Zm2-2h-2v-2h2v2Zm2-2h-2V9h2v2Zm6 0h-2V7h-2V5h-4V3h8v8Zm-4-2h-2V7h2v2Zm-6-2H5V5h6v2Z" />
    </svg>
  );
}
