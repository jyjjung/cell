'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { ArrowDown, ArrowUp, Check, Minus, Pencil, Plus, Trophy, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/page-layout';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListLoadingSkeleton } from '@/components/ui/loading-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { getClientAuthHeaders } from '@/lib/client-auth-headers';
import { useAuth } from '@/contexts/auth-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ScoreboardTeam = {
  id: string;
  name: string;
  points: number;
  order?: number;
};

type ScoreboardSort = 'order' | 'rank';

const SCOREBOARD_TEAMS_COLLECTION = 'scoreboardTeams';

export function ScoreboardPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<ScoreboardTeam[]>([]);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingTeamId, setUpdatingTeamId] = useState<string | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<ScoreboardTeam | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const [links, setLinks] = useState<{ publicUrl: string; editUrl: string } | null>(null);
  const [creatingLinks, setCreatingLinks] = useState(false);
  const [sortBy, setSortBy] = useState<ScoreboardSort>('order');
  const [isEditingTeams, setIsEditingTeams] = useState(false);

  useEffect(() => {
    const scoreboardQuery = query(
      collection(db, SCOREBOARD_TEAMS_COLLECTION),
      orderBy('createdAt', 'asc'),
    );

    return onSnapshot(
      scoreboardQuery,
      (snapshot) => {
        setTeams(
          snapshot.docs.map((teamDoc, index) => {
            const data = teamDoc.data();
            return {
              id: teamDoc.id,
              name: typeof data.name === 'string' ? data.name : 'Unnamed team',
              points: typeof data.points === 'number' ? data.points : 0,
              order: typeof data.order === 'number' ? data.order : index,
            };
          }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        );
        setLoading(false);
      },
      (error) => {
        console.error('Could not load scoreboard teams:', error);
        setLoading(false);
        toast({
          variant: 'destructive',
          title: 'Could not load scoreboard',
          description: 'Please try again.',
        });
      },
    );
  }, [toast]);

  const totalPoints = useMemo(
    () => teams.reduce((total, team) => total + team.points, 0),
    [teams],
  );
  const displayedTeams = useMemo(
    () => sortBy === 'rank'
      ? [...teams].sort((a, b) => b.points - a.points || (a.order ?? 0) - (b.order ?? 0))
      : teams,
    [sortBy, teams],
  );

  const addTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = teamName.trim();
    if (!name || saving) return;

    setSaving(true);
    try {
      await addDoc(collection(db, SCOREBOARD_TEAMS_COLLECTION), {
        name,
        points: 0,
        order: teams.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setTeamName('');
      toast({ title: 'Team added' });
    } catch (error) {
      console.error('Could not add scoreboard team:', error);
      toast({ variant: 'destructive', title: 'Could not add team' });
    } finally {
      setSaving(false);
    }
  };

  const renameTeam = async () => {
    const team = teams.find((item) => item.id === editingTeamId);
    const name = editingTeamName.trim();
    if (!team || !name || name === team.name || updatingTeamId) return;

    setUpdatingTeamId(team.id);
    try {
      await updateDoc(doc(db, SCOREBOARD_TEAMS_COLLECTION, team.id), {
        name,
        updatedAt: serverTimestamp(),
      });
      setEditingTeamId(null);
      toast({ title: 'Team renamed' });
    } catch (error) {
      console.error('Could not rename scoreboard team:', error);
      toast({ variant: 'destructive', title: 'Could not rename team' });
    } finally {
      setUpdatingTeamId(null);
    }
  };

  const moveTeam = async (teamId: string, direction: -1 | 1) => {
    const index = teams.findIndex((team) => team.id === teamId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= teams.length || updatingTeamId) return;

    const current = teams[index];
    const next = teams[nextIndex];
    setUpdatingTeamId(teamId);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, SCOREBOARD_TEAMS_COLLECTION, current.id), {
        order: next.order ?? nextIndex,
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, SCOREBOARD_TEAMS_COLLECTION, next.id), {
        order: current.order ?? index,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      console.error('Could not reorder scoreboard teams:', error);
      toast({ variant: 'destructive', title: 'Could not reorder teams' });
    } finally {
      setUpdatingTeamId(null);
    }
  };

  const changePoints = async (team: ScoreboardTeam, delta: number) => {
    if (updatingTeamId) return;

    setUpdatingTeamId(team.id);
    try {
      await updateDoc(doc(db, SCOREBOARD_TEAMS_COLLECTION, team.id), {
        points: increment(delta),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Could not update scoreboard points:', error);
      toast({ variant: 'destructive', title: 'Could not update points' });
    } finally {
      setUpdatingTeamId(null);
    }
  };

  const removeTeam = async () => {
    if (!teamToDelete) return;

    setUpdatingTeamId(teamToDelete.id);
    try {
      await deleteDoc(doc(db, SCOREBOARD_TEAMS_COLLECTION, teamToDelete.id));
      toast({ title: 'Team removed' });
      setTeamToDelete(null);
    } catch (error) {
      console.error('Could not remove scoreboard team:', error);
      toast({ variant: 'destructive', title: 'Could not remove team' });
    } finally {
      setUpdatingTeamId(null);
    }
  };

  const createLinks = async () => {
    if (!isAdmin || creatingLinks) return;
    setCreatingLinks(true);
    try {
      const response = await fetch('/api/scoreboard/links', {
        method: 'POST',
        headers: await getClientAuthHeaders(),
      });
      const data = await response.json() as { publicUrl?: string; editUrl?: string; error?: string };
      if (!response.ok || !data.publicUrl || !data.editUrl) {
        throw new Error(data.error || 'Could not create scoreboard links');
      }
      setLinks({ publicUrl: data.publicUrl, editUrl: data.editUrl });
      toast({ title: 'Scoreboard links created' });
    } catch (error) {
      console.error('Could not create scoreboard links:', error);
      toast({ variant: 'destructive', title: 'Could not create links' });
    } finally {
      setCreatingLinks(false);
    }
  };

  const copyLink = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied` });
    } catch (error) {
      console.error('Could not copy scoreboard link:', error);
      toast({ variant: 'destructive', title: 'Could not copy link' });
    }
  };

  return (
    <div className="page-flow">
      {isAdmin ? (
        <Card className="space-y-4 p-4 sm:p-5">
          <form onSubmit={addTeam} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="scoreboard-team-name">Add a team</Label>
              <Input
                id="scoreboard-team-name"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="Team name"
                maxLength={80}
                required
              />
            </div>
            <Button type="submit" disabled={saving || !teamName.trim()}>
              <Plus className="h-4 w-4" aria-hidden />
              Add team
            </Button>
          </form>
          <div className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row">
            <Button
              type="button"
              variant={isEditingTeams ? 'secondary' : 'outline'}
              onClick={() => {
                setIsEditingTeams((editing) => !editing);
                setEditingTeamId(null);
              }}
            >
              {isEditingTeams ? 'Done editing' : 'Edit teams'}
            </Button>
            <Button type="button" variant="outline" onClick={() => void createLinks()} disabled={creatingLinks}>
              Create public links
            </Button>
            {links ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="small" variant="ghost" onClick={() => void copyLink('Public link', links.publicUrl)}>
                  Copy public link
                </Button>
                <Button type="button" size="small" variant="ghost" onClick={() => void copyLink('Edit link', links.editUrl)}>
                  Copy admin edit link
                </Button>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {!loading && teams.length > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="scoreboard-sort">View</Label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as ScoreboardSort)}>
            <SelectTrigger id="scoreboard-sort" className="h-10 w-36 min-h-10 sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rank">Rank</SelectItem>
              <SelectItem value="order">Set order</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {loading ? (
        <ListLoadingSkeleton rows={3} />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No teams yet"
          description="Add the first team to start keeping score."
        />
      ) : (
        <div className="space-y-2" aria-label="Scoreboard teams">
          {displayedTeams.map((team, index) => {
            const busy = updatingTeamId === team.id;
            return (
              <Card key={team.id} className="flex flex-col gap-2 p-3 sm:p-4">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-foreground">{team.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {team.points} {team.points === 1 ? 'point' : 'points'}
                    </p>
                  </div>
                  <span className="min-w-12 shrink-0 text-right text-xl font-semibold tabular-nums text-foreground">
                    {team.points}
                  </span>
                </div>
                {isAdmin && isEditingTeams ? (
                  <div className="flex flex-wrap gap-1 border-t border-border/60 pt-2">
                    {editingTeamId === team.id ? (
                      <>
                        <Input
                          value={editingTeamName}
                          onChange={(event) => setEditingTeamName(event.target.value)}
                          maxLength={80}
                          aria-label={`New name for ${team.name}`}
                          className="min-w-0 flex-1"
                          autoFocus
                        />
                        <IconButton
                          aria-label={`Save new name for ${team.name}`}
                          icon={Check}
                          size="small"
                          variant="outline"
                          disabled={busy || !editingTeamName.trim() || editingTeamName.trim() === team.name}
                          onClick={() => void renameTeam()}
                        />
                        <IconButton
                          aria-label="Cancel renaming"
                          icon={X}
                          size="small"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setEditingTeamId(null)}
                        />
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="small"
                        variant="ghost"
                        onClick={() => {
                          setEditingTeamId(team.id);
                          setEditingTeamName(team.name);
                        }}
                        disabled={busy}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Rename
                      </Button>
                    )}
                    <IconButton
                      aria-label={`Move ${team.name} up`}
                      icon={ArrowUp}
                      size="small"
                      variant="ghost"
                      disabled={busy || sortBy !== 'order' || index === 0}
                      onClick={() => void moveTeam(team.id, -1)}
                    />
                    <IconButton
                      aria-label={`Move ${team.name} down`}
                      icon={ArrowDown}
                      size="small"
                      variant="ghost"
                      disabled={busy || sortBy !== 'order' || index === displayedTeams.length - 1}
                      onClick={() => void moveTeam(team.id, 1)}
                    />
                    <IconButton
                      aria-label={`Remove ${team.name}`}
                      icon={Trash2}
                      size="small"
                      variant="ghost"
                      className="ml-auto text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => setTeamToDelete(team)}
                    />
                  </div>
                ) : null}
                {isAdmin ? (
                  <div className="grid grid-cols-6 gap-1">
                    {[-10, -5, -1, 1, 5, 10].map((delta) => (
                      <Button
                        key={delta}
                        type="button"
                        size="small"
                        variant="outline"
                        className="w-full px-1"
                        disabled={busy}
                        onClick={() => void changePoints(team, delta)}
                        aria-label={`${delta > 0 ? 'Add' : 'Remove'} ${Math.abs(delta)} points for ${team.name}`}
                      >
                        {delta > 0 ? <Plus className="h-3.5 w-3.5" aria-hidden /> : <Minus className="h-3.5 w-3.5" aria-hidden />}
                        {Math.abs(delta)}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </Card>
            );
          })}
          <p className="px-1 text-sm text-muted-foreground">
            {teams.length} {teams.length === 1 ? 'team' : 'teams'} · {totalPoints} total points
          </p>
        </div>
      )}

      <AlertDialog open={teamToDelete !== null} onOpenChange={(open) => !open && setTeamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {teamToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the team and its score for everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void removeTeam();
              }}
              disabled={!teamToDelete || updatingTeamId === teamToDelete.id}
            >
              Remove team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
