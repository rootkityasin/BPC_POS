import "@/app/globals.css";

export const metadata = {
  title: "BPC POS",
  description: "Multi-store POS admin"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
