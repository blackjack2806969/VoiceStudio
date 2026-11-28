import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AudioLinesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch, describeError } from "@/lib/api/client";
import { importPitchAudio } from "./lexical-pitch";

type PitchSource = { audioPath: string; audio?: never } | { audio: Blob; audioPath?: never };

export function EditPitchButton({
  audioPath,
  audio,
  compact = false,
}: PitchSource & { compact?: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const request = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => request.current?.abort(), []);

  const open = async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(45_000)]);
    try {
      const wav =
        audio ??
        (await (await apiFetch("/audio/" + encodeURIComponent(audioPath), { signal })).blob());
      const project = await importPitchAudio(wav, "take.wav", signal);
      if (!signal.aborted) await navigate({ to: "/tools", search: { pitch: project.id } });
    } catch (error) {
      if (!controller.signal.aborted) toast.error(describeError(error));
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      size={compact ? "xs" : "sm"}
      disabled={busy}
      aria-busy={busy}
      onClick={() => void open()}
    >
      <AudioLinesIcon />
      {t(busy ? "common.loading" : "tone.edit_pitch")}
    </Button>
  );
}
