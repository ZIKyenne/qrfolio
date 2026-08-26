"use client"
// L'îlot interactif du calculateur. Aucun appel réseau : tout est du calcul.
import { useMemo, useState, type CSSProperties } from "react"
import { calculerTaille, distanceMaximaleCm, modulesDeLaVersion, versionPourContenu, SUPPORTS } from "./taille"

const G = "#C9A84C", INK = "#F5F0E8", MUT = "rgba(138,132,120,0.9)", BOR = "rgba(201,168,76,0.18)"

const CONTENUS = [
  { cle: "court", nom: "Une adresse courte", exemple: "qrowg.com/marcel", caracteres: 24 },
  { cle: "moyen", nom: "Une adresse longue", exemple: "un lien avec des paramètres de suivi", caracteres: 110 },
  { cle: "long", nom: "Un texte ou une fiche contact", exemple: "vCard, réseau WiFi, message", caracteres: 300 },
]

const cm = (mm: number) => `${Math.round(mm) / 10} cm`.replace(".", ",")

export default function TailleClient() {
  const [supportCle, setSupportCle] = useState("menu")
  const [contenuCle, setContenuCle] = useState("court")
  const [distance, setDistance] = useState<number>(30)
  const [libre, setLibre] = useState(false)

  const contenu = CONTENUS.find(c => c.cle === contenuCle) || CONTENUS[0]
  const modules = useMemo(() => modulesDeLaVersion(versionPourContenu(contenu.caracteres)), [contenu])
  const d = libre ? distance : (SUPPORTS.find(s => s.cle === supportCle)?.distanceCm ?? 30)
  const calcul = useMemo(() => calculerTaille(d, modules), [d, modules])

  const champ: CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${BOR}`, color: INK,
    borderRadius: 11, padding: "11px 13px", fontSize: 14.5, fontFamily: "inherit", appearance: "none",
  }
  const label: CSSProperties = { color: MUT, fontSize: 12.5, fontWeight: 700, display: "block", marginBottom: 7 }
  const carte: CSSProperties = { background: "rgba(255,255,255,0.025)", border: `1px solid ${BOR}`, borderRadius: 18, padding: 20 }
  const pastille: CSSProperties = { background: "rgba(255,255,255,0.04)", border: `1px solid ${BOR}`, borderRadius: 10, padding: "8px 13px", color: MUT, fontSize: 12.5 }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ ...carte, display: "grid", gap: 16 }}>
        <div>
          <label htmlFor="support" style={label}>Où le code sera-t-il posé ?</label>
          <select
            id="support" style={champ} value={libre ? "libre" : supportCle}
            onChange={e => {
              if (e.target.value === "libre") { setLibre(true); return }
              setLibre(false); setSupportCle(e.target.value)
            }}
          >
            {SUPPORTS.map(s => (
              <option key={s.cle} value={s.cle} style={{ background: "#101010" }}>
                {s.nom} — on le scanne à {s.distanceCm} cm
              </option>
            ))}
            <option value="libre" style={{ background: "#101010" }}>Autre — je donne la distance</option>
          </select>
          {!libre && (
            <p style={{ color: MUT, fontSize: 12.5, margin: "8px 0 0" }}>
              {SUPPORTS.find(s => s.cle === supportCle)?.note}
            </p>
          )}
        </div>

        {libre && (
          <div>
            <label htmlFor="distance" style={label}>À quelle distance le scanne-t-on ? ({d} cm)</label>
            <input
              id="distance" type="range" min={10} max={500} step={5} value={distance}
              onChange={e => setDistance(Number(e.target.value))}
              style={{ width: "100%", accentColor: G }}
            />
          </div>
        )}

        <div>
          <label htmlFor="contenu" style={label}>Que contient le code ?</label>
          <select id="contenu" style={champ} value={contenuCle} onChange={e => setContenuCle(e.target.value)}>
            {CONTENUS.map(c => (
              <option key={c.cle} value={c.cle} style={{ background: "#101010" }}>{c.nom} — {c.exemple}</option>
            ))}
          </select>
          <p style={{ color: MUT, fontSize: 12.5, margin: "8px 0 0" }}>
            Plus le contenu est long, plus le code a de carrés, et plus il doit être imprimé grand.
          </p>
        </div>
      </div>

      <div style={{ ...carte, background: "radial-gradient(120% 90% at 50% 0%, rgba(201,168,76,0.12), transparent 60%), rgba(255,255,255,0.03)", textAlign: "center" }}>
        <p style={{ color: MUT, fontSize: 12.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>Côté minimal conseillé</p>
        <p style={{ color: G, fontSize: "clamp(40px,9vw,62px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "8px 0 4px", lineHeight: 1 }}>
          {cm(calcul.coteMm)}
        </p>
        <p style={{ color: INK, fontSize: 14.5, margin: "0 0 14px" }}>
          soit un carré de {cm(calcul.coteMm)} sur {cm(calcul.coteMm)}
        </p>
        <p style={{ color: MUT, fontSize: 13.5, lineHeight: 1.65, margin: "0 auto", maxWidth: 460 }}>
          {calcul.explication}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
          <span style={pastille}>{calcul.modules} carrés de côté</span>
          <span style={pastille}>chaque carré : {String(calcul.moduleMm).replace(".", ",")} mm</span>
          <span style={pastille}>se lit jusqu&apos;à {distanceMaximaleCm(calcul.coteMm)} cm</span>
        </div>
      </div>

      <p style={{ color: MUT, fontSize: 13, lineHeight: 1.7, margin: 0, textAlign: "center" }}>
        Ajoutez une marge blanche tout autour, large d&apos;environ quatre carrés — c&apos;est à peu près
        l&apos;épaisseur d&apos;un des trois grands carrés d&apos;angle. Puis imprimez un exemplaire et scannez-le
        vraiment : aucun calcul ne connaît votre encre ni votre papier.
      </p>
    </div>
  )
}
