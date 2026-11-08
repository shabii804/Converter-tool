import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SwiftPDF Design System — tokens, components & principles",
  description:
    "The SwiftPDF design system: navy + indigo-violet palette, 8px grid, layered shadows, Inter type scale, component kit and motion principles.",
};

export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
