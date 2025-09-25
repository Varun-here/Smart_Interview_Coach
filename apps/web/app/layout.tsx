export const metadata = {
  title: "Smart Interview Coach",
  description: "Practice interviews with AI feedback"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui" }}>{children}</body>
    </html>
  );
}
