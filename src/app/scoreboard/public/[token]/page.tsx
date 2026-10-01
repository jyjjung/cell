'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { Minus, Plus, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Team = { id: string; name: string; points: number; order?: number };
type ScoreboardSort = 'order' | 'rank';

export default function PublicScoreboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [teams, setTeams] = useState<Team[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ScoreboardSort>('order');

  const loadScoreboard = useCallback(async () => {
    try {
      const response = await fetch(`/api/scoreboard/public/${encodeURIComponent(token)}`, { cache: 'no-store' });
      const data = await response.json() as { teams?: Team[]; canEdit?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || 'Scoreboard unavailable');
      setTeams(data.teams ?? []);
      setCanEdit(data.canEdit === true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Scoreboard unavailable');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadScoreboard();
  }, [loadScoreboard]);

  const changePoints = async (teamId: string, delta: number) => {
    if (updating) return;
    setUpdating(teamId);
    try {
      const response = await fetch(`/api/scoreboard/public/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, delta }),
      });
      if (!response.ok) throw new Error('Could not update score');
      await loadScoreboard();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update score');
    } finally {
      setUpdating(null);
    }
  };

  const displayedTeams = sortBy === 'rank'
    ? [...teams].sort((a, b) => b.points - a.points || (a.order ?? 0) - (b.order ?? 0))
    : teams;

  return (
    <main className="min-h-svh bg-background px-3 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
        <header className="space-y-1 text-center">
          <Trophy className="mx-auto h-7 w-7 text-primary" aria-hidden />
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Scoreboard</h1>
          {canEdit ? <p className="text-sm text-muted-foreground">Edit link</p> : null}
        </header>
        {loading ? <LoadingState isLoading delayMs={0} /> : null}
        {error ? <p role="alert" className="text-center text-destructive">{error}</p> : null}
        {!loading && !error ? (
          <div className="space-y-2">
            {teams.length > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="public-scoreboard-sort">View</Label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as ScoreboardSort)}>
                  <SelectTrigger id="public-scoreboard-sort" className="h-10 w-36 min-h-10 sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rank">Rank</SelectItem>
                    <SelectItem value="order">Set order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {displayedTeams.map((team, index) => (
              <Card key={team.id} className="flex flex-col gap-2 p-3 sm:p-5">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">{team.name}</p>
                  <span className="min-w-12 shrink-0 text-right text-2xl font-semibold tabular-nums text-foreground">{team.points}</span>
                </div>
                {canEdit ? (
                  <div className="grid grid-cols-6 gap-1">
                    {[-10, -5, -1, 1, 5, 10].map((delta) => (
                      <Button
                        key={delta}
                        size="small"
                        variant="outline"
                        className="w-full px-1"
                        disabled={updating === team.id}
                        onClick={() => void changePoints(team.id, delta)}
                        aria-label={`${delta > 0 ? 'Add' : 'Remove'} ${Math.abs(delta)} points for ${team.name}`}
                      >
                        {delta > 0 ? <Plus className="h-3.5 w-3.5" aria-hidden /> : <Minus className="h-3.5 w-3.5" aria-hidden />}
                        {Math.abs(delta)}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
