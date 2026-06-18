import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QA Test Management",
  description: "Simple test case & cycle management with Jira links and reports.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
