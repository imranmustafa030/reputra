// Re-mounts on every navigation inside this section, so each screen eases in from where the last one was.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
