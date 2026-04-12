// app/features/docs/page.tsx  (Server Component)
import { createClient } from "@sanity/client";
import DocsRedirector from './DocsRedirector';

const serverClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-01-01",
  useCdn: false,
});

export const metadata = {
  title: "Features Documentation | EduBreezy",
  description:
    "Explore all EduBreezy ERP features — student management, fee management, attendance, timetable, and more.",
  keywords:
    "EduBreezy, school ERP, school management software, features, documentation",
};

export default async function DocsIndexPage() {
  const firstDoc = await serverClient.fetch(
    `*[_type == "docsCategory"] | order(order asc) [0] {
      "firstSlug": *[_type == "docs" && references(^._id)] | order(order asc) [0].slug.current
    }`
  );

  return <DocsRedirector slug={firstDoc?.firstSlug ?? null} />;
}