"use client";

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Info, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { useInfoWidgets, type InfoWidgetInput } from '@/hooks/use-info-widgets';
import type { InfoWidget } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/page-layout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function WidgetEditorDialog({
  open,
  existing,
  onClose,
  onSave,
}: {
  open: boolean;
  existing?: InfoWidget | null;
  onClose: () => void;
  onSave: (input: InfoWidgetInput) => Promise<void>;
}) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const [title, setTitle] = useState('');
  const [titleKo, setTitleKo] = useState('');
  const [body, setBody] = useState('');
  const [bodyKo, setBodyKo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(existing?.title || '');
    setTitleKo(existing?.titleKo || '');
    setBody(existing?.body || '');
    setBodyKo(existing?.bodyKo || '');
  }, [existing, open]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) return;

    setSaving(true);
    try {
      await onSave({
        title: trimmedTitle,
        titleKo: titleKo.trim() || undefined,
        body: trimmedBody,
        bodyKo: bodyKo.trim() || undefined,
      });
      onClose();
    } catch {
      // Parent shows toast; keep dialog open for retry.
    } finally {
      setSaving(false);
    }
  };

  const canSave = title.trim().length > 0 && body.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-xl border-border/50 bg-card p-5">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-section-title">
            {existing ? t.adminEditInfoWidget : t.adminAddInfoWidget}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t.adminInfoWidgetDialogHint}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="info-widget-title">
                {t.adminInfoWidgetTitle} <span className="text-primary">*</span>
              </Label>
              <Input
                id="info-widget-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.adminInfoWidgetTitlePlaceholder}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="info-widget-title-ko">{t.adminInfoWidgetTitleKo}</Label>
              <Input
                id="info-widget-title-ko"
                value={titleKo}
                onChange={(e) => setTitleKo(e.target.value)}
                placeholder={t.adminInfoWidgetTitleKoPlaceholder}
                className="rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="info-widget-body">
              {t.adminInfoWidgetBody} <span className="text-primary">*</span>
            </Label>
            <Textarea
              id="info-widget-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t.adminInfoWidgetBodyPlaceholder}
              className="min-h-[140px] rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="info-widget-body-ko">{t.adminInfoWidgetBodyKo}</Label>
            <Textarea
              id="info-widget-body-ko"
              value={bodyKo}
              onChange={(e) => setBodyKo(e.target.value)}
              placeholder={t.adminInfoWidgetBodyKoPlaceholder}
              className="min-h-[100px] rounded-lg"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 rounded-lg" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button
              className="flex-1 rounded-lg"
              onClick={() => void handleSave()}
              disabled={!canSave || saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {existing ? t.save : t.adminAddInfoWidget}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function InfoWidgetsAdmin() {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { toast } = useToast();
  const {
    widgets,
    loading,
    addWidget,
    updateWidget,
    deleteWidget,
    moveWidget,
  } = useInfoWidgets();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InfoWidget | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (widget: InfoWidget) => {
    setEditing(widget);
    setDialogOpen(true);
  };

  const handleSave = async (input: InfoWidgetInput) => {
    try {
      if (editing) {
        await updateWidget(editing.id, input);
        toast({ title: t.adminInfoWidgetUpdated });
      } else {
        await addWidget(input);
        toast({ title: t.adminInfoWidgetAdded });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.error;
      toast({ title: t.error, description: message, variant: 'destructive' });
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWidget(id);
      toast({ title: t.adminInfoWidgetDeleted });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.error;
      toast({ title: t.error, description: message, variant: 'destructive' });
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    setReorderingId(id);
    try {
      await moveWidget(id, direction);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.error;
      toast({ title: t.error, description: message, variant: 'destructive' });
    } finally {
      setReorderingId(null);
    }
  };

  const lang = currentUser?.preferredLanguage || 'en';

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-section-title">{t.adminInfoWidgets}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.adminInfoWidgetsHint}</p>
        </div>
        <Button type="button" size="sm" className="rounded-lg" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t.adminAddInfoWidget}
        </Button>
      </section>

      {loading ? (
        <div className="empty-inline">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : widgets.length === 0 ? (
        <EmptyState
          icon={Info}
          title={t.adminNoInfoWidgets}
          description={t.adminNoInfoWidgetsHint}
        />
      ) : (
        <div className="space-y-4">
          {widgets.map((widget, index) => {
            const title =
              lang === 'ko' && widget.titleKo ? widget.titleKo : widget.title;
            const body =
              lang === 'ko' && widget.bodyKo ? widget.bodyKo : widget.body;
            const isReordering = reorderingId === widget.id;
            return (
              <section key={widget.id} className="widget-surface space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-eyebrow">{t.adminInfoWidgetPreview}</p>
                    <h3 className="text-section-title truncate">{title}</h3>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => void handleMove(widget.id, 'up')}
                      disabled={index === 0 || !!reorderingId}
                      aria-label={t.adminMoveUp}
                    >
                      {isReordering ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ArrowUp className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => void handleMove(widget.id, 'down')}
                      disabled={index === widgets.length - 1 || !!reorderingId}
                      aria-label={t.adminMoveDown}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(widget)}
                      aria-label={t.adminEditInfoWidget}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={t.adminYesDelete}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-section-title">
                            {t.adminDeleteInfoWidget}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {title} — {t.adminCannotUndo}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t.adminCancel}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void handleDelete(widget.id)}>
                            {t.adminYesDelete}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {body}
                </p>
              </section>
            );
          })}
        </div>
      )}

      <WidgetEditorDialog
        open={dialogOpen}
        existing={editing}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
