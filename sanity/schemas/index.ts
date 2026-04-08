// ============================================
// SANITY SCHEMAS — Create these in Sanity Studio
// Export as reference for Sanity project setup
// ============================================

// To use: Create a Sanity project at sanity.io, then add
// these schema definitions to your sanity/schemaTypes folder.

export const bannerSchema = {
  name: "banner",
  title: "Banner",
  type: "document",
  fields: [
    { name: "title", title: "Title", type: "string", validation: (r: any) => r.required() },
    { name: "subtitle", title: "Subtitle", type: "string" },
    { name: "image", title: "Image", type: "image", options: { hotspot: true } },
    { name: "link", title: "Link URL", type: "url" },
    { name: "sortOrder", title: "Sort Order", type: "number", initialValue: 0 },
    { name: "isActive", title: "Active", type: "boolean", initialValue: true },
  ],
};

export const homepageSchema = {
  name: "homepage",
  title: "Homepage",
  type: "document",
  fields: [
    { name: "heroTitle", title: "Hero Title", type: "string" },
    { name: "heroSubtitle", title: "Hero Subtitle", type: "text", rows: 2 },
    { name: "heroImage", title: "Hero Image", type: "image", options: { hotspot: true } },
    {
      name: "featuredBanners",
      title: "Featured Banners",
      type: "array",
      of: [{ type: "reference", to: [{ type: "banner" }] }],
    },
    {
      name: "featuredCategories",
      title: "Featured Categories",
      type: "array",
      of: [{ type: "reference", to: [{ type: "category" }] }],
    },
  ],
};

export const categorySchema = {
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    { name: "title", title: "Title", type: "string", validation: (r: any) => r.required() },
    { name: "slug", title: "Slug", type: "slug", options: { source: "title" } },
    { name: "image", title: "Image", type: "image", options: { hotspot: true } },
    { name: "description", title: "Description", type: "text" },
  ],
};

export const pageSchema = {
  name: "page",
  title: "Page",
  type: "document",
  fields: [
    { name: "title", title: "Title", type: "string" },
    { name: "slug", title: "Slug", type: "slug", options: { source: "title" } },
    { name: "body", title: "Body", type: "array", of: [{ type: "block" }] },
    {
      name: "seo",
      title: "SEO",
      type: "object",
      fields: [
        { name: "metaTitle", title: "Meta Title", type: "string" },
        { name: "metaDescription", title: "Meta Description", type: "text", rows: 2 },
      ],
    },
  ],
};
