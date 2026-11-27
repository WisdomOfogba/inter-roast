import type { ProfileSummary } from "@/types/github";
import { Avatar } from "./Avatar";
import { compact } from "./format";

export function ProfileHeader({ profile, avatarSrc, linkable = true }: { profile: ProfileSummary; avatarSrc?: string | null; linkable?: boolean }) {
  const joined = new Date(profile.createdAt).getUTCFullYear();
  const stats = [
    { label: "public repos", value: compact(profile.publicRepos) },
    { label: "followers", value: compact(profile.followers) },
    { label: "following", value: compact(profile.following) },
    { label: "on GitHub since", value: String(joined) },
  ];
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <Avatar id={profile.id} login={profile.login} size={72} src={avatarSrc} />
      <div className="min-w-0">
        <p className="truncate text-2xl font-semibold tracking-[-0.02em]">{profile.name ?? profile.login}</p>
        {linkable ? (
          <a
            href={`https://github.com/${profile.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[15px] text-muted underline decoration-line-strong underline-offset-4 hover:text-fg"
          >
            github.com/{profile.login}
          </a>
        ) : (
          <span className="font-mono text-[15px] text-muted">github.com/{profile.login}</span>
        )}
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[15px]">
          {stats.map((s) => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <dt className="sr-only">{s.label}</dt>
              <dd className="font-mono font-semibold text-fg">{s.value}</dd>
              <span aria-hidden className="text-muted">{s.label}</span>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
