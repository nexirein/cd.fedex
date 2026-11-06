import { Topbar } from "@/components/layout/Topbar";
import { getSessionProfile } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import { TemplatesManager } from "./TemplatesManager";

export default async function AdminTemplatesPage() {
  const { profile } = await getSessionProfile();
  if (profile?.role !== "ADMIN") redirect("/");
  return (
    <>
      <Topbar title="Pre-Alert Templates & Default Docs" subtitle="Configure NFBRK/FEBRK email templates, required docs, process, and default files shown in the customer secure link" />
      <main className="p-6">
        <TemplatesManager />
      </main>
    </>
  );
}
