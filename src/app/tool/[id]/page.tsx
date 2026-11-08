import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TOOLS, toolById } from "@/lib/tools";
import { ToolPageClient } from "./tool-client";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ id: t.id }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tool = toolById(id);
  if (!tool) return {};
  return {
    title: `${tool.name} — Free, Private, 100% In Your Browser | SwiftPDF`,
    description: `${tool.description} Runs entirely on your device — no uploads, no sign-up, works offline.`,
    alternates: { canonical: `/tool/${tool.id}` },
    openGraph: {
      title: `${tool.name} | SwiftPDF`,
      description: tool.description,
      url: `/tool/${tool.id}`,
      type: "website",
    },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tool = toolById(id);
  if (!tool) notFound();
  return <ToolPageClient id={id} />;
}
