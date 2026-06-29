'use client';

import { useState, useEffect } from 'react';
import CreateProposalPage from './CreateProposalPage';

export default function CreateProposalWrapper() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-omnom-muted text-sm">Loading…</div>
        </div>
      </div>
    );
  }

  return <CreateProposalPage />;
}
