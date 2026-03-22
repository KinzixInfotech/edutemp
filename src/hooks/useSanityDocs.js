import { useQuery } from "@tanstack/react-query";
import { client } from "@/sanity/client";

// ─── GROQ Queries ───

const CATEGORIES_WITH_DOCS_QUERY = `
  *[_type == "docsCategory"] | order(order asc) {
    _id,
    title,
    "slug": slug.current,
    icon,
    color,
    order,
    "docs": *[_type == "docs" && references(^._id)] | order(order asc) {
      _id,
      title,
      "slug": slug.current,
      subtitle,
      order
    }
  }
`;

const DOC_BY_SLUG_QUERY = `
  *[_type == "docs" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    subtitle,
    description,
    tags,
    metaTitle,
    metaDescription,
    category->{
      _id,
      title,
      "slug": slug.current,
      icon,
      color
    },
    keyFeatures {
      sectionTitle,
      features[] {
        title,
        description,
        icon
      }
    },
    body[] {
      ...,
      _type == "image" => {
        ...,
        asset->
      },
      markDefs[] {
        ...,
        _type == "internalLink" => {
          "slug": reference->slug.current,
          "title": reference->title
        }
      }
    }
  }
`;

const ALL_DOCS_SEARCH_QUERY = `
  *[_type == "docs" && defined(slug.current)] | order(order asc) {
    _id,
    title,
    "slug": slug.current,
    subtitle,
    description,
    tags,
    "categoryTitle": category->title,
    "categorySlug": category->slug.current,
    "categoryIcon": category->icon,
    "featureTitles": keyFeatures.features[].title
  }
`;

// ─── Hooks ───

/**
 * Fetch all categories with their nested docs for sidebar navigation
 */
export function useDocsCategories() {
  return useQuery({
    queryKey: ["sanity", "docsCategories"],
    queryFn: () => client.fetch(CATEGORIES_WITH_DOCS_QUERY),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch a single doc page by slug
 */
export function useDocBySlug(slug) {
  return useQuery({
    queryKey: ["sanity", "doc", slug],
    queryFn: () => client.fetch(DOC_BY_SLUG_QUERY, { slug }),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch all docs for client-side search (title, subtitle, description, tags, features)
 */
export function useDocsSearch() {
  return useQuery({
    queryKey: ["sanity", "docsSearch"],
    queryFn: () => client.fetch(ALL_DOCS_SEARCH_QUERY),
    staleTime: 10 * 60 * 1000,
  });
}
