"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  ChevronRight,
  Download,
  Eye,
  File,
  FileArchive,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, PageHeader, PageShell } from "@/components/ui/page-layout";
import { ListLoadingSkeleton } from "@/components/ui/loading-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
        description="Browse shared resources. Admins can upload and organize the library."
        action={isAdmin ? (
          <div className="flex flex-wrap justify-end gap-2">
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
            <Button type="button" variant="outline" onClick={() => setNameDialog({ entry: null, value: "" })}>
              <Plus className="mr-2 h-4 w-4" /> New folder
            </Button>
            <Button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <ButtonSpinner className="mr-2" /> : <Upload className="mr-2 h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload files"}
            </Button>
          </div>
        ) : undefined}
      />

      <nav aria-label="Files breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Button type="button" variant="ghost" className="h-8 px-2 font-medium" onClick={() => setCurrentFolderId(null)}>
          Files
        </Button>
        {breadcrumbs.map((folder) => (
          <span key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => setCurrentFolderId(folder.id)}>
              {folder.name}
            </Button>
          </span>
        ))}
      </nav>

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
        <div className="admin-table-wrap">
          <Table className="admin-table">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleEntries.map((entry) => {
                const isFolder = entry.kind === "folder";
                const Icon = isFolder ? Folder : getFileIcon(entry.contentType);
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="min-w-[240px]">
                      <button
                        type="button"
                        className="flex min-h-10 min-w-0 items-center gap-2.5 text-left font-medium hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
                        onClick={() => isFolder ? setCurrentFolderId(entry.id) : setPreviewEntry(entry)}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate" title={entry.name}>{entry.name}</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{isFolder ? "Folder" : entry.contentType}</TableCell>
                    <TableCell className="text-muted-foreground">{isFolder ? "--" : formatBytes(entry.size)}</TableCell>
                    <TableCell className="text-muted-foreground">{safeDate(entry.uploadedAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {!isFolder ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Preview ${entry.name}`}
                              onClick={() => setPreviewEntry(entry)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button asChild variant="ghost" size="icon" aria-label={`Download ${entry.name}`}>
                              <a href={entry.downloadUrl} target="_blank" rel="noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </>
                        ) : null}
                        {isAdmin ? (
                          <>
                            <Button type="button" variant="ghost" size="icon" aria-label={`Rename ${entry.name}`} onClick={() => openRename(entry)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${entry.name}`}
                              onClick={() => setDeleteTarget(entry)}
                              disabled={deleting === entry.id}
                            >
                              {deleting === entry.id ? <ButtonSpinner /> : <Trash2 className="h-4 w-4 text-destructive" />}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
        <DialogContent showCloseButton={false} className="flex h-[min(90vh,900px)] w-[min(96vw,1100px)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl p-0">
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="min-w-0">
              <DialogTitle className="truncate">{previewEntry?.name}</DialogTitle>
              <DialogDescription className="truncate">
                {previewEntry?.contentType} · {previewEntry ? formatBytes(previewEntry.size) : ""}
              </DialogDescription>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Close preview" onClick={() => setPreviewEntry(null)}>
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto bg-muted/30 p-4">
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
                className="h-full min-h-[60vh] w-full rounded-lg border border-border bg-background"
              />
            ) : null}
            {previewEntry && previewKind === "text" ? (
              <iframe
                src={previewEntry.downloadUrl}
                title={`Preview of ${previewEntry.name}`}
                className="h-full min-h-[60vh] w-full rounded-lg border border-border bg-background"
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
