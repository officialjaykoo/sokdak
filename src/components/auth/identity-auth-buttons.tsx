"use client";

import { Button } from "@/components/ui/button";

function KakaoBrandIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      focusable="false"
    >
      <rect width="24" height="24" rx="6" fill="#FEE500" />
      <path
        fill="#191919"
        d="M12 5.6c-3.6 0-6.5 2.2-6.5 4.9 0 1.7 1.1 3.2 2.8 4.1l-.6 2.2a.45.45 0 0 0 .7.5l2.5-1.7c.4.1.7.1 1.1.1 3.6 0 6.5-2.2 6.5-4.9S15.6 5.6 12 5.6Z"
      />
      <circle cx="9.5" cy="10.5" r=".65" fill="#FEE500" />
      <circle cx="12" cy="10.5" r=".65" fill="#FEE500" />
      <circle cx="14.5" cy="10.5" r=".65" fill="#FEE500" />
    </svg>
  );
}

export function IdentityAuthButtons({
  pending,
  onKakao,
}: {
  pending: boolean;
  onKakao: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={onKakao}
        className="h-11 gap-2 border-yellow-400/50 bg-yellow-300/[0.12] hover:border-yellow-500/70 hover:bg-yellow-300/[0.22]"
      >
        <span className="grid w-24 grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-2 text-left">
          <KakaoBrandIcon />
          <span>Kakao</span>
        </span>
      </Button>
    </div>
  );
}
