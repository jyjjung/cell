'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, File, Folder, Loader2 } from 'lucide-react';

type PublicEntry = { id: string; kind: 'file' | 'folder'; name: string; parentId: string | null; contentType?: string; size?: number };
type PublicResponse = { entry: { id: string; name: string; kind?: 'file' | 'folder'; contentType?: string; size?: number }; entries: PublicEntry[] };

export default function PublicFilesPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState('');
  const [data, setData] = useState<PublicResponse | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { void params.then(({ token: value }) => setToken(value)); }, [params]);
  useEffect(() => {
    if (!token) return;
    fetch(`/api/files/share/${encodeURIComponent(token)}?meta=1`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error || 'Link unavailable');
        return response.json() as Promise<PublicResponse>;
      })
      .then(setData)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Link unavailable'));
  }, [token]);
  const topLevel = useMemo(() => data?.entries.filter((entry) => entry.parentId === data.entry.id) ?? [], [data]);
  const renderEntries = (parentId: string) => data?.entries.filter((entry) => entry.parentId === parentId).map((entry) => (
    <div key={entry.id} className="border-t">
      {entry.kind === 'folder' ? (
        <details open className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 hover:bg-muted/40">
            <Folder className="h-5 w-5 text-primary" /><span className="truncate">{entry.name}</span>
          </summary>
          <div className="pl-5">{renderEntries(entry.id)}</div>
        </details>
      ) : (
        <a href={`/api/files/share/${encodeURIComponent(token)}?entryId=${encodeURIComponent(entry.id)}&download=1`} className="flex min-h-14 items-center gap-3 px-4 hover:bg-muted/40">
          <File className="h-5 w-5 text-muted-foreground" /><span className="min-w-0 flex-1 truncate">{entry.name}</span>
          <span className="text-xs text-muted-foreground">{formatSize(entry.size)}</span><Download className="h-4 w-4" />
        </a>
      )}
    </div>
  ));
  const formatSize = (size = 0) => size < 1024 ? `${size} B` : `${(size / 1024 / 1024).toFixed(1)} MB`;
  return (
    <main className="min-h-svh bg-background px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header><p className="text-sm text-muted-foreground">Public shared folder</p><h1 className="text-2xl font-semibold">{data?.entry.name ?? 'Shared files'}</h1></header>
        {!data && !error ? <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading shared folder" /> : null}
        {error ? <p role="alert" className="text-destructive">{error}</p> : null}
        {data ? data.entry.kind === 'file' ? (
          <a href={`/api/files/share/${encodeURIComponent(token)}?download=1`} className="flex min-h-14 items-center gap-3 rounded-xl border bg-card px-4 hover:bg-muted/40">
            <File className="h-5 w-5 text-muted-foreground" /><span className="min-w-0 flex-1 truncate">{data.entry.name}</span>
            <Download className="h-4 w-4" /> Download
          </a>
        ) : (
          <div className="divide-y rounded-xl border bg-card">{topLevel.length ? renderEntries(data.entry.id) : <p className="p-5 text-sm text-muted-foreground">This folder is empty.</p>}</div>
        ) : null}
      </div>
    </main>
  );
}
