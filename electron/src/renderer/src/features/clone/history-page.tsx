import { useRef, useState } from "react";
import { HistoryIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WorkspaceHeader } from "@/components/app-shell/workspace-header";
import { WorkspacePane } from "@/components/workspace-pane";
import { useHistory } from "@/hooks/use-history";
import { RecentTakes } from "./voices-sidebar";
import { TakeDetails } from "./take-details";

export function HistoryPage() {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const history = useHistory();
  const selected = history.data?.find((item) => item.id === selectedId);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <WorkspaceHeader>
        <h1>{t("tone.history")}</h1>
      </WorkspaceHeader>
      <div className="relative flex min-h-0 flex-1">
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto p-4">
          <RecentTakes
            scrollRef={scrollRef}
            selectedId={selectedId}
            onOpen={(item) => setSelectedId(item.id)}
          />
        </div>
        {selected && (
          <WorkspacePane
            title={t("clone.output_title")}
            icon={HistoryIcon}
            onClose={() => setSelectedId(null)}
            className="max-sm:absolute max-sm:inset-y-0 max-sm:right-0"
          >
            <TakeDetails key={selected.id} item={selected} />
          </WorkspacePane>
        )}
      </div>
    </div>
  );
}
