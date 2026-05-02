import { cn, initialsFromName } from "@/lib/utils";

/* eslint-disable @next/next/no-img-element */

type AvatarProps = {
  name: string;
  seed?: string;
  url?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeMap = {
  sm: "h-10 w-10 text-sm rounded-2xl",
  md: "h-12 w-12 text-base rounded-[1.1rem]",
  lg: "h-16 w-16 text-2xl rounded-[1.4rem]",
  xl: "h-24 w-24 text-3xl rounded-[1.8rem]",
};

export function Avatar({
  name,
  seed,
  url,
  size = "md",
  className,
}: AvatarProps) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={cn(
          "object-cover shadow-soft",
          sizeMap[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-accent-soft font-display font-semibold text-accent shadow-soft",
        sizeMap[size],
        className,
      )}
      data-seed={seed}
    >
      {initialsFromName(name)}
    </div>
  );
}
