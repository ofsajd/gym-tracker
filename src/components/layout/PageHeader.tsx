export function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between">
      <h1 className="text-xl font-bold">{title}</h1>
      {action && <div>{action}</div>}
    </div>
  );
}
