import type { Metadata } from "next";
import { PlayPageClient } from "./PlayPageClient";

interface PlayPageProps {
  params: Promise<{ blockNumber: string }>;
}

export async function generateMetadata({
  params,
}: PlayPageProps): Promise<Metadata> {
  const { blockNumber } = await params;
  const ogUrl = `/api/og/run/${blockNumber}`;
  const title = `ABSTRACK — Block #${blockNumber}`;
  const description =
    "A rhythm sequencer generated from real Abstract block activity.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default function PlayPage(props: PlayPageProps) {
  return <PlayPageClient {...props} />;
}
