
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-secondary/30 p-4">
      <main className="w-full max-w-md">
        {children}
      </main>
    </div>
  );
}