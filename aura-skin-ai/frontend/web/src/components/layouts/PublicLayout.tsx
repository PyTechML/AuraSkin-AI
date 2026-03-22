export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col flex-1 bg-background w-full">
      {children}
    </div>
  );
}
