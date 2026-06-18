import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QA Test Management",
  description: "Simple test case & cycle management with Jira links and reports.",
};

// Runs before paint to apply the saved/system theme and avoid a flash.
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem('theme');
    var dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
