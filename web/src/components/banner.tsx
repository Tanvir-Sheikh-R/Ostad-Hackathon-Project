"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";

/**
 * The banner artwork, sized by the caller.
 *
 * The image lives at `web/public/banner.png`; when it is absent (fresh clone, or a
 * deployment shipping its own), the component degrades to the brand gradient instead of
 * showing a broken image.
 */
export function BannerImage({
  alt,
  title,
  className = "",
}: {
  alt: string;
  title?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      title={title}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#3d3d9e] via-accent to-[#8b5bd6] ring-1 ring-black/5 ${className}`}
    >
      {failed ? (
        <span className="absolute inset-0 grid place-items-center text-white/85">
          <GraduationCap className="size-5" />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/banner.png"
          alt={alt}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
