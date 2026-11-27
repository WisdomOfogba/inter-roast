import { Activity, FileText, Languages, Pin, Skull, Star, Tag, UserRound, type LucideIcon } from "lucide-react";
import type { CategoryId } from "@/types/roast";

const ICONS: Record<CategoryId, LucideIcon> = {
  graveyard: Skull,
  readme: FileText,
  languages: Languages,
  presentation: Tag,
  stars: Star,
  activity: Activity,
  pinned: Pin,
  personality: UserRound,
};

export function CategoryIcon({ category, className = "size-4" }: { category: CategoryId; className?: string }) {
  const Icon = ICONS[category];
  return <Icon className={className} aria-hidden />;
}
