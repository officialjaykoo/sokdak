import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const logoClass = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-4xl",
} as const;

/** Sokdak wordmark — text-based until a real logo asset exists. */
export function BrandLogo({ size = "md", className }: BrandLogoProps) {
  return (
    <span
      className={cn(
        "font-heading font-bold tracking-tight text-foreground select-none",
        logoClass[size],
        className
      )}
    >
      속닥속닥
    </span>
  );
}
