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
} from 'firebase/firestore';
import { Minus, Plus, Trophy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/page-layout';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListLoadingSkeleton } from '@/components/ui/loading-state';
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
};

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
  const [links, setLinks] = useState<{ publicUrl: string; editUrl: string } | null>(null);
  const [creatingLinks, setCreatingLinks] = useState(false);

  useEffect(() => {
    const scoreboardQuery = query(
      collection(db, SCOREBOARD_TEAMS_COLLECTION),
      orderBy('createdAt', 'asc'),
    );

    return onSnapshot(
      scoreboardQuery,
      (snapshot) => {
        setTeams(
          snapshot.docs.map((teamDoc) => {
            const data = teamDoc.data();
            return {
              id: teamDoc.id,
              name: typeof data.name === 'string' ? data.name : 'Unnamed team',
              points: typeof data.points === 'number' ? data.points : 0,
            };
          }),
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

  const addTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = teamName.trim();
    if (!name || saving) return;

    setSaving(true);
    try {
      await addDoc(collection(db, SCOREBOARD_TEAMS_COLLECTION), {
        name,
        points: 0,
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

      {loading ? (
        <ListLoadingSkeleton rows={3} />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No teams yet"
          description="Add the first team to start keeping score."
        />
      ) : (
        <div className="space-y-3" aria-label="Scoreboard teams">
          {teams.map((team, index) => {
            const busy = updatingTeamId === team.id;
            return (
              <Card key={team.id} className="flex flex-col gap-3 p-4 sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-foreground">{team.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {team.points} {team.points === 1 ? 'point' : 'points'}
                    </p>
                  </div>
                  <span className="min-w-14 shrink-0 text-right text-xl font-semibold tabular-nums text-foreground">
                    {team.points}
                  </span>
                </div>
                {isAdmin ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[-10, -5, -1, 1, 5, 10].map((delta) => (
                      <Button
                        key={delta}
                        type="button"
                        size="small"
                        variant="outline"
                        className="w-full"
                        disabled={busy}
                        onClick={() => void changePoints(team, delta)}
                        aria-label={`${delta > 0 ? 'Add' : 'Remove'} ${Math.abs(delta)} points for ${team.name}`}
                      >
                        {delta > 0 ? <Plus className="h-3.5 w-3.5" aria-hidden /> : <Minus className="h-3.5 w-3.5" aria-hidden />}
                        {Math.abs(delta)}
                      </Button>
                    ))}
                    <IconButton
                      aria-label={`Remove ${team.name}`}
                      icon={Trash2}
                      size="small"
                      variant="ghost"
                      className="ml-1 text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => setTeamToDelete(team)}
                    />
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
