import OrganizationProfileClient from "./OrganizationProfileClient";

export default function OrganizationProfilePage({
  params,
}: {
  params: { slug: string };
}) {
  return <OrganizationProfileClient slug={params.slug} />;
}
