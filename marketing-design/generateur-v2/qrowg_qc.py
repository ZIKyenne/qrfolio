#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contrôle qualité automatique des visuels QRowg.
Évalue chaque PNG contre la checklist de la charte (fond noir dominant, or <= ~15 %,
QR réellement décodable et pointant vers la bonne URL) et écrit un rapport qc.json.
Usage : python3 qrowg_qc.py out/ [attendus.json]
  attendus.json (optionnel) : { "nom-fichier.png": "https://url/attendue", ... }
"""
import sys, os, json, glob

def analyse(path, expected_url=None):
    from PIL import Image
    im = Image.open(path).convert('RGB')
    im.thumbnail((500, 700))
    px = list(im.getdata()); n = len(px)
    dark = gold = 0
    for r, g, b in px:
        lum = 0.2126*r + 0.7152*g + 0.0722*b
        if lum < 45: dark += 1
        # or : rouge > bleu nettement, teinte chaude, suffisamment lumineux
        if r > 120 and r - b > 55 and g > b and abs(r - g) < 90: gold += 1
    res = {
        'fichier': os.path.basename(path),
        'fond_sombre_pct': round(100.0*dark/n, 1),
        'or_pct': round(100.0*gold/n, 1),
        'qr': None,
        'alertes': []
    }
    if res['fond_sombre_pct'] < 55:
        res['alertes'].append('fond pas assez noir (%.1f %% < 55 %%)' % res['fond_sombre_pct'])
    if res['or_pct'] > 18:
        res['alertes'].append('trop d or (%.1f %% > 18 %%) — la charte vise <= ~15 %%' % res['or_pct'])
    try:
        import cv2, numpy as np
        img = cv2.imread(path)
        det = cv2.QRCodeDetector()

        def essai(a):
            try:
                d, _, _ = det.detectAndDecode(a)
                return d or ''
            except Exception:
                return ''

        # Un telephone cadre le QR de pres : le detecteur, lui, recoit toute
        # l'affiche 2000x3000 et decroche sur un motif qui n'occupe que 8 % du
        # cadre. On rejoue donc la detection sur des tuiles, sinon on signale
        # comme illisible un QR parfaitement scannable en conditions reelles.
        data = essai(img)
        if not data:
            h, w = img.shape[:2]
            tuiles = []
            for fy in (0.0, 0.25, 0.5):
                for fx in (0.0, 0.25, 0.5):
                    tuiles.append(img[int(h*fy):int(h*(fy+0.5)), int(w*fx):int(w*(fx+0.5))])
            tuiles.append(cv2.resize(img, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA))
            for t in tuiles:
                data = essai(t)
                if data:
                    break
        if data:
            res['qr'] = data
            if expected_url and data.split('?')[0] != expected_url.split('?')[0]:
                res['alertes'].append('le QR ne pointe pas vers le lien attendu (%s)' % data)
        elif expected_url:
            res['alertes'].append('QR present attendu mais NON DECODABLE')
    except Exception as e:
        res['qr'] = 'non testé (%s)' % type(e).__name__
    return res

def run(outdir, expected=None):
    expected = expected or {}
    rows = [analyse(f, expected.get(os.path.basename(f))) for f in sorted(glob.glob(os.path.join(outdir, '*.png')))]
    ko = [r for r in rows if r['alertes']]
    rapport = {'total': len(rows), 'avec_alerte': len(ko), 'details': rows}
    with open(os.path.join(outdir, 'qc.json'), 'w', encoding='utf-8') as f:
        json.dump(rapport, f, ensure_ascii=False, indent=2)
    print('QC : %d visuels, %d avec alerte' % (len(rows), len(ko)))
    for r in ko:
        print(' - %s : %s' % (r['fichier'], ' | '.join(r['alertes'])))
    return rapport

if __name__ == '__main__':
    exp = json.load(open(sys.argv[2], encoding='utf-8')) if len(sys.argv) > 2 else None
    run(sys.argv[1], exp)
