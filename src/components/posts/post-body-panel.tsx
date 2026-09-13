export function PostBodyPanel({ body }: { body: string }) {
  return (
    <article className="rounded-2xl border border-border/60 bg-card/70 p-4 text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
      {body}
    </article>
  );
}
