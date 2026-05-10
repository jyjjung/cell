"use client";

import { useState, useMemo, useEffect } from 'react';
import { useFeedback, Feedback, FeedbackStatus } from '@/hooks/useFeedback';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Bug, Lightbulb, ThumbsUp, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';

const statusConfig: Record<FeedbackStatus, { label: string, color: string }> = {
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground' },
  under_review: { label: 'Under Review', color: 'bg-blue-500/10 text-blue-500' },
  planned: { label: 'Planned', color: 'bg-orange-500/10 text-orange-500' },
  in_progress: { label: 'In Progress', color: 'bg-purple-500/10 text-purple-500' },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500' },
  declined: { label: 'Declined', color: 'bg-red-500/10 text-red-500' }
};

export default function FeedbackPage() {
  const { feedbackList, loading, submitFeedback, toggleUpvote, updateStatus, deleteFeedbackItem } = useFeedback();
  const { currentUser, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitType, setSubmitType] = useState<'suggestion' | 'bug'>('suggestion');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const suggestions = useMemo(() => feedbackList.filter(f => f.type === 'suggestion'), [feedbackList]);
  const bugs = useMemo(() => feedbackList.filter(f => f.type === 'bug'), [feedbackList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast({ title: 'Error', description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await submitFeedback({ type: submitType, title, description });
      toast({ title: 'Success', description: 'Your feedback has been submitted.' });
      setIsDialogOpen(false);
      setTitle('');
      setDescription('');
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to submit feedback.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFeedbackCard = (item: Feedback) => {
    const isUpvoted = currentUser ? item.upvotes.includes(currentUser.uid) : false;
    const isAuthor = currentUser?.uid === item.authorId;
    const config = statusConfig[item.status];

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        key={item.id}
        className="p-5 rounded-3xl bg-card/40 border border-white/5 shadow-sm flex gap-4"
      >
        <div className="flex flex-col items-center gap-2 shrink-0">
          <button 
            onClick={() => toggleUpvote(item.id, item.upvotes)}
            className={cn(
              "flex flex-col items-center justify-center h-14 w-12 rounded-2xl border transition-all",
              isUpvoted 
                ? "bg-primary/10 border-primary/30 text-primary" 
                : "bg-muted/30 border-white/5 text-muted-foreground hover:bg-muted"
            )}
          >
            <ThumbsUp className={cn("h-4 w-4 mb-1", isUpvoted && "fill-current")} />
            <span className="text-xs font-bold leading-none">{item.upvotes.length}</span>
          </button>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2 gap-2">
            <div>
              <h3 className="font-bold text-foreground text-lg leading-tight">{item.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <span className="font-medium text-foreground/70">{item.authorName}</span>
                <span>•</span>
                <span>{item.createdAt ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true }) : 'Just now'}</span>
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2">
              <Badge variant="secondary" className={cn("border-none", config.color)}>
                {config.label}
              </Badge>
              {(isAdmin || isAuthor) && (
                <button onClick={() => {
                  if(confirm('Are you sure you want to delete this?')) {
                    deleteFeedbackItem(item.id);
                  }
                }} className="text-muted-foreground/50 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          <p className="text-sm text-foreground/80 leading-relaxed mt-3 whitespace-pre-wrap">
            {item.description}
          </p>

          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-muted-foreground w-full">Admin Actions:</span>
              {(Object.keys(statusConfig) as FeedbackStatus[]).map(status => (
                <button
                  key={status}
                  onClick={() => updateStatus(item.id, status)}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded-md font-bold transition-all border",
                    item.status === status ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-white/5 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {statusConfig[status].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  if (!isMounted || loading) return null;

  return (
    <div className="relative space-y-8 pb-32 max-w-4xl mx-auto px-4 md:px-8 mt-12">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader
          title="Feedback & Suggestions"
          description="Help us improve by sharing your ideas or reporting bugs."
          icon={MessageSquare}
          accentColor="text-primary"
          iconBgColor="bg-primary/10"
        />
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl h-11 px-6 font-bold shadow-lg shadow-primary/20">
              New Feedback
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Submit Feedback</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSubmitType('suggestion')}
                  className={cn(
                    "flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all border",
                    submitType === 'suggestion' ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/30 border-white/5 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Lightbulb className="h-4 w-4" /> Suggestion
                </button>
                <button
                  type="button"
                  onClick={() => setSubmitType('bug')}
                  className={cn(
                    "flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all border",
                    submitType === 'bug' ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-muted/30 border-white/5 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Bug className="h-4 w-4" /> Bug Report
                </button>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground/80">Title</label>
                <Input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder={submitType === 'suggestion' ? "E.g., Add dark mode toggle" : "E.g., App crashes when I click..."}
                  className="rounded-xl"
                  maxLength={100}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground/80">Description</label>
                <Textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Please provide details..."
                  className="rounded-xl min-h-[120px] resize-none"
                  maxLength={1000}
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl">
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1 bg-muted/30 border border-border/30 h-11">
          <TabsTrigger value="suggestions" className="rounded-xl text-sm font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Suggestions ({suggestions.length})
          </TabsTrigger>
          <TabsTrigger value="bugs" className="rounded-xl text-sm font-semibold flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Bugs ({bugs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-6 space-y-4">
          <AnimatePresence initial={false}>
            {suggestions.length > 0 ? (
              suggestions.sort((a, b) => b.upvotes.length - a.upvotes.length).map(renderFeedbackCard)
            ) : (
              <EmptyState 
                icon={Lightbulb} 
                title="No suggestions yet" 
                description="Be the first to suggest a new feature!" 
              />
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="bugs" className="mt-6 space-y-4">
          <AnimatePresence initial={false}>
            {bugs.length > 0 ? (
              bugs.sort((a, b) => b.upvotes.length - a.upvotes.length).map(renderFeedbackCard)
            ) : (
              <EmptyState 
                icon={CheckCircle2} 
                title="No bugs reported" 
                description="Everything seems to be running smoothly!" 
              />
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}
