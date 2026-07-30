"use client";
import { FleetDataProvider } from "@/lib/FleetDataContext";
import { Shell } from "@/components/Shell";

export default function MainLayout({ children }) {
  return (
    <FleetDataProvider>
      <Shell>{children}</Shell>
    </FleetDataProvider>
  );
}
