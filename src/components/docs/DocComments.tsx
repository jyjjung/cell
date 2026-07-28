'use client';

import { useState } from 'react';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { useUsersById } from '@/hooks/use-all-users';
import { useDocComments } from '@/hooks/use-docs';
import { formatAppDateTime, formatUserDisplayName, getAppLocale } from '@/lib/formatting';
import { toDateSafe } from '@/lib/firestore-timestamp';
import { translations } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import { DOC_COMMENT_MAX } from '@/lib/docs-utils';

type DocCommentsProps = {
  docId: string;
  ownerId: string;
};

export function DocComments({ docId, ownerId }: DocCommentsProps) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const locale = getAppLocale(currentUser?.preferredLanguage);
  const usersById = useUsersById();
  const { comments, loading, addComment, deleteComment } = useDocComments(docId, true);
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  if (!currentUser) return null;

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await addComment(currentUser.uid, text);
      setText('');
    } catch (err: unknown) {
      console.error('[DocComments] failed to post:', err);
      toast({
        variant: 'destructive',
        title: t.error,
        description: err instanceof Error ? err.message : 'Failed to post comment',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="border-b border-border/50 px-4 py-3">
        <h2 className="text-section-title text-base">{t.comments}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{t.commentsDesc}</p>
      </div>

      <div className="max-h-[360px] overflow-y-auto px-4 py-3 stack-gap-sm">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t.noCommentsYet}</p>
        ) : (
          comments.map((comment) => {
            const author = usersById.get(comment.authorId);
            const canDelete =
              comment.authorId === currentUser.uid || ownerId === currentUser.uid;
            return (
              <div
                key={comment.id}
                className="rounded-lg bg-muted/40 px-3 py-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {formatUserDisplayName(author, t.communityMember)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatAppDateTime(toDateSafe(comment.createdAt), locale)}
                    </p>
                  </div>
                  {canDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      onClick={() => deleteComment(comment.id)}
                      aria-label={t.deleteComment}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  ) : null}
                </div>
                <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words">
                  {comment.text}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border/50 p-3 stack-gap-sm">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, DOC_COMMENT_MAX))}
          placeholder={t.addCommentPlaceholder}
          className="min-h-[72px] rounded-lg resize-none"
          maxLength={DOC_COMMENT_MAX}
        />
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            className="rounded-lg"
            onClick={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {t.postComment}
          </Button>
        </div>
      </div>
    </div>
  );
}
