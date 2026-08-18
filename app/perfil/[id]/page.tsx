import { ProfilePageClient } from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

export default function PerfilPublicPage({
  params,
}: {
  params: { id: string };
}) {
  return <ProfilePageClient userId={params.id} />;
}
