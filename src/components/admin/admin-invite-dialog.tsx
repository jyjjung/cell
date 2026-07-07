"use client";

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MultiSelect, type MultiSelectItem } from '@/components/ui/multi-select';
import { useInvites } from '@/hooks/use-invites';
import { useRoles } from '@/hooks/use-roles';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { translations } from '@/lib/translations';
import { Copy, Download, Loader2, Link2, QrCode, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DEFAULT_INVITE_MAX_USES,
  getInviteStatus,
  inviteUsesRemaining,
} from '@/lib/invite-utils';

const inviteFormSchema = z.object({
  code: z.string().optional(),
  label: z.string().optional(),
  roleIds: z.array(z.string()).optional(),
  allowedEmail: z.string().optional(),
  expiresInDays: z.coerce.number().int().min(1).max(90).default(7),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

function buildSignupUrl(code: string) {
  if (typeof window === 'undefined') return `/signup?invite=${code}`;
  return `${window.location.origin}/signup?invite=${encodeURIComponent(code)}`;
}

function InviteLinkShare({
  url,
  t,
  onCopy,
  compact = false,
}: {
  url: string;
  t: (typeof translations)['en'];
  onCopy: (url: string) => Promise<void>;
  compact?: boolean;
}) {
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    if (!showQr) {
      setQrDataUrl(null);
      return;
    }

    let cancelled = false;
    setQrLoading(true);
    void QRCode.toDataURL(url, {
      width: 240,
      margin: 2,
      color: { dark: '#111111', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      })
      .finally(() => {
        if (!cancelled) setQrLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showQr, url]);

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const anchor = document.createElement('a');
    anchor.href = qrDataUrl;
    anchor.download = 'em-invite-qr.png';
    anchor.click();
  };

  return (
    <div className={cn('space-y-2', compact && 'w-full')}>
      <div className="flex items-center gap-2">
        {!compact && (
          <code className="flex-1 text-xs break-all rounded-lg bg-background/80 px-2 py-1.5 border border-border/50">
            {url}
          </code>
        )}
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn('shrink-0', compact ? 'h-8 w-8' : 'h-9 w-9')}
          onClick={() => void onCopy(url)}
          aria-label={t.adminInviteCopyLink}
        >
          <Copy className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={showQr ? 'default' : 'outline'}
          className={cn('shrink-0', compact ? 'h-8 w-8' : 'h-9 w-9')}
          onClick={() => setShowQr((prev) => !prev)}
          aria-label={showQr ? t.adminInviteHideQr : t.adminInviteShowQr}
          aria-pressed={showQr}
        >
          <QrCode className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </Button>
      </div>

      {showQr && (
        <div className="rounded-xl border border-border/50 bg-background p-4 flex flex-col items-center gap-3">
          {qrLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : qrDataUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={t.adminInviteQrHint}
                className="h-48 w-48 rounded-lg border border-border/40 bg-white p-2"
              />
              <p className="text-xs text-muted-foreground text-center">{t.adminInviteQrHint}</p>
              <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={downloadQr}>
                <Download className="mr-2 h-4 w-4" />
                {t.adminInviteDownloadQr}
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{t.adminInviteCopyFailed}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminInviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { toast } = useToast();
  const { invites, loading, createInvite, deleteInvite } = useInvites();
  const { roles } = useRoles();
  const [isSaving, setIsSaving] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { code: '', label: '', roleIds: [], allowedEmail: '', expiresInDays: 7 },
  });

  const roleOptions: MultiSelectItem[] = useMemo(
    () => roles.map((role) => ({ value: role.id, label: role.name })),
    [roles],
  );

  const rolesMap = useMemo(() => new Map(roles.map((r) => [r.id, r.name])), [roles]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setCreatedLink(null);
      form.reset({ code: '', label: '', roleIds: [], allowedEmail: '', expiresInDays: 7 });
    }
    onOpenChange(next);
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t.adminInviteLinkCopied });
    } catch {
      toast({ variant: 'destructive', title: t.adminInviteCopyFailed });
    }
  };

  const onSubmit = async (data: InviteFormValues) => {
    setIsSaving(true);
    try {
      const code = await createInvite({
        code: data.code,
        label: data.label,
        roles: data.roleIds ?? [],
        allowedEmail: data.allowedEmail,
        maxUses: DEFAULT_INVITE_MAX_USES,
        expiresInDays: data.expiresInDays,
      });
      const url = buildSignupUrl(code);
      setCreatedLink(url);
      form.reset({ code: '', label: '', roleIds: [], allowedEmail: '', expiresInDays: 7 });
      await copyLink(url);
      toast({
        title: t.adminInviteCreated,
        description: t.adminInviteCreatedDesc,
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: t.adminInviteCreateFailed,
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (inviteId: string) => {
    setDeletingId(inviteId);
    try {
      await deleteInvite(inviteId);
      toast({ title: t.adminInviteDeleted });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: t.adminInviteDeleteFailed,
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-section-title">{t.adminCreateInvite}</DialogTitle>
          <DialogDescription>{t.adminCreateInviteDesc}</DialogDescription>
        </DialogHeader>

        {createdLink && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
            <p className="text-micro-label text-primary">{t.adminInviteLinkReady}</p>
            <InviteLinkShare url={createdLink} t={t} onCopy={copyLink} />
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-micro-label">{t.adminInviteLabel}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t.adminInviteLabelPlaceholder} className="h-10 rounded-lg" disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allowedEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-micro-label">{t.adminInviteAllowedEmail}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder={t.adminInviteAllowedEmailPlaceholder}
                      className="h-10 rounded-lg"
                      disabled={isSaving}
                    />
                  </FormControl>
                  <FormDescription>{t.adminInviteAllowedEmailHint}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-micro-label">{t.adminInviteCode}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t.adminInviteCodePlaceholder} className="h-10 rounded-lg font-mono" disabled={isSaving} />
                  </FormControl>
                  <FormDescription>{t.adminInviteCodeHint}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roleIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-micro-label">{t.adminInviteRoles}</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={roleOptions}
                      selected={field.value || []}
                      onChange={field.onChange}
                      placeholder={t.adminInviteRolesPlaceholder}
                    />
                  </FormControl>
                  <FormDescription>{t.adminInviteRolesHint}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresInDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-micro-label">{t.adminInviteExpiresInDays}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={1}
                      max={90}
                      className="h-10 rounded-lg"
                      disabled={isSaving}
                    />
                  </FormControl>
                  <FormDescription>{t.adminInviteExpiresHint}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-1">
              <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                {t.adminInviteCreateButton}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        <div className="space-y-2 border-t border-border/50 pt-4">
          <p className="text-micro-label">{t.adminInviteExisting}</p>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.loading}
            </div>
          ) : invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.adminInviteNone}</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {invites.map((invite) => {
                const url = buildSignupUrl(invite.id);
                const status = getInviteStatus(invite);
                const statusLabel =
                  status === 'used'
                    ? t.adminInviteStatusUsed
                    : status === 'expired'
                      ? t.adminInviteStatusExpired
                      : t.adminInviteStatusActive;
                return (
                  <li
                    key={invite.id}
                    className={cn(
                      'rounded-xl border border-border/50 bg-muted/20 px-3 py-2 space-y-2',
                      status !== 'active' && 'opacity-70',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-mono text-xs font-semibold truncate">{invite.id}</p>
                          <Badge
                            variant={status === 'active' ? 'outline' : 'secondary'}
                            className="h-5 px-1.5 text-[10px]"
                          >
                            {statusLabel}
                          </Badge>
                        </div>
                        {invite.label ? (
                          <p className="text-xs text-muted-foreground truncate">{invite.label}</p>
                        ) : null}
                        {invite.allowedEmail ? (
                          <p className="text-[10px] text-muted-foreground mt-1 truncate">
                            {t.adminInviteLockedTo.replace('{email}', invite.allowedEmail)}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(invite.roles?.length ?? 0) > 0 ? (
                            invite.roles.map((roleId) => (
                              <Badge key={roleId} variant="outline" className="h-5 px-1.5 text-[10px]">
                                {rolesMap.get(roleId) || roleId}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-[10px] text-muted-foreground">{t.adminInviteNoRoles}</span>
                          )}
                        </div>
                        {invite.createdAt ? (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(invite.createdAt.toDate(), 'MMM d, yyyy')}
                            {invite.expiresAt
                              ? ` · ${t.adminInviteExpiresOn.replace('{date}', format(invite.expiresAt.toDate(), 'MMM d, yyyy'))}`
                              : ''}
                            {status === 'active'
                              ? ` · ${t.adminInviteUsesLeft.replace('{count}', String(inviteUsesRemaining(invite)))}`
                              : ''}
                          </p>
                        ) : null}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                            disabled={deletingId === invite.id}
                            aria-label={t.adminInviteDelete}
                          >
                            {deletingId === invite.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.adminInviteDelete}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.adminInviteDeleteDesc.replace('{code}', invite.id)}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.adminCancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => void handleDelete(invite.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {t.adminYesDelete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    {status === 'active' ? (
                      <InviteLinkShare url={url} t={t} onCopy={copyLink} compact />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
