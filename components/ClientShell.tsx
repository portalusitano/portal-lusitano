"use client";

import dynamic from "next/dynamic";

const SmoothScroll = dynamic(() => import("@/components/SmoothScroll"), { ssr: false });
const RouteProgressBar = dynamic(() => import("@/components/RouteProgressBar"), { ssr: false });

export default function ClientShell() {
  return (
    <>
      <RouteProgressBar />
      <SmoothScroll />
    </>
  );
}
