import { createClient } from "@sanity/client";
import { Loader2 } from "lucide-react";
import { redirect } from "next/navigation";

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
function DocsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
    </div>
  );
}
export default async function DocsIndexPage() {
  // Fetch first doc slug and redirect to it
  const firstDoc = await serverClient.fetch(
    `*[_type == "docsCategory"] | order(order asc) [0] {
      "firstSlug": *[_type == "docs" && references(^._id)] | order(order asc) [0].slug.current
    }`
  );

  if (firstDoc?.firstSlug) {
    redirect(`/features/docs/${firstDoc.firstSlug}`);
  }

  // Fallback — show empty state if no docs exist yet
  return (
    <div>
      <DocsLoading />
    </div>
  );
}
