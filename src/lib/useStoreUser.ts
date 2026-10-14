import { useUser } from '@clerk/expo';
import { useConvexAuth, useMutation } from 'convex/react';
import { useEffect, useState } from 'react';

import { api } from '@convex/_generated/api';

export function useStoreUser(): { ready: boolean; error: string | null } {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const store = useMutation(api.users.store);
  const [storedFor, setStoredFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let canceled = false;
    store({})
      .then(() => {
        if (!canceled) setStoredFor(user.id);
      })
      .catch((e: unknown) => {
        if (!canceled) setError(e instanceof Error ? e.message : 'Could not load your profile');
      });
    return () => {
      canceled = true;
    };
  }, [isAuthenticated, user, store]);

  return { ready: isAuthenticated && !!user && storedFor === user.id, error };
}
