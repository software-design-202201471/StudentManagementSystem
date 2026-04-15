'use client';

import { SessionProvider } from 'next-auth/react';

export default function Home({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
