﻿// app/api/reports/unsubscribe/route.ts
// Désabonnement one-click depuis le lien email

import crypto from "node:crypto"
import { createAdminClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user")
  const freq   = req.nextUrl.searchParams.get("freq")
  const token  = req.nextUrl.searchParams.get("token")

  if (!userId || !freq || !token) {
    return new NextResponse("Lien invalide", { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Vérifier que le token correspond bien à l'ID de l'abonnement
    const { data: sub } = await supabase
      .from("report_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("frequency", freq)
      .single()

    if (!sub) {
      return new NextResponse("Abonnement introuvable", { status: 404 })
    }

    const expectedToken = Buffer.from(sub.id).toString("base64url")
    const actual = crypto.createHash('sha256').update(token).digest()
    const expected = crypto.createHash('sha256').update(expectedToken).digest()
    if (!crypto.timingSafeEqual(actual, expected)) {
      return new NextResponse("Token invalide", { status: 401 })
    }

    await supabase
      .from("report_subscriptions")
      .update({ enabled: false })
      .eq("id", sub.id)

    // Rediriger vers une page de confirmation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://qrowg.com"
    return NextResponse.redirect(`${appUrl}/unsubscribed?type=report`)
  } catch (err: any) {
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}
