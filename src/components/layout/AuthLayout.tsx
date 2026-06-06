import { type ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div dir="rtl" className="min-h-screen" style={{ fontFamily: "'Cairo', sans-serif" }}>
      {children}
    </div>
  );
}
