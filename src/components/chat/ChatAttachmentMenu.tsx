"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ImageIcon,
  ListMusic,
  ClipboardList,
  Music2,
  BarChart3,
  ChevronLeft,
  Search,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useWorshipSetlists } from "@/hooks/useWorshipSetlists";
import { useWorshipRosters } from "@/hooks/useWorshipRosters";
import { useWorshipSongs } from "@/hooks/useWorshipSongs";
import { useDocs } from "@/hooks/use-docs";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { displayDocTitle, stripHtmlPreview } from "@/lib/docs-utils";
import { translations } from "@/lib/translations";
import type { ChatPoll } from "@/types";

export type AttachmentPick =
  | { type: "photo" }
  | { type: "setlist"; id: string; label: string }
  | { type: "roster"; id: string; label: string }
  | { type: "song"; id: string; label: string; metadata: Record<string, unknown> }
  | { type: "poll"; poll: ChatPoll }
  | { type: "doc"; id: string; label: string }
  | { type: "new-doc" };

type MenuView = "grid" | "setlist" | "roster" | "song" | "song-keys" | "poll" | "doc";

const GRID_ITEMS = [
  { id: "photo" as const, label: "Photo", icon: ImageIcon },
  { id: "document" as const, label: "Document", icon: FileText },
  { id: "setlist" as const, label: "Setlist", icon: ListMusic },
  { id: "roster" as const, label: "Roster", icon: ClipboardList },
  { id: "song" as const, label: "Song", icon: Music2 },
  { id: "poll" as const, label: "Poll", icon: BarChart3 },
];

const MENU_INPUT_CLASS = "text-base";

type ChatAttachmentMenuProps = {
  onPick: (pick: AttachmentPick) => void;
  onClose: () => void;
  photoOnly?: boolean;
};

export default function ChatAttachmentMenu({ onPick, onClose, photoOnly = false }: ChatAttachmentMenuProps) {
  const [view, setView] = useState<MenuView>("grid");
  const [search, setSearch] = useState("");
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);

  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollResultsLocked, setPollResultsLocked] = useState(false);

  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || "en"];

  const needsSetlists = view === "setlist";
  const needsRosters = view === "roster";
  const needsSongs = view === "song" || view === "song-keys";
  const needsDocs = view === "doc";

  const { setlists } = useWorshipSetlists(needsSetlists);
  const { rosters } = useWorshipRosters(needsRosters);
  const { songs, loading: songsLoading } = useWorshipSongs(needsSongs);
  const { docs, loading: docsLoading } = useDocs(needsDocs ? currentUser?.uid : undefined);

  const selectedSong = useMemo(
    () => (selectedSongId ? songs.find((s) => s.id === selectedSongId) ?? null : null),
    [songs, selectedSongId],
  );

  useEffect(() => {
    setSearch("");
  }, [view]);

  const listItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (view === "setlist") {
      return setlists
        .filter((s) => s.name.toLowerCase().includes(q))
        .map((s) => ({
          id: s.id,
          title: s.name,
          meta: `${s.songs?.length || 0} songs`,
          date: s.date,
        }));
    }
    if (view === "roster") {
      return rosters
        .filter((r) => r.name.toLowerCase().includes(q))
        .map((r) => ({
          id: r.id,
          title: r.name,
          meta: `${r.slots?.length || 0} roles`,
          date: r.date,
        }));
    }
    if (view === "song") {
      return songs
        .filter((s) => s.title.toLowerCase().includes(q) || s.artist?.toLowerCase().includes(q))
        .map((s) => ({
          id: s.id,
          title: s.title,
          meta: s.artist || "Song",
          date: null as string | null,
        }));
    }
    if (view === "doc") {
      return docs
        .filter((d) => {
          const title = displayDocTitle(d.title, t.untitledDocument).toLowerCase();
          return !q || title.includes(q) || stripHtmlPreview(d.content, 80).toLowerCase().includes(q);
        })
        .map((d) => ({
          id: d.id,
          title: displayDocTitle(d.title, t.untitledDocument),
          meta: stripHtmlPreview(d.content, 60) || (d.visibility === "shared" ? t.sharedDocument : t.personalDocument),
          date: null as string | null,
        }));
    }
    return [];
  }, [view, search, setlists, rosters, songs, docs, t.untitledDocument, t.sharedDocument, t.personalDocument]);

  const handleGridPick = (id: (typeof GRID_ITEMS)[number]["id"]) => {
    if (id === "photo") {
      onPick({ type: "photo" });
      onClose();
      return;
    }
    if (id === "poll") {
      setView("poll");
      return;
    }
    if (id === "document") {
      setView("doc");
      return;
    }
    setView(id);
  };

  const canPostPoll =
    pollQuestion.trim().length > 0 &&
    pollOptions.filter((o) => o.trim()).length >= 2;

  const postPoll = () => {
    const options = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || options.length < 2) return;
    onPick({
      type: "poll",
      poll: {
        question: pollQuestion.trim(),
        options,
        allowMultiple: pollAllowMultiple,
        ...(pollResultsLocked ? { resultsLocked: true } : {}),
      },
    });
    onClose();
  };

  const title =
    view === "grid"
      ? null
      : view === "poll"
        ? "New poll"
        : view === "song-keys"
          ? "Pick key"
          : view === "doc"
            ? t.docs
            : GRID_ITEMS.find((g) => g.id === view)?.label ?? "Choose";

  const visibleItems = GRID_ITEMS.filter((item) => !photoOnly || item.id === "photo");

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "absolute bottom-full left-0 z-[100] mb-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg",
        view === "grid" ? "w-[200px]" : "w-[min(300px,calc(100vw-2rem))]",
      )}
    >
      {view !== "grid" && (
        <div className="flex items-center gap-1 border-b border-border px-2 py-2">
          <IconButton
            type="button"
            onClick={() => {
              if (view === "song-keys") {
                setSelectedSongId(null);
                setView("song");
              } else {
                setView("grid");
                setSelectedSongId(null);
              }
            }}
            className="rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Back"
            icon={ChevronLeft}
          />
          <p className="flex-1 text-base font-medium text-foreground">{title}</p>
        </div>
      )}

      {view === "grid" && (
        <div className="divide-y divide-border py-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                onClick={() => handleGridPick(item.id)}
                className="h-auto w-full justify-start gap-3 rounded-none px-3 py-2.5 text-left hover:bg-muted/60 active:bg-muted"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </div>
                <span className="text-base text-foreground">{item.label}</span>
              </Button>
            );
          })}
        </div>
      )}

      {view === "poll" && (
        <div className="space-y-3 p-3">
          <Input
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="Ask a question…"
            className={MENU_INPUT_CLASS}
          />
          <div className="space-y-2">
            {pollOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => {
                    const next = [...pollOptions];
                    next[index] = e.target.value;
                    setPollOptions(next);
                  }}
                  placeholder={`Option ${index + 1}`}
                  className={MENU_INPUT_CLASS}
                />
                {pollOptions.length > 2 && (
                  <IconButton
                    type="button"
                    size="compact"
                    onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== index))}
                    className="shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove option"
                    icon={Trash2}
                  />
                )}
              </div>
            ))}
          </div>
          {pollOptions.length < 6 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 rounded-lg gap-1.5 text-base"
              onClick={() => setPollOptions([...pollOptions, ""])}
            >
              <Plus className="h-4 w-4" />
              Add option
            </Button>
          )}
          <label className="flex cursor-pointer items-center gap-2.5 px-0.5 py-1">
            <Checkbox
              checked={pollAllowMultiple}
              onCheckedChange={(checked) => setPollAllowMultiple(checked === true)}
              className="h-5 w-5"
            />
            <span className="text-base text-foreground">Allow multiple selections</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 px-0.5 py-1">
            <Checkbox
              checked={pollResultsLocked}
              onCheckedChange={(checked) => setPollResultsLocked(checked === true)}
              className="h-5 w-5"
            />
            <span className="text-base text-foreground">Lock voting</span>
          </label>
          <Button
            type="button"
            className="h-10 w-full rounded-lg text-base"
            disabled={!canPostPoll}
            onClick={postPoll}
          >
            Create poll
          </Button>
        </div>
      )}

      {view === "song-keys" && selectedSong && (
        <div className="p-3">
          <p className="mb-3 truncate text-base text-muted-foreground">{selectedSong.title}</p>
          <div className="grid grid-cols-4 gap-2">
            {selectedSong.chordSheets.length > 0 ? (
              Array.from(
                selectedSong.chordSheets.reduce((map, sheet) => {
                  if (!map.has(sheet.key)) map.set(sheet.key, []);
                  if (sheet.imageUrl) map.get(sheet.key)!.push(sheet.imageUrl);
                  return map;
                }, new Map<string, string[]>()).entries(),
              ).map(([key, urls]) => (
                <Button
                  key={key}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    onPick({
                      type: "song",
                      id: selectedSong.id,
                      label: `${selectedSong.title} (${key})`,
                      metadata: {
                        imageUrl: urls[0],
                        imageUrls: urls,
                        sheetKey: key,
                        songTitle: selectedSong.title,
                        artist: selectedSong.artist,
                      },
                    });
                    onClose();
                  }}
                  className="flex h-11 items-center justify-center rounded-lg border border-border bg-muted/40 text-base font-medium hover:bg-muted"
                >
                  {key}
                </Button>
              ))
            ) : (
              <p className="col-span-4 py-6 text-center text-base text-muted-foreground">No chord sheets uploaded</p>
            )}
          </div>
        </div>
      )}

      {(view === "setlist" || view === "roster" || view === "song" || view === "doc") && (
        <div className="flex flex-col">
          {view === "doc" && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onPick({ type: "new-doc" });
                onClose();
              }}
              className="h-auto w-full justify-start gap-3 rounded-none border-b border-border px-3 py-2.5 text-left hover:bg-muted/60"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Plus className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium">{t.newDocument}</p>
                <p className="truncate text-sm text-muted-foreground">{t.newDocumentInChatHint}</p>
              </div>
            </Button>
          )}
          <div className="border-b border-border px-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className={cn("pl-9", MENU_INPUT_CLASS)}
              />
            </div>
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            {(view === "song" && songsLoading) || (view === "doc" && docsLoading) ? (
              <p className="py-8 text-center text-base text-muted-foreground">Loading…</p>
            ) : listItems.length === 0 ? (
              <p className="py-8 text-center text-base text-muted-foreground">No results</p>
            ) : (
              listItems.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (view === "song") {
                      setSelectedSongId(item.id);
                      setView("song-keys");
                      return;
                    }
                    if (view === "doc") {
                      onPick({ type: "doc", id: item.id, label: item.title });
                      onClose();
                      return;
                    }
                    onPick({
                      type: view,
                      id: item.id,
                      label: item.title,
                    });
                    onClose();
                  }}
                  className="h-auto w-full justify-start gap-3 rounded-none border-b border-border/50 px-3 py-2.5 text-left last:border-b-0 hover:bg-muted/60"
                >
                  {item.date ? (
                    <div className="flex w-10 shrink-0 flex-col items-center leading-none">
                      <span className="text-xs font-medium text-muted-foreground">
                        {format(new Date(item.date), "MMM")}
                      </span>
                      <span className="text-base font-semibold tabular-nums">{format(new Date(item.date), "d")}</span>
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                      {view === "doc" ? <FileText className="h-4 w-4" /> : <Music2 className="h-4 w-4" />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium">{item.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{item.meta}</p>
                  </div>
                </Button>
              ))
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
