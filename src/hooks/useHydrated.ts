'use client';

import { useEffect, useState } from 'react';

/** true depois que o app montou no cliente e os dados salvos foram lidos. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
