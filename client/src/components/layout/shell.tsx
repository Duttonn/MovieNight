interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {children}
    </div>
  );
}