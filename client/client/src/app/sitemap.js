import { brand } from "@/config/brand";

export default function sitemap() {
  return ["", "/products"].map((path) => ({
    url: new URL(path || "/", brand.url).href,
    changeFrequency: "weekly",
    priority: path ? 0.8 : 1,
  }));
}
