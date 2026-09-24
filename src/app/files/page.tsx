"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  ChevronRight,
  Download,
  File,
  FileArchive,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  X,
  Trash2,
  Upload,
} from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ButtonSpinner } from "@/components/ui/loading-spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, PageHeader, PageShell } from "@/components/ui/page-layout";
import { ListLoadingSkeleton } from "@/components/ui/loading-state";

const FILES_COLLECTION = "adminFiles";
const STORAGE_PREFIX = "admin-files";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

type FileEntry = {
  id: string;
  kind?: "file" | "folder";
  name: string;
  parentId?: string | null;
  contentType: string;
  size: number;
  storagePath: string;
  downloadUrl: string;
  uploadedAt?: { toDate?: () => Date } | null;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return FileImage;
  if (contentType === "application/pdf" || contentType.startsWith("text/")) return FileText;
  if (contentType.includes("zip") || contentType.includes("compressed")) return FileArchive;
  return File;
}

function safeDate(value: FileEntry["uploadedAt"]) {
  if (!value?.toDate) return "Recently";
  return format(value.toDate(), "MMM d, yyyy");
}

export default function FilesPage() {
  const { currentUser, isAdmin } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null);
  const [nameDialog, setNameDialog] = useState<{ entry: FileEntry | null; value: string } | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<FileEntry | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const filesQuery = query(collection(db, FILES_COLLECTION), orderBy("uploadedAt", "desc"));
    return onSnapshot(
      filesQuery,
      (snapshot) => {
        setEntries(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as FileEntry)));
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load shared files:", error);
        setLoading(false);
        toast({ variant: "destructive", title: "Could not load files", description: error.message });
      },
    );
  }, [currentUser?.uid, toast]);

  const folders = useMemo(
    () => entries.filter((entry) => entry.kind === "folder"),
    [entries],
  );
  const visibleEntries = useMemo(
    () =>
      entries
        .filter((entry) => (entry.parentId ?? null) === currentFolderId)
        .sort((a, b) => {
          const folderOrder = Number(b.kind === "folder") - Number(a.kind === "folder");
          return folderOrder || a.name.localeCompare(b.name);
        }),
    [entries, currentFolderId],
  );
  const breadcrumbs = useMemo(() => {
    const result: FileEntry[] = [];
    let folder = folders.find((entry) => entry.id === currentFolderId);
    while (folder) {
      result.unshift(folder);
      folder = folders.find((entry) => entry.id === folder?.parentId);
    }
    return result;
  }, [currentFolderId, folders]);

  const handleUpload = async (selectedFiles: File[]) => {
    if (!currentUser || !isAdmin || selectedFiles.length === 0) return;
    const oversized = selectedFiles.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) {
      toast({
        variant: "destructive",
        title: "File is too large",
        description: `${oversized.name} exceeds the 50 MB limit.`,
      });
      return;
    }

    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const fileId = crypto.randomUUID();
        const storagePath = `${STORAGE_PREFIX}/${fileId}-${file.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file, {
          contentType: file.type || "application/octet-stream",
          cacheControl: "public,max-age=31536000,immutable",
        });
        const downloadUrl = await getDownloadURL(storageRef);
        try {
          await addDoc(collection(db, FILES_COLLECTION), {
            kind: "file",
            name: file.name,
            parentId: currentFolderId,
            contentType: file.type || "application/octet-stream",
            size: file.size,
            storagePath,
            downloadUrl,
            uploadedBy: currentUser.uid,
            uploadedAt: serverTimestamp(),
          });
        } catch (error) {
          await deleteObject(storageRef).catch((cleanupError) => {
            console.error("Failed to clean up orphaned shared file:", cleanupError);
          });
          throw error;
        }
      }
      toast({ title: selectedFiles.length === 1 ? "File uploaded" : `${selectedFiles.length} files uploaded` });
      if (inputRef.current) inputRef.current.value = "";
    } catch (error) {
      console.error("Failed to upload shared files:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const saveName = async () => {
    if (!nameDialog?.value.trim() || !isAdmin) return;
    setSavingName(true);
    try {
      if (nameDialog.entry) {
        await updateDoc(doc(db, FILES_COLLECTION, nameDialog.entry.id), {
          name: nameDialog.value.trim(),
        });
        toast({ title: "Renamed" });
      } else {
        await addDoc(collection(db, FILES_COLLECTION), {
          kind: "folder",
          name: nameDialog.value.trim(),
          parentId: currentFolderId,
          contentType: "inode/directory",
          size: 0,
          storagePath: "",
          downloadUrl: "",
          uploadedBy: currentUser?.uid,
          uploadedAt: serverTimestamp(),
        });
        toast({ title: "Folder created" });
      }
      setNameDialog(null);
    } catch (error) {
      console.error("Failed to save shared file name:", error);
      toast({
        variant: "destructive",
        title: "Could not save name",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !isAdmin) return;
    if (deleteTarget.kind === "folder" && entries.some((entry) => entry.parentId === deleteTarget.id)) {
      toast({ variant: "destructive", title: "Folder is not empty", description: "Move or delete its contents first." });
      setDeleteTarget(null);
      return;
    }

    setDeleting(deleteTarget.id);
    try {
      if (deleteTarget.kind !== "folder" && deleteTarget.storagePath) {
        await deleteObject(ref(storage, deleteTarget.storagePath));
      }
      await deleteDoc(doc(db, FILES_COLLECTION, deleteTarget.id));
      toast({ title: deleteTarget.kind === "folder" ? "Folder deleted" : "File deleted" });
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete shared file:", error);
      toast({
        variant: "destructive",
        title: "Could not delete",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setDeleting(null);
    }
  };

  const openRename = (entry: FileEntry) => setNameDialog({ entry, value: entry.name });

  const previewKind = previewEntry
    ? previewEntry.contentType.startsWith("image/")
      ? "image"
      : previewEntry.contentType === "application/pdf"
        ? "pdf"
        : previewEntry.contentType.startsWith("video/")
          ? "video"
          : previewEntry.contentType.startsWith("audio/")
            ? "audio"
            : previewEntry.contentType.startsWith("text/") || previewEntry.contentType === "application/json"
              ? "text"
              : "unsupported"
    : null;

  return (
    <PageShell>
      <PageHeader
        title="Files"
        description="Shared resources"
        action={isAdmin ? (
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                const selectedFiles = Array.from(event.target.files ?? []);
                if (selectedFiles.length) void handleUpload(selectedFiles);
              }}
            />
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setNameDialog({ entry: null, value: "" })}>
              <Plus className="mr-2 h-4 w-4" /> New folder
            </Button>
            <Button type="button" className="w-full sm:w-auto" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <ButtonSpinner className="mr-2" /> : <Upload className="mr-2 h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload files"}
            </Button>
          </div>
        ) : undefined}
      />

      <div className="flex min-w-0 items-center justify-between gap-3">
        <nav aria-label="Files breadcrumb" className="flex min-w-0 max-w-full items-center gap-1 overflow-x-auto overscroll-x-contain text-sm text-muted-foreground [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Button type="button" variant="ghost" className="h-9 shrink-0 rounded-lg px-2 font-medium" onClick={() => setCurrentFolderId(null)}>
            Files
          </Button>
        {breadcrumbs.map((folder) => (
          <span key={folder.id} className="flex shrink-0 items-center gap-1">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <Button type="button" variant="ghost" className="h-9 max-w-[13rem] truncate rounded-lg px-2" onClick={() => setCurrentFolderId(folder.id)}>
              {folder.name}
            </Button>
          </span>
        ))}
        </nav>
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {visibleEntries.length} {visibleEntries.length === 1 ? "item" : "items"}
        </span>
      </div>

      {loading ? (
        <ListLoadingSkeleton />
      ) : visibleEntries.length === 0 ? (
        <EmptyState
          icon={currentFolderId ? FolderOpen : File}
          title={currentFolderId ? "This folder is empty" : "No files yet"}
          description={isAdmin ? "Add a folder or upload a shared resource here." : "Shared resources will appear here when available."}
          action={isAdmin ? <Button onClick={() => setNameDialog({ entry: null, value: "" })}>New folder</Button> : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <div className="divide-y divide-border/60">
            {visibleEntries.map((entry) => {
              const isFolder = entry.kind === "folder";
              const Icon = isFolder ? Folder : getFileIcon(entry.contentType);
              return (
                <div key={entry.id} className="group flex min-w-0 items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/30 sm:px-4">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    onClick={() => isFolder ? setCurrentFolderId(entry.id) : setPreviewEntry(entry)}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block max-w-full truncate text-sm font-medium leading-snug" title={entry.name}>{entry.name}</span>
                      <span className="mt-1 block break-words text-xs leading-snug text-muted-foreground">
                        {isFolder ? "Folder" : `${entry.contentType} · ${formatBytes(entry.size)}`} · {safeDate(entry.uploadedAt)}
                      </span>
                    </span>
                    {isFolder ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" aria-label={`More actions for ${entry.name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl p-1">
                        {!isFolder ? (
                          <DropdownMenuItem asChild>
                            <a href={entry.downloadUrl} target="_blank" rel="noreferrer">
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </a>
                          </DropdownMenuItem>
                        ) : null}
                        {isAdmin ? (
                          <>
                            <DropdownMenuItem onClick={() => openRename(entry)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteTarget(entry)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={!!nameDialog} onOpenChange={(open) => !open && setNameDialog(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{nameDialog?.entry ? "Rename" : "New folder"}</DialogTitle>
            <DialogDescription>
              {nameDialog?.entry ? "Choose a new name for this item." : "Create a folder for shared resources."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="file-entry-name">Name</Label>
            <Input
              id="file-entry-name"
              value={nameDialog?.value ?? ""}
              onChange={(event) => setNameDialog((current) => current ? { ...current, value: event.target.value } : current)}
              onKeyDown={(event) => event.key === "Enter" && void saveName()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNameDialog(null)}>Cancel</Button>
            <Button type="button" onClick={() => void saveName()} disabled={!nameDialog?.value.trim() || savingName}>
              {savingName ? <ButtonSpinner className="mr-2" /> : null}
              {nameDialog?.entry ? "Rename" : "Create folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewEntry} onOpenChange={(open) => !open && setPreviewEntry(null)}>
        <DialogContent showCloseButton={false} className="flex h-[min(90dvh,900px)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:w-[min(96vw,1100px)]">
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
            <div className="min-w-0">
              <DialogTitle className="truncate">{previewEntry?.name}</DialogTitle>
              <DialogDescription className="truncate">
                {previewEntry?.contentType} · {previewEntry ? formatBytes(previewEntry.size) : ""}
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {previewEntry ? (
                <Button asChild variant="outline" size="sm">
                  <a href={previewEntry.downloadUrl} target="_blank" rel="noreferrer">
                    <Download className="mr-1.5 h-4 w-4" />
                    <span className="sm:hidden">Save</span>
                    <span className="hidden sm:inline">Download</span>
                  </a>
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="icon" aria-label="Close preview" onClick={() => setPreviewEntry(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overscroll-contain overflow-auto bg-muted/30 p-2 sm:p-4">
            {previewEntry && previewKind === "image" ? (
              <div className="flex min-h-full items-center justify-center">
                <img
                  src={previewEntry.downloadUrl}
                  alt={previewEntry.name}
                  className="max-h-full max-w-full rounded-lg object-contain shadow-sm"
                />
              </div>
            ) : null}
            {previewEntry && previewKind === "pdf" ? (
              <iframe
                src={previewEntry.downloadUrl}
                title={`Preview of ${previewEntry.name}`}
                className="h-full min-h-0 w-full rounded-lg border border-border bg-background"
              />
            ) : null}
            {previewEntry && previewKind === "text" ? (
              <iframe
                src={previewEntry.downloadUrl}
                title={`Preview of ${previewEntry.name}`}
                className="h-full min-h-0 w-full rounded-lg border border-border bg-background"
              />
            ) : null}
            {previewEntry && previewKind === "video" ? (
              <div className="flex min-h-full items-center justify-center">
                <video src={previewEntry.downloadUrl} controls className="max-h-full max-w-full rounded-lg" />
              </div>
            ) : null}
            {previewEntry && previewKind === "audio" ? (
              <div className="flex min-h-full items-center justify-center">
                <audio src={previewEntry.downloadUrl} controls className="w-full max-w-xl" />
              </div>
            ) : null}
            {previewEntry && previewKind === "unsupported" ? (
              <div className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
                <File className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  This file type does not have an in-app preview yet.
                </p>
                <Button asChild>
                  <a href={previewEntry.downloadUrl} target="_blank" rel="noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Download file
                  </a>
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {deleteTarget?.kind === "folder" ? "folder" : "file"}?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.name}&quot; will no longer be available in the shared library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} disabled={!!deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? <ButtonSpinner className="mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
