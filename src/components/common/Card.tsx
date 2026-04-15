import type { PropsWithChildren, ReactNode } from 'react';

interface CardProps extends PropsWithChildren {
  title?: string;
  action?: ReactNode;
}

export default function Card({ title, action, children }: CardProps) {
  return (
    <section className="card">
      {(title || action) && (
        <header className="card-header">
          {title ? <h3>{title}</h3> : <span />}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
