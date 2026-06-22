export default function DividersLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="print-only-layout">
      {children}
    </div>
  );
}
