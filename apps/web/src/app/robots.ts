import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /e2e-harness est déjà 404 en production ; on le bloque aussi côté robots
        // pour qu'aucune preview indexée n'expose des routes de test.
        disallow: ["/dashboard/", "/auth/", "/api/", "/e2e-harness/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
