import type { ClientChart } from "@/lib/charts";
import type { SheetKey } from "@/lib/chart-types";

export interface StepProps {
  chart: ClientChart;
  update: (patch: Partial<ClientChart>) => void;
}

export interface DataStepProps extends StepProps {
  activeSheet: SheetKey;
  setActiveSheet: (key: SheetKey) => void;
}
