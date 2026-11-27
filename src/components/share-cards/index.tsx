import type { CardProps, CardStyle } from "./shared";
import { ReportCard } from "./ReportCard";
import { ExposedCard } from "./ExposedCard";
import { DiagnosisCard } from "./DiagnosisCard";

export * from "./shared";

export function RoastCard({ style, ...props }: CardProps & { style: CardStyle }) {
  if (style === "exposed") return <ExposedCard {...props} />;
  if (style === "diagnosis") return <DiagnosisCard {...props} />;
  return <ReportCard {...props} />;
}
