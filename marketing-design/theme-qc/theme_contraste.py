#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contrôle de contraste d'un thème QRfolio (PageTheme).

La skill theme-creator demande de vérifier les ratios sans fournir de quoi les
calculer : un thème illisible peut donc partir en production. Ce script tranche.

Usage :
    python3 theme_contraste.py theme.json            # un thème
    python3 theme_contraste.py lot.json              # une liste, ou un objet PRESET_THEMES
    python3 theme_contraste.py theme.json --strict   # sort en code 1 si un seuil échoue

Seuils (repris de la skill) :
    text / bg        >= 7.0     (AAA corps de texte)
    muted / bg       >= 4.5     (AA)
    text / surface   >= 7.0
    accent / bg      >= 3.0     (élément non textuel : bordure, icône, filet)
    primary / surface>= 3.0
Si effects.glass est vrai, les seuils sur `surface` sont durcis de +1.0 : une surface
translucide laisse remonter le fond et perd du contraste réel.
"""
import sys, json

def _srgb(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

def luminance(hexa):
    h = str(hexa).strip().lstrip('#')
    if len(h) == 3:
        h = ''.join(ch * 2 for ch in h)
    if len(h) != 6:
        raise ValueError('couleur invalide : %r' % hexa)
    r, g, b = (int(h[i:i+2], 16) for i in (0, 2, 4))
    return 0.2126*_srgb(r) + 0.7152*_srgb(g) + 0.0722*_srgb(b)

def ratio(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

PAIRES = [
    ('text',    'bg',      7.0, 'texte principal sur le fond'),
    ('muted',   'bg',      4.5, 'texte secondaire sur le fond'),
    ('text',    'surface', 7.0, 'texte principal sur les cartes'),
    ('accent',  'bg',      3.0, 'accent sur le fond (bordures, icônes)'),
    ('primary', 'surface', 3.0, 'couleur de marque sur les cartes'),
]

def controle(theme):
    nom = theme.get('name') or theme.get('key') or 'sans nom'
    glass = bool((theme.get('effects') or {}).get('glass'))
    lignes, echecs = [], 0
    for a, b, seuil, libelle in PAIRES:
        if a not in theme or b not in theme:
            continue
        s = seuil + (1.0 if (glass and b == 'surface') else 0.0)
        try:
            r = ratio(theme[a], theme[b])
        except ValueError as e:
            lignes.append(('ERREUR', libelle, str(e), '')); echecs += 1; continue
        ok = r >= s
        if not ok:
            echecs += 1
        lignes.append(('OK ' if ok else 'ÉCHEC', libelle, '%.2f:1' % r, 'seuil %.1f' % s))
    return {'nom': nom, 'glass': glass, 'echecs': echecs, 'lignes': lignes}

def charger(path):
    d = json.load(open(path, encoding='utf-8'))
    if isinstance(d, list):
        return d
    if isinstance(d, dict) and 'bg' in d and 'text' in d:
        return [d]
    # objet façon PRESET_THEMES : { cle: theme, ... }
    out = []
    for k, v in d.items():
        if isinstance(v, dict):
            v = dict(v); v.setdefault('key', k); out.append(v)
    return out

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    strict = '--strict' in sys.argv
    total = 0
    for t in charger(args[0]):
        r = controle(t)
        total += r['echecs']
        etat = 'CONFORME' if r['echecs'] == 0 else '%d PROBLÈME(S)' % r['echecs']
        print('\n%s — %s%s' % (r['nom'], etat, '  [glass : seuils durcis]' if r['glass'] else ''))
        for st, libelle, val, note in r['lignes']:
            print('  %-6s %-38s %-9s %s' % (st, libelle, val, note))
    print('\nTotal : %d contrôle(s) en échec.' % total)
    if strict and total:
        sys.exit(1)

if __name__ == '__main__':
    main()
