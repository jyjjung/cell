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
  Share2,
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
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { deleteObject, getBlob, getDownloadURL, ref, updateMetadata, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { getClientAuthHeaders } from "@/lib/client-auth-headers";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useRoles } from "@/hooks/use-roles";

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
  directRoleIds?: string[];
  allowedRoleIds?: string[];
  visibilityType?: "public" | "roles";
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
  const { roles } = useRoles();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null);
  const [nameDialog, setNameDialog] = useState<{ entry: FileEntry | null; value: string; roleIds: string[] } | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<FileEntry | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingPdfOpen, setPendingPdfOpen] = useState<{ entry: FileEntry; url: string } | null>(null);
  const [accessDialog, setAccessDialog] = useState<{ entry: FileEntry; roleIds: string[] } | null>(null);
  const [savingAccess, setSavingAccess] = useState(false);
  const cellRoles = useMemo(
    () => roles.filter((role) => role.status !== "archived" && role.appScope !== "ndcpc"),
    [roles],
  );
  const cellRoleIds = useMemo(
    () => new Set(cellRoles.map((role) => role.id)),
    [cellRoles],
  );

  useEffect(() => {
    if (!currentUser?.uid) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const queries = isAdmin
      ? [query(collection(db, FILES_COLLECTION), orderBy("uploadedAt", "desc"))]
      : [
          query(collection(db, FILES_COLLECTION), where("visibilityType", "==", "public"), orderBy("uploadedAt", "desc")),
          ...(currentUser.roleIds ?? []).filter((roleId) => cellRoleIds.has(roleId)).map((roleId) =>
            query(collection(db, FILES_COLLECTION), where("visibilityType", "==", "roles"), where("allowedRoleIds", "array-contains", roleId), orderBy("uploadedAt", "desc")),
          ),
        ];
    const snapshots = new Map<string, FileEntry>();
    const unsubscribes = queries.map((filesQuery) => onSnapshot(
      filesQuery,
      (snapshot) => {
        snapshot.docs.forEach((item) => snapshots.set(item.id, { id: item.id, ...item.data() } as FileEntry));
        setEntries(Array.from(snapshots.values()));
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load shared files:", error);
        setLoading(false);
        toast({ variant: "destructive", title: "Could not load files", description: error.message });
      },
    ));
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [cellRoleIds, currentUser?.uid, currentUser?.roleIds, isAdmin, toast]);

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
      const parent = currentFolderId ? entries.find((entry) => entry.id === currentFolderId) : null;
      const allowedRoleIds = parent?.allowedRoleIds ?? parent?.directRoleIds ?? [];
      for (const file of selectedFiles) {
        const fileRef = doc(collection(db, FILES_COLLECTION));
        const fileId = fileRef.id;
        const storagePath = `${STORAGE_PREFIX}/${fileId}-${file.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file, {
          contentType: file.type || "application/octet-stream",
          cacheControl: "public,max-age=31536000,immutable",
          customMetadata: { fileId },
        });
        const downloadUrl = await getDownloadURL(storageRef);
        try {
          await setDoc(fileRef, {
            kind: "file",
            name: file.name,
            parentId: currentFolderId,
            contentType: file.type || "application/octet-stream",
            size: file.size,
            storagePath,
            downloadUrl,
            uploadedBy: currentUser.uid,
            uploadedAt: serverTimestamp(),
            directRoleIds: [],
            allowedRoleIds,
            visibilityType: allowedRoleIds.length ? "roles" : "public",
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
          directRoleIds: nameDialog.roleIds,
          allowedRoleIds: currentFolderId
            ? (entries.find((entry) => entry.id === currentFolderId)?.allowedRoleIds ?? nameDialog.roleIds)
            : nameDialog.roleIds,
          visibilityType: (currentFolderId
            ? (entries.find((entry) => entry.id === currentFolderId)?.allowedRoleIds ?? nameDialog.roleIds)
            : nameDialog.roleIds).length ? "roles" : "public",
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

  const updateAccess = async () => {
    if (!accessDialog || !isAdmin) return;
    setSavingAccess(true);
    try {
      const directRoleIds = accessDialog.roleIds;
      const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
      const inheritedFromParents: string[] = [];
      let parentId = entriesById.get(accessDialog.entry.id)?.parentId ?? null;
      while (parentId) {
        const parent = entriesById.get(parentId);
        if (!parent) break;
        if ((parent.allowedRoleIds ?? []).length) {
          inheritedFromParents.push(...(parent.allowedRoleIds ?? []));
        }
        parentId = parent.parentId ?? null;
      }
      const updates = new Map<string, { directRoleIds: string[]; allowedRoleIds: string[]; visibilityType: "public" | "roles" }>();
      const rootAllowed = inheritedFromParents.length ? [...new Set(inheritedFromParents)] : [...new Set(directRoleIds)];
      updates.set(accessDialog.entry.id, {
        directRoleIds,
        allowedRoleIds: rootAllowed,
        visibilityType: rootAllowed.length ? "roles" : "public",
      });
      const visit = (parentId: string, inherited: string[]) => {
        entries.filter((entry) => entry.parentId === parentId).forEach((entry) => {
          const rolesForEntry = inherited.length ? inherited : [...new Set(entry.directRoleIds ?? [])];
          updates.set(entry.id, {
            directRoleIds: entry.directRoleIds ?? [],
            allowedRoleIds: rolesForEntry,
            visibilityType: rolesForEntry.length ? "roles" : "public",
          });
          if (entry.kind === "folder") visit(entry.id, rolesForEntry);
        });
      };
      if (accessDialog.entry.kind === "folder") visit(accessDialog.entry.id, rootAllowed);
      const batch = writeBatch(db);
      updates.forEach((values, id) => batch.update(doc(db, FILES_COLLECTION, id), values));
      await batch.commit();
      await Promise.all(
        Array.from(updates.keys())
          .map((id) => entriesById.get(id))
          .filter((entry): entry is FileEntry => Boolean(entry?.storagePath))
          .map((entry) => updateMetadata(ref(storage, entry.storagePath), {
            customMetadata: { fileId: entry.id },
          })),
      );
      toast({ title: "Access updated" });
      setAccessDialog(null);
    } catch (error) {
      console.error("Failed to update shared file access:", error);
      toast({ variant: "destructive", title: "Could not update access", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setSavingAccess(false);
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

  const openRename = (entry: FileEntry) => setNameDialog({ entry, value: entry.name, roleIds: entry.directRoleIds ?? [] });

  const openPreview = async (entry: FileEntry) => {
    if (entry.kind === "folder") {
      setCurrentFolderId(entry.id);
      return;
    }
    try {
      if (entry.contentType === "application/pdf") {
        const downloadUrl = await getDownloadURL(ref(storage, entry.storagePath));
        setPendingPdfOpen({ entry, url: downloadUrl });
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const blob = await getBlob(ref(storage, entry.storagePath));
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewEntry(entry);
    } catch (error) {
      console.error("Failed to open shared file:", error);
      toast({ variant: "destructive", title: "Could not open file", description: error instanceof Error ? error.message : "Please try again." });
    }
  };

  const closePreview = () => {
    setPreviewEntry(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const downloadEntry = async (entry: FileEntry) => {
    try {
      const blob = await getBlob(ref(storage, entry.storagePath));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = entry.name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download shared file:", error);
      toast({ variant: "destructive", title: "Could not download file", description: error instanceof Error ? error.message : "Please try again." });
    }
  };

  const shareEntry = async (entry: FileEntry) => {
    if (!currentUser || !isAdmin) return;
    try {
      const headers = await getClientAuthHeaders();
      const response = await fetch("/api/admin/files/share", {
        method: "POST",
        headers,
        body: JSON.stringify({ entryId: entry.id }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Could not create share link");
      await navigator.clipboard.writeText(result.url);
      toast({ title: "Public link copied", description: "Anyone with this link can access the shared resource." });
    } catch (error) {
      toast({ variant: "destructive", title: "Could not create link", description: error instanceof Error ? error.message : "Please try again." });
    }
  };

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
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setNameDialog({ entry: null, value: "", roleIds: [] })}>
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
          action={isAdmin ? <Button onClick={() => setNameDialog({ entry: null, value: "", roleIds: [] })}>New folder</Button> : undefined}
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
                    onClick={() => void openPreview(entry)}
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
                          <DropdownMenuItem onClick={() => void downloadEntry(entry)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                        ) : null}
                        {isAdmin ? (
                          <>
                            <DropdownMenuItem onClick={() => void shareEntry(entry)}>
                              <Share2 className="mr-2 h-4 w-4" />
                              Share public link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRename(entry)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAccessDialog({ entry, roleIds: entry.directRoleIds ?? [] })}>
                              Manage access
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
          {!nameDialog?.entry ? (
            <div className="space-y-2">
              <Label>em. roles</Label>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-2">
                {cellRoles.length === 0 ? (
                  <p className="px-2 py-1 text-sm text-muted-foreground">No active em. roles are available.</p>
                ) : cellRoles.map((role) => (
                  <label key={role.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-1 hover:bg-muted/40">
                    <Checkbox
                      checked={nameDialog?.roleIds.includes(role.id) ?? false}
                      onCheckedChange={(checked) => setNameDialog((current) => current ? {
                        ...current,
                        roleIds: checked
                          ? [...new Set([...current.roleIds, role.id])]
                          : current.roleIds.filter((roleId) => roleId !== role.id),
                      } : current)}
                    />
                    <span className="text-sm">{role.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Leave empty to make the folder visible to all approved members.</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNameDialog(null)}>Cancel</Button>
            <Button type="button" onClick={() => void saveName()} disabled={!nameDialog?.value.trim() || savingName}>
              {savingName ? <ButtonSpinner className="mr-2" /> : null}
              {nameDialog?.entry ? "Rename" : "Create folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!accessDialog} onOpenChange={(open) => !open && setAccessDialog(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Manage access</DialogTitle>
            <DialogDescription>
              Select any roles that should be able to access “{accessDialog?.entry.name}”. No selected roles means all approved members can access it.
              Folder changes apply to everything inside the folder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {cellRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active roles are available.</p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {cellRoles.map((role) => (
                <label key={role.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-1 hover:bg-muted/40">
                  <Checkbox
                    checked={accessDialog?.roleIds.includes(role.id)}
                    onCheckedChange={(checked) => setAccessDialog((current) => current ? {
                      ...current,
                      roleIds: checked
                        ? [...new Set([...current.roleIds, role.id])]
                        : current.roleIds.filter((roleId) => roleId !== role.id),
                    } : current)}
                  />
                  <span className="text-sm">{role.name}</span>
                </label>
              ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAccessDialog(null)}>Cancel</Button>
            <Button type="button" onClick={() => void updateAccess()} disabled={savingAccess}>
              {savingAccess ? <ButtonSpinner className="mr-2" /> : null}
              Save access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingPdfOpen} onOpenChange={(open) => !open && setPendingPdfOpen(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Open PDF in your browser?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingPdfOpen?.entry.name}” will open in a new browser tab for the best multi-page viewing experience.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingPdfOpen) {
                  window.open(`${pendingPdfOpen.url}#toolbar=1&navpanes=0`, "_blank", "noopener,noreferrer");
                }
                setPendingPdfOpen(null);
              }}
            >
              Open in browser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!previewEntry} onOpenChange={(open) => !open && closePreview()}>
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
                <Button type="button" variant="outline" size="sm" onClick={() => void downloadEntry(previewEntry)}>
                    <Download className="mr-1.5 h-4 w-4" />
                    <span className="sm:hidden">Save</span>
                    <span className="hidden sm:inline">Download</span>
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="icon" aria-label="Close preview" onClick={closePreview}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overscroll-contain overflow-auto bg-muted/30 p-2 sm:p-4">
            {previewEntry && previewKind === "image" ? (
              <div className="flex min-h-full items-center justify-center">
                <img
                  src={previewUrl ?? undefined}
                  alt={previewEntry.name}
                  className="max-h-full max-w-full rounded-lg object-contain shadow-sm"
                />
              </div>
            ) : null}
            {previewEntry && previewKind === "text" ? (
              <iframe
                src={previewUrl ?? undefined}
                title={`Preview of ${previewEntry.name}`}
                className="h-full min-h-0 w-full rounded-lg border border-border bg-background"
              />
            ) : null}
            {previewEntry && previewKind === "video" ? (
              <div className="flex min-h-full items-center justify-center">
                <video src={previewUrl ?? undefined} controls className="max-h-full max-w-full rounded-lg" />
              </div>
            ) : null}
            {previewEntry && previewKind === "audio" ? (
              <div className="flex min-h-full items-center justify-center">
                <audio src={previewUrl ?? undefined} controls className="w-full max-w-xl" />
              </div>
            ) : null}
            {previewEntry && previewKind === "unsupported" ? (
              <div className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
                <File className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  This file type does not have an in-app preview yet.
                </p>
                <Button type="button" onClick={() => void downloadEntry(previewEntry)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download file
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
