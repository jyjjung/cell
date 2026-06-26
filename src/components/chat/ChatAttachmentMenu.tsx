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
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useWorshipSetlists } from "@/hooks/useWorshipSetlists";
import { useWorshipRosters } from "@/hooks/useWorshipRosters";
import { useWorshipSongs } from "@/hooks/useWorshipSongs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { ChatPoll } from "@/types";

export type AttachmentPick =
  | { type: "photo" }
  | { type: "setlist"; id: string; label: string }
  | { type: "roster"; id: string; label: string }
  | { type: "song"; id: string; label: string; metadata: Record<string, unknown> }
  | { type: "poll"; poll: ChatPoll };

type MenuView = "grid" | "setlist" | "roster" | "song" | "song-keys" | "poll";

const GRID_ITEMS = [
  { id: "photo" as const, label: "Photo", icon: ImageIcon },
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

  const needsSetlists = view === "setlist";
  const needsRosters = view === "roster";
  const needsSongs = view === "song" || view === "song-keys";

  const { setlists } = useWorshipSetlists(needsSetlists);
  const { rosters } = useWorshipRosters(needsRosters);
  const { songs } = useWorshipSongs(needsSongs);

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
    return [];
  }, [view, search, setlists, rosters, songs]);

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
    setView(id);
  };

  const canPostPoll =
    pollQuestion.trim().length > 0 &&
    pollOptions.filter((o) => o.trim()).length >= 2;

  const postPoll = () => {
    const options = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || options.length < 2) return;
    onPick({ type: "poll", poll: { question: pollQuestion.trim(), options, allowMultiple: pollAllowMultiple } });
    onClose();
  };

  const title =
    view === "grid"
      ? null
      : view === "poll"
        ? "New poll"
        : view === "song-keys"
          ? "Pick key"
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
          <button
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
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="flex-1 text-base font-medium text-foreground">{title}</p>
        </div>
      )}

      {view === "grid" && (
        <div className="divide-y divide-border py-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleGridPick(item.id)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 active:bg-muted"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </div>
                <span className="text-base text-foreground">{item.label}</span>
              </button>
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
                  <button
                    type="button"
                    onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== index))}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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
                  map.get(sheet.key)!.push(sheet.imageUrl);
                  return map;
                }, new Map<string, string[]>()).entries(),
              ).map(([key, urls]) => (
                <button
                  key={key}
                  type="button"
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
                  className="flex h-11 items-center justify-center rounded-lg border border-border bg-muted/40 text-base font-medium transition-colors hover:bg-muted"
                >
                  {key}
                </button>
              ))
            ) : (
              <p className="col-span-4 py-6 text-center text-base text-muted-foreground">No chord sheets uploaded</p>
            )}
          </div>
        </div>
      )}

      {(view === "setlist" || view === "roster" || view === "song") && (
        <div className="flex flex-col">
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
            {listItems.length === 0 ? (
              <p className="py-8 text-center text-base text-muted-foreground">No results</p>
            ) : (
              listItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (view === "song") {
                      setSelectedSongId(item.id);
                      setView("song-keys");
                      return;
                    }
                    onPick({
                      type: view,
                      id: item.id,
                      label: item.title,
                    });
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 border-b border-border/50 px-3 py-2.5 text-left last:border-b-0 transition-colors hover:bg-muted/60"
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
                      <Music2 className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium">{item.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{item.meta}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
