import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScopeDelta — AI Scope Creep Detector",
  description:
    "Compare incoming feature requests against your project baseline to automatically flag scope creep and generate formal change requests.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <div className="ambient-glow" />
        {children}
      </body>
    </html>
  );
}
