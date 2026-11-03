"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";

/**
 * Image banner across the top of the app.
 *
 * The artwork lives at `web/public/banner.png`; when that file is absent (fresh clone,
 * or a deployment that ships its own), the component degrades to the gradient rather
 * than showing a broken image.
 */
export function Banner({ subtitle }: { subtitle: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative h-28 w-full overflow-hidden rounded-3xl app-shadow sm:h-36">
      {failed ? (
        <div className="h-full w-full bg-gradient-to-r from-[#3d3d9e] via-accent to-[#8b5bd6]" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/banner.png"
          alt="পাঠ সমাধান — NCTB পাঠ্যবই সহায়ক"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" />

      <div className="absolute inset-0 flex flex-col justify-center gap-1.5 px-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur">
            <GraduationCap className="size-4" />
          </span>
          <h1 className="text-lg font-bold tracking-tight text-white sm:text-2xl">পাঠ সমাধান</h1>
        </div>
        <p className="max-w-lg pl-0.5 text-[12px] leading-relaxed text-white/85 sm:text-[13px]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
