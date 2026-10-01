'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { Minus, Plus, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';

type Team = { id: string; name: string; points: number };

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

  return (
    <main className="min-h-svh bg-background px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2 text-center">
          <Trophy className="mx-auto h-8 w-8 text-primary" aria-hidden />
          <h1 className="text-2xl font-semibold text-foreground">Scoreboard</h1>
          {canEdit ? <p className="text-sm text-muted-foreground">Edit link</p> : null}
        </header>
        {loading ? <LoadingState isLoading delayMs={0} /> : null}
        {error ? <p role="alert" className="text-center text-destructive">{error}</p> : null}
        {!loading && !error ? (
          <div className="space-y-3">
            {teams.map((team, index) => (
              <Card key={team.id} className="flex flex-col gap-3 p-4 sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">{team.name}</p>
                  <span className="min-w-14 shrink-0 text-right text-2xl font-semibold tabular-nums text-foreground">{team.points}</span>
                </div>
                {canEdit ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[-10, -5, -1, 1, 5, 10].map((delta) => (
                      <Button
                        key={delta}
                        size="small"
                        variant="outline"
                        className="w-full"
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
