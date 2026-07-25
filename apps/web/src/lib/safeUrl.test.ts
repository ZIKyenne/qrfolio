import { describe, it, expect } from "vitest"
import { isPublicHttpUrl } from "./safeUrl"

describe("isPublicHttpUrl (garde anti-SSRF)", () => {
  it("accepte les URLs http(s) publiques", () => {
    expect(isPublicHttpUrl("https://images.unsplash.com/photo.jpg")).toBe(true)
    expect(isPublicHttpUrl("https://xyz.supabase.co/storage/v1/avatar.png")).toBe(true)
    expect(isPublicHttpUrl("http://example.com/a.png")).toBe(true)
    expect(isPublicHttpUrl("https://8.8.8.8/x.png")).toBe(true)
  })

  it("rejette les schémas non http(s)", () => {
    expect(isPublicHttpUrl("file:///etc/passwd")).toBe(false)
    expect(isPublicHttpUrl("gopher://x")).toBe(false)
    expect(isPublicHttpUrl("data:image/png;base64,AAAA")).toBe(false)
    expect(isPublicHttpUrl("javascript:alert(1)")).toBe(false)
    expect(isPublicHttpUrl("pas une url")).toBe(false)
  })

  it("bloque localhost et TLD internes", () => {
    expect(isPublicHttpUrl("http://localhost/x")).toBe(false)
    expect(isPublicHttpUrl("http://api.localhost/x")).toBe(false)
    expect(isPublicHttpUrl("http://printer.local/x")).toBe(false)
    expect(isPublicHttpUrl("http://svc.internal/x")).toBe(false)
    expect(isPublicHttpUrl("http://metadata.google.internal/x")).toBe(false)
  })

  it("bloque les IPv4 privées / réservées / métadonnées", () => {
    expect(isPublicHttpUrl("http://127.0.0.1/x")).toBe(false)
    expect(isPublicHttpUrl("http://10.0.0.5/x")).toBe(false)
    expect(isPublicHttpUrl("http://192.168.1.1/x")).toBe(false)
    expect(isPublicHttpUrl("http://172.16.0.1/x")).toBe(false)
    expect(isPublicHttpUrl("http://172.31.255.255/x")).toBe(false)
    expect(isPublicHttpUrl("http://169.254.169.254/latest/meta-data/")).toBe(false)
    expect(isPublicHttpUrl("http://100.100.0.1/x")).toBe(false)
    expect(isPublicHttpUrl("http://0.0.0.0/x")).toBe(false)
  })

  it("bloque les IPv6 locaux et IPv4-mappées privées", () => {
    expect(isPublicHttpUrl("http://[::1]/x")).toBe(false)
    expect(isPublicHttpUrl("http://[fd00::1]/x")).toBe(false)
    expect(isPublicHttpUrl("http://[::ffff:169.254.169.254]/x")).toBe(false)
  })

  it("laisse passer 172.32 (hors plage privée)", () => {
    expect(isPublicHttpUrl("http://172.32.0.1/x")).toBe(true)
  })
})
