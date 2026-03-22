import { createClient } from "@sanity/client";
import { redirect } from "next/navigation";

const serverClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-01-01",
  useCdn: true,
});

export const metadata = {
  title: "Features Documentation | EduBreezy",
  description:
    "Explore all EduBreezy ERP features — student management, fee management, attendance, timetable, and more.",
  keywords:
    "EduBreezy, school ERP, school management software, features, documentation",
};

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
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-400 mb-2">
          No documentation yet
        </h1>
        <p className="text-gray-400">
          Add docs in Sanity Studio to get started.
        </p>
      </div>
    </div>
  );
}
