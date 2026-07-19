'use client';

import { useEffect, useRef } from 'react';
import { Extension } from '@tiptap/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Undo2,
  Redo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  findInsertedTextRanges,
  htmlToEditorPlainText,
  mapTextRangesToDocPositions,
} from '@/lib/docs-utils';

const REMOTE_HIGHLIGHT_MS = 3800;
const remoteHighlightKey = new PluginKey<DecorationSet>('docRemoteHighlight');

const RemoteHighlight = Extension.create({
  name: 'docRemoteHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: remoteHighlightKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(remoteHighlightKey) as DecorationSet | undefined;
            if (meta !== undefined) return meta;
            return tr.docChanged ? old.map(tr.mapping, tr.doc) : old;
          },
        },
        props: {
          decorations(state) {
            return remoteHighlightKey.getState(state);
          },
        },
      }),
    ];
  },
});

type DocEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  /** When false, TipTap updates are ignored (prevents wiping docs before hydrate). */
  acceptUpdates?: boolean;
  /** When true, next external content update highlights inserted text like Apple Notes. */
  highlightRemoteChanges?: boolean;
  className?: string;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'h-8 w-8 shrink-0 rounded-lg',
        active && 'bg-muted text-foreground',
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

export function DocEditor({
  content,
  onChange,
  placeholder = 'Start writing…',
  editable = true,
  acceptUpdates = true,
  highlightRemoteChanges = false,
  className,
}: DocEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const acceptUpdatesRef = useRef(acceptUpdates);
  acceptUpdatesRef.current = acceptUpdates;
  const highlightRemoteRef = useRef(highlightRemoteChanges);
  highlightRemoteRef.current = highlightRemoteChanges;
  const prevContentRef = useRef(content);
  const clearHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        link: {
          openOnClick: false,
          HTMLAttributes: { class: 'text-primary underline underline-offset-2' },
        },
      }),
      Placeholder.configure({ placeholder }),
      RemoteHighlight,
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      if (!acceptUpdatesRef.current) return;
      onChangeRef.current(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'tiptap prose prose-sm dark:prose-invert max-w-none min-h-[280px] px-3 py-3 focus:outline-none',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const previousHtml = prevContentRef.current;
    const current = editor.getHTML();
    if (content === current && content === previousHtml) return;

    const prevPlain = htmlToEditorPlainText(previousHtml);
    const nextPlain = htmlToEditorPlainText(content);
    const shouldHighlight =
      highlightRemoteRef.current && previousHtml !== content && prevPlain !== nextPlain;

    if (content !== current) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
    prevContentRef.current = content;

    if (clearHighlightTimer.current) {
      clearTimeout(clearHighlightTimer.current);
      clearHighlightTimer.current = null;
    }

    if (!shouldHighlight) {
      editor.view.dispatch(editor.state.tr.setMeta(remoteHighlightKey, DecorationSet.empty));
      return;
    }

    const textRanges = findInsertedTextRanges(prevPlain, nextPlain);
    const docRanges = mapTextRangesToDocPositions(editor.state.doc, textRanges);
    const decorations =
      docRanges.length > 0
        ? DecorationSet.create(
            editor.state.doc,
            docRanges.map((range) =>
              Decoration.inline(range.from, range.to, {
                class: 'doc-remote-change',
              }),
            ),
          )
        : DecorationSet.empty;

    editor.view.dispatch(editor.state.tr.setMeta(remoteHighlightKey, decorations));
    clearHighlightTimer.current = setTimeout(() => {
      if (editor.isDestroyed) return;
      editor.view.dispatch(editor.state.tr.setMeta(remoteHighlightKey, DecorationSet.empty));
      clearHighlightTimer.current = null;
    }, REMOTE_HIGHLIGHT_MS);

    return () => {
      if (clearHighlightTimer.current) {
        clearTimeout(clearHighlightTimer.current);
        clearHighlightTimer.current = null;
      }
    };
  }, [content, editor]);

  if (!editor) {
    return (
      <div className={cn('rounded-xl border border-border/50 bg-card min-h-[320px]', className)} />
    );
  }

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL', previous || 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    const href = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  return (
    <div className={cn('rounded-xl border border-border/50 bg-card overflow-hidden', className)}>
      {editable ? (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border/50 px-1.5 py-1.5 bg-muted/30">
          <ToolbarButton
            label="Bold"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Underline"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 h-5 w-px bg-border/60" />
          <ToolbarButton
            label="Heading 1"
            active={editor.isActive('heading', { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Heading 2"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 h-5 w-px bg-border/60" />
          <ToolbarButton
            label="Bullet list"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Quote"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Link" active={editor.isActive('link')} onClick={setLink}>
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 h-5 w-px bg-border/60" />
          <ToolbarButton
            label="Undo"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
        </div>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
