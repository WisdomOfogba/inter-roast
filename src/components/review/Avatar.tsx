/** GitHub avatar via our same-origin proxy (keeps PNG export working), or a monogram. */
export function Avatar({ id, login, size, src }: { id: number; login: string; size: number; src?: string | null }) {
  const url = src === undefined ? `/api/avatar/${id}` : src;
  if (!url) {
    return (
      <span
        aria-hidden
        className="grid shrink-0 place-items-center rounded-full bg-panel-2 font-semibold text-muted ring-1 ring-line"
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      >
        {login.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full bg-panel-2 ring-1 ring-line" style={{ width: size, height: size }} />;
}
