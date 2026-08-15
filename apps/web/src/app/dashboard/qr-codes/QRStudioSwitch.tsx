"use client"

// Aiguillage QR Studio : ancien (défaut, SSR préservé) vs nouveau shell « zéro scroll » (opt-in via ?zero=1).
// Rendu par défaut = QRStudio → aucun flash ni régression pour l'utilisateur normal ; bascule uniquement
// côté client quand le flag est actif (chemin de preview du propriétaire).
import { useEffect, useState } from "react"
import QRStudio, { type QRCode } from "./QRStudio"
import QRStudioZero from "./QRStudioZero"
import { qrStudioZeroEnabled } from "./qrStudioFlags"

type Props = { qrCodes: QRCode[]; userPlan: string; appUrl: string }

export default function QRStudioSwitch(props: Props) {
  const [zero, setZero] = useState(false)
  useEffect(() => { if (qrStudioZeroEnabled()) setZero(true) }, [])
  return zero ? <QRStudioZero {...props} /> : <QRStudio {...props} />
}
