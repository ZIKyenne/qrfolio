#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Générateur de visuels QRowg — charte officielle (noir profond + or contrôlé + QR héro).
Rend carrousels + épingles en PNG. Palette et règles = Guide identité visuelle QRowg."""
import sys, os, json, re, html, subprocess, tempfile, unicodedata, io

def slugify(s, fallback='qrowg'):
    s=unicodedata.normalize('NFKD',str(s)).encode('ascii','ignore').decode().lower()
    s=re.sub(r'[^a-z0-9]+','-',s).strip('-')
    return (s[:70] or fallback)

DIR = os.path.dirname(os.path.abspath(__file__))
def _b64(name):
    p=os.path.join(DIR,'assets',name)
    try: return open(p).read().strip()
    except: return ''
LOGO=_b64('logo_badge.b64'); QR=_b64('qr_gold.b64')
ARCHIVO=_b64('archivo_var.b64'); MANROPE=_b64('manrope_var.b64')

# Polices EMBARQUÉES (Google Fonts est bloqué dans l'environnement cloud/cron :
# on n'utilise plus @import réseau, on injecte les woff2 en base64 → rendu déterministe).
_FONT_FACES = (
  (f"@font-face{{font-family:'Archivo';font-style:normal;font-weight:100 900;"
   f"font-display:block;src:url(data:font/woff2;base64,{ARCHIVO}) format('woff2');}}" if ARCHIVO else "")
  + (f"@font-face{{font-family:'Manrope',system-ui,sans-serif;font-style:normal;font-weight:200 800;"
     f"font-display:block;src:url(data:font/woff2;base64,{MANROPE}) format('woff2');}}" if MANROPE else "")
)

# Palette officielle
BRAND_CSS = _FONT_FACES + """
:root{--noir:#080A08;--panel:#101310;--elev:#151814;--gold:#D4AF45;--gold2:#B8922F;
  --ivory:#F4F1E8;--warm:#A7A69F;--red:#A5122A;--hair:rgba(212,175,69,.22);}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%}
.stage{position:relative;width:100%;height:100%;overflow:hidden;color:var(--ivory);
  font-family:'Manrope',system-ui,sans-serif;background:var(--noir);}
.qtex{position:absolute;inset:0;opacity:.5;
  background-image:linear-gradient(rgba(212,175,69,.045) 1px,transparent 1px),
    linear-gradient(90deg,rgba(212,175,69,.045) 1px,transparent 1px);
  background-size:38px 38px;mask-image:radial-gradient(120% 90% at 50% 40%,#000 55%,transparent);}
.glow{position:absolute;border-radius:50%;filter:blur(30px);pointer-events:none;}
.vig{position:absolute;inset:0;box-shadow:inset 0 0 360px 80px rgba(0,0,0,.6);pointer-events:none;}
.badge{position:absolute;display:flex;align-items:center;gap:.55em;}
.badge img{border-radius:24%;box-shadow:0 0 0 1.5px rgba(212,175,69,.5);}
.badge .wm{font-family:'Manrope',system-ui,sans-serif;font-weight:800;letter-spacing:.24em;color:var(--ivory);}
.gold{color:var(--gold);}
.ey{display:inline-flex;align-items:center;gap:.65em;font-family:'Manrope',system-ui,sans-serif;font-weight:800;
  letter-spacing:.3em;text-transform:uppercase;color:var(--gold);}
.ey .bar{width:46px;height:2px;background:linear-gradient(90deg,var(--gold),transparent);}
.head{font-family:'Archivo','Arial Narrow',Arial,sans-serif;font-weight:900;text-transform:uppercase;line-height:.98;letter-spacing:-.005em;color:var(--ivory);}
.sub{font-family:'Manrope',system-ui,sans-serif;font-weight:500;color:var(--warm);}
.rule{position:absolute;height:2px;background:linear-gradient(90deg,var(--gold),transparent);}
.idx{position:absolute;font-family:'Archivo',Arial,sans-serif;font-weight:800;color:#4a463a;letter-spacing:.05em;}
.center{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;}
.cta{display:inline-flex;align-items:center;gap:.5em;font-family:'Manrope',system-ui,sans-serif;font-weight:800;color:var(--noir);
  background:linear-gradient(120deg,var(--gold),var(--gold2));border-radius:12px;letter-spacing:.01em;}
/* QR héro */
.qrwrap{position:relative;align-self:center;}
.qrwrap .g{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border-radius:50%;
  background:radial-gradient(circle,rgba(212,175,69,.28),transparent 62%);filter:blur(26px);}
.qrwrap img{position:relative;display:block;}
.brk{position:absolute;width:54px;height:54px;border:3px solid var(--gold);}
.metric{font-family:'Archivo','Arial Narrow',Arial,sans-serif;font-weight:900;color:var(--gold);line-height:.9;letter-spacing:-.02em;}
"""


# ============ AJOUTS v2 : QR réel tracké, autosize, accent secteur, variantes ============
import base64 as _b64mod, hashlib as _hl
_QRCACHE={}
def make_qr_b64(url, target_px=600):
    """VRAI QR **scannable** : modules SOMBRES sur plaque OR.

    Deux pieges evites ici :
    1) Un QR aux modules or sur fond noir (polarite inversee + contraste
       insuffisant) n'est PAS decode par les lecteurs. Seule combinaison a la fois
       conforme a la charte et lisible : modules #080A08 sur plaque #D4AF45.
    2) Une URL longue (lien profond + UTM) produit un QR de version elevee, dont
       les modules deviennent flous s'il faut le RETRECIR a l'affichage. On genere
       donc l'image a la resolution finale exacte (target_px, en pixels ecran),
       en calant box_size sur le nombre de modules : plus aucune reduction.
    """
    key = (url or '__default__', int(target_px))
    if key in _QRCACHE: return _QRCACHE[key]
    target = url or 'https://qrowg.com'
    try:
        import qrcode
        q=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=3)
        q.add_data(target); q.make(fit=True)
        modules = len(q.get_matrix())          # inclut deja la marge
        box = max(4, int(round(target_px / float(modules))))
        q.box_size = box
        img=q.make_image(fill_color='#080A08', back_color='#D4AF45').convert('RGB')
        buf=io.BytesIO(); img.save(buf,'PNG')
        out=_b64mod.b64encode(buf.getvalue()).decode()
    except Exception:
        out=QR
    _QRCACHE[key]=out
    return out

def _plain(t):
    return re.sub(r'\[\[(.*?)\]\]', r'\1', str(t or ''))

def fit(text, base, ideal_chars, floor=0.58):
    """Réduit la taille du titre quand il est long (comme le Motion System).
    Retourne (px, warn_ratio)."""
    n=len(_plain(text))
    if n<=ideal_chars: return base, 1.0
    r=max(floor, ideal_chars/float(n))**0.72
    return int(base*r), r

SECTORS_RED={'restaurant','resto','bar','brasserie','pub','bistrot','pizzeria'}  # charte : resto/bar UNIQUEMENT
def sector_accent(sector):
    """Accent contextuel rouge métier #A5122A prévu par la charte (resto/bar UNIQUEMENT)."""
    return (str(sector or '').strip().lower() in SECTORS_RED)

def variant_of(slug, n):
    """Choix de composition déterministe (même slug -> même variante, mais slugs
    différents -> compositions différentes). Tue la monotonie visuelle."""
    return int(_hl.md5(str(slug).encode()).hexdigest(), 16) % n

def esc(t): return html.escape(t, quote=False)
def accentize(t):
    parts=re.split(r'(\[\[.*?\]\])',t); out=[]
    for p in parts:
        m=re.match(r'\[\[(.*?)\]\]',p)
        out.append('<span class="gold">%s</span>'%esc(m.group(1)) if m else esc(p))
    return ''.join(out).replace('\n','<br>')
def page(inner,extra=""): return f"""<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>{BRAND_CSS}{extra}</style></head><body>{inner}</body></html>"""
def badge(size,x,y):
    img=f'<img src="data:image/png;base64,{LOGO}" width="{size}" height="{size}">' if LOGO else ''
    return f'<div class="badge" style="top:{y}px;left:{x}px;">{img}<span class="wm" style="font-size:{int(size*0.42)}px;">QROWG</span></div>'
def qr_hero(px, glow=1.6, url=None):
    data = make_qr_b64(url, target_px=px*2)
    if not data: return ''
    g=int(px*glow); off=-16
    brackets=''.join([
        f'<div class="brk" style="left:{off}px;top:{off}px;border-right:0;border-bottom:0;"></div>',
        f'<div class="brk" style="right:{off}px;top:{off}px;border-left:0;border-bottom:0;"></div>',
        f'<div class="brk" style="left:{off}px;bottom:{off}px;border-right:0;border-top:0;"></div>',
        f'<div class="brk" style="right:{off}px;bottom:{off}px;border-left:0;border-top:0;"></div>'])
    return (f'<div class="qrwrap" style="width:{px}px;height:{px}px;">'
            f'<div class="g" style="width:{g}px;height:{g}px;"></div>'
            f'<img src="data:image/png;base64,{data}" width="{px}" height="{px}" '
            f'style="border-radius:{max(10,int(px*0.045))}px;image-rendering:pixelated;">{brackets}</div>')

# ---------- CARROUSEL 1080x1350 ----------
def carousel_slide_html(s):
    idx,total=s.get('index'),s.get('total')
    idxh=f'<div class="idx" style="right:64px;bottom:56px;font-size:40px;">{idx:02d}<span style="color:#2f2c22">/{total:02d}</span></div>' if idx else ''
    b=badge(74,64,60)
    tex='<div class="qtex"></div>'
    k=s['kind']
    _red=sector_accent(s.get('sector')); _acc='var(--red)' if _red else 'var(--gold)'
    _url=s.get('url')
    if k=='cover':
        glow='<div class="glow" style="width:760px;height:760px;right:-160px;top:-160px;background:radial-gradient(circle,rgba(212,175,69,.18),transparent 60%);"></div>'
        body=s.get('body','')
        bh=f'<div class="sub" style="margin-top:40px;font-size:41px;line-height:1.34;">{accentize(body)}</div>' if body else ''
        hint='<div class="ey" style="position:absolute;right:64px;bottom:118px;font-size:29px;">glisser <span class="gold">→</span></div>'
        inner=f"""<div class="stage">{tex}{glow}<div class="vig"></div>{b}
          <div class="center" style="padding:0 74px;">
            <div class="ey" style="font-size:29px;margin-bottom:36px;"><span class="bar"></span>{esc(s.get('tag','ASTUCE'))}</div>
            <div class="head" style="font-size:{fit(s['title'],108,30)[0]}px;">{accentize(s['title'])}</div>{bh}</div>{hint}</div>"""
        return page(inner)
    if k=='qr':
        cap=s.get('body','')
        inner=f"""<div class="stage">{tex}<div class="vig"></div>{b}
          <div class="center" style="padding:150px 74px 120px;justify-content:space-between;">
            <div><div class="ey" style="font-size:28px;margin-bottom:26px;"><span class="bar"></span>{esc(s.get('kicker','EN DIRECT'))}</div>
              <div class="head" style="font-size:{fit(s['title'],70,44)[0]}px;">{accentize(s['title'])}</div></div>
            {qr_hero(460,1.6,_url)}
            <div class="sub" style="font-size:38px;line-height:1.35;">{accentize(cap)}</div>
          </div>{idxh}</div>"""
        return page(inner)
    if k=='metric':
        if not s.get('number'):
            raise ValueError("slide metric sans champ 'number' : la charte interdit les chiffres inventes (pas de valeur par defaut).")
        inner=f"""<div class="stage">{tex}
          <div class="glow" style="width:620px;height:620px;left:50%;top:44%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(212,175,69,.16),transparent 62%);"></div>
          <div class="vig"></div>{b}
          <div class="center" style="padding:0 74px;align-items:flex-start;">
            <div class="ey" style="font-size:29px;margin-bottom:26px;"><span class="bar"></span>{esc(s.get('kicker','PREUVE'))}</div>
            <div class="metric" style="font-size:290px;color:{_acc};">{esc(s['number'])}</div>
            <div class="head" style="font-size:{fit(s['title'],66,44)[0]}px;margin-top:6px;">{accentize(s['title'])}</div>
            <div class="sub" style="margin-top:24px;font-size:40px;line-height:1.35;">{accentize(s.get('body',''))}</div>
          </div>{idxh}</div>"""
        return page(inner)
    if k=='cta':
        body=s.get('body','')
        qr = qr_hero(230,1.5,_url) if s.get('qr') else ''
        qblock=f'<div style="margin-top:52px;">{qr}</div>' if qr else ''
        inner=f"""<div class="stage">{tex}
          <div class="glow" style="width:560px;height:560px;left:50%;bottom:-160px;transform:translateX(-50%);background:radial-gradient(circle,rgba(212,175,69,.16),transparent 62%);"></div>
          <div class="vig"></div>{b}
          <div class="center" style="padding:0 74px;">
            <div class="head" style="font-size:{fit(s['title'],96,34)[0]}px;">{accentize(s['title'])}</div>
            <div class="sub" style="margin-top:34px;font-size:42px;line-height:1.34;">{accentize(body)}</div>
            <div class="cta" style="margin-top:54px;font-size:44px;padding:26px 52px;background:linear-gradient(120deg,{_acc},var(--gold2));">{esc(s.get('cta','qrowg.com'))} <span>→</span></div>{qblock}
          </div>{idxh}</div>"""
        return page(inner)
    # body (problème / fonctionnement) — 2 squelettes alternés.
    # Deux slides `body` dans un même carrousel (typiquement 02 et 04) ne doivent pas
    # etre typographiquement identiques : on alterne sur la parite de l'index.
    body=s.get('body','')
    ts=fit(s['title'],86,38)[0]
    pair = ((int(idx or 2) // 2) % 2 == 1)
    if pair:
        # variante 1 : kicker + titre a gauche + filet en bas
        kick=(f'<div class="ey" style="font-size:30px;margin-bottom:32px;color:{_acc};"><span class="bar" style="background:linear-gradient(90deg,{_acc},transparent);"></span>{esc(s.get("kicker",""))}</div>') if s.get('kicker') else ''
        inner=f"""<div class="stage">{tex}<div class="vig"></div>{b}
          <div class="center" style="padding:0 74px;">{kick}
            <div class="head" style="font-size:{ts}px;">{accentize(s['title'])}</div>
            <div class="sub" style="margin-top:30px;font-size:44px;line-height:1.38;">{accentize(body)}</div>
          </div><div class="rule" style="left:74px;bottom:70px;width:120px;background:linear-gradient(90deg,{_acc},transparent);"></div>{idxh}</div>"""
        return page(inner)
    # variante 2 : filet vertical d'accent, titre decale, pas de kicker, lueur basse
    kick=f'<div class="ey" style="font-size:28px;margin-bottom:26px;color:{_acc};">{esc(s.get("kicker",""))}</div>' if s.get('kicker') else ''
    inner=f"""<div class="stage">{tex}
      <div class="glow" style="width:560px;height:560px;left:-140px;bottom:-160px;background:radial-gradient(circle,rgba(212,175,69,.14),transparent 60%);"></div>
      <div class="vig"></div>{b}
      <div style="position:absolute;left:74px;top:330px;bottom:300px;width:5px;background:linear-gradient(180deg,{_acc},transparent);"></div>
      <div class="center" style="padding:0 74px 0 116px;">{kick}
        <div class="head" style="font-size:{ts}px;">{accentize(s['title'])}</div>
        <div class="sub" style="margin-top:30px;font-size:43px;line-height:1.38;">{accentize(body)}</div>
      </div>{idxh}</div>"""
    return page(inner)

# ---------- PINTEREST 1000x1500 — 4 COMPOSITIONS (anti-monotonie) ----------
def pin_html(p):
    """4 gabarits alternés de façon déterministe sur le slug : un feed Pinterest
    de 5 épingles ne montre plus 5 fois la même mise en page."""
    img=f'<img src="data:image/png;base64,{LOGO}" width="64" height="64" style="border-radius:24%;box-shadow:0 0 0 1.5px rgba(212,175,69,.5);">' if LOGO else ''
    tex='<div class="qtex"></div>'
    url=p.get('url')
    red=sector_accent(p.get('sector'))
    acc='var(--red)' if red else 'var(--gold)'
    v = p.get('layout') if p.get('layout') in (0,1,2,3) else variant_of(p.get('slug',''), 4)
    ts, ratio = fit(p['title'], 88, 34)
    title=f'<div class="head" style="font-size:{ts}px;">{accentize(p["title"])}</div>'
    subtxt=p.get('subtitle','')
    foot=(f'<div class="badge" style="left:60px;bottom:56px;">{img}<span class="wm" style="font-size:30px;">QROWG</span></div>'
          f'<div class="sub" style="position:absolute;right:60px;bottom:60px;font-size:30px;color:{acc};font-weight:700;">qrowg.com</div>')
    ey=f'<div class="ey" style="font-size:28px;margin-bottom:30px;color:{acc};"><span class="bar" style="background:linear-gradient(90deg,{acc},transparent);"></span>{esc(p.get("tag","IDÉE"))}</div>'

    if v==0:  # A — titre haut, QR ancré bas (compo d'origine, resserrée)
        sub=f'<div class="sub" style="margin-top:28px;font-size:39px;line-height:1.4;">{accentize(subtxt)}</div>' if subtxt else ''
        qr=f'<div style="margin-top:46px;align-self:center;">{qr_hero(300,1.5,url)}</div>' if p.get('qr') else ''
        inner=f"""<div class="stage">{tex}
          <div class="glow" style="width:640px;height:640px;right:-160px;top:-140px;background:radial-gradient(circle,rgba(212,175,69,.15),transparent 60%);"></div>
          <div class="vig"></div>
          <div class="center" style="padding:0 66px 130px;">{ey}{title}{sub}{qr}</div>{foot}</div>"""
        return page(inner)

    if v==1:  # B — QR EN HÉROS EN HAUT, texte en bas (inversion complète)
        sub=f'<div class="sub" style="margin-top:26px;font-size:38px;line-height:1.4;">{accentize(subtxt)}</div>' if subtxt else ''
        qr=f'<div style="align-self:center;margin-bottom:16px;">{qr_hero(330,1.7,url)}</div>' if p.get('qr') else ''
        inner=f"""<div class="stage">{tex}
          <div class="glow" style="width:700px;height:700px;left:50%;top:230px;transform:translateX(-50%);background:radial-gradient(circle,rgba(212,175,69,.17),transparent 62%);"></div>
          <div class="vig"></div>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-start;padding:150px 66px 0;">{qr}</div>
          <div style="position:absolute;left:0;right:0;bottom:150px;padding:0 66px;">{ey}{title}{sub}</div>{foot}</div>"""
        return page(inner)

    if v==2:  # C — bandeau chiffre / mot-clé encadré, texte à gauche, QR petit en coin
        sub=f'<div class="sub" style="margin-top:26px;font-size:37px;line-height:1.42;max-width:800px;">{accentize(subtxt)}</div>' if subtxt else ''
        qr=f'<div style="position:absolute;right:56px;top:120px;">{qr_hero(300,1.5,url)}</div>' if p.get('qr') else ''
        band=(f'<div style="position:absolute;left:0;right:0;top:0;height:14px;'
              f'background:linear-gradient(90deg,{acc},transparent 70%);"></div>')
        inner=f"""<div class="stage">{tex}{band}
          <div class="glow" style="width:560px;height:560px;left:-140px;bottom:-120px;background:radial-gradient(circle,rgba(212,175,69,.14),transparent 60%);"></div>
          <div class="vig"></div>{qr}
          <div class="center" style="padding:0 66px 130px;align-items:flex-start;">{ey}{title}{sub}
            <div class="rule" style="position:static;margin-top:44px;width:180px;background:linear-gradient(90deg,{acc},transparent);"></div>
          </div>{foot}</div>"""
        return page(inner)

    # D — carte panneau : le texte dans un bloc surélevé, QR dessous, très éditorial
    sub=f'<div class="sub" style="margin-top:24px;font-size:36px;line-height:1.42;">{accentize(subtxt)}</div>' if subtxt else ''
    qr=f'<div style="align-self:center;margin-top:48px;">{qr_hero(300,1.5,url)}</div>' if p.get("qr") else ''
    inner=f"""<div class="stage">{tex}
      <div class="glow" style="width:620px;height:620px;right:-150px;bottom:-150px;background:radial-gradient(circle,rgba(212,175,69,.15),transparent 60%);"></div>
      <div class="vig"></div>
      <div class="center" style="padding:0 56px 130px;">
        <div style="background:var(--panel);border:1px solid var(--hair);border-radius:22px;padding:56px 48px;">
          {ey}{title}{sub}
        </div>{qr}
      </div>{foot}</div>"""
    return page(inner)

# ---------- LINKEDIN 1200x1500 (éditorial) ----------
def linkedin_html(p):
    b=badge(70,72,64)
    qr=f'<div style="position:absolute;right:72px;bottom:150px;">{qr_hero(176,1.4)}</div>' if p.get('qr') else ''
    body=p.get('body','')
    bh=f'<div class="sub" style="margin-top:34px;font-size:38px;line-height:1.45;max-width:940px;">{accentize(body)}</div>' if body else ''
    inner=f"""<div class="stage"><div class="qtex"></div>
      <div class="glow" style="width:640px;height:640px;right:-180px;top:-170px;background:radial-gradient(circle,rgba(212,175,69,.12),transparent 60%);"></div>
      <div class="vig"></div>{b}
      <div class="center" style="padding:0 80px;">
        <div class="ey" style="font-size:26px;margin-bottom:30px;"><span class="bar"></span>{esc(p.get('tag','QROWG'))}</div>
        <div class="head" style="font-size:78px;">{accentize(p['title'])}</div>{bh}
      </div>
      <div class="sub" style="position:absolute;left:80px;bottom:64px;font-size:28px;color:var(--gold);font-weight:700;">qrowg.com</div>{qr}</div>"""
    return page(inner)

# ---------- X / TWITTER 1600x900 ----------
def x_html(p):
    img=f'<img src="data:image/png;base64,{LOGO}" width="58" height="58" style="border-radius:24%;box-shadow:0 0 0 1.5px rgba(212,175,69,.5);">' if LOGO else ''
    qr=f'<div style="position:absolute;right:110px;top:50%;transform:translateY(-50%);">{qr_hero(300,1.5)}</div>' if p.get('qr') else ''
    w='56%' if p.get('qr') else '82%'
    body=p.get('body','')
    bh=f'<div class="sub" style="margin-top:26px;font-size:36px;line-height:1.4;">{accentize(body)}</div>' if body else ''
    inner=f"""<div class="stage"><div class="qtex"></div>
      <div class="glow" style="width:560px;height:560px;left:-120px;bottom:-170px;background:radial-gradient(circle,rgba(212,175,69,.14),transparent 60%);"></div>
      <div class="vig"></div>
      <div class="badge" style="top:70px;left:90px;">{img}<span class="wm" style="font-size:28px;">QROWG</span></div>
      <div style="position:absolute;left:90px;top:0;bottom:0;width:{w};display:flex;flex-direction:column;justify-content:center;">
        <div class="ey" style="font-size:24px;margin-bottom:22px;"><span class="bar"></span>{esc(p.get('tag','QROWG'))}</div>
        <div class="head" style="font-size:84px;">{accentize(p['title'])}</div>{bh}
      </div>
      <div class="sub" style="position:absolute;left:90px;bottom:54px;font-size:26px;color:var(--gold);font-weight:700;">qrowg.com</div>{qr}</div>"""
    return page(inner)

def render_images(content, outdir):
    from playwright.sync_api import sync_playwright
    os.makedirs(outdir, exist_ok=True)
    manifest={'carousels':[], 'pins':[], 'linkedin':[], 'x':[]}
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path='/tmp/chrbin/chromium', args=['--no-sandbox','--disable-gpu','--force-color-profile=srgb'])
        def shot(h,w,ht,path):
            pg=b.new_page(viewport={'width':w,'height':ht}, device_scale_factor=2)
            pg.set_content(h, wait_until='load')
            try: pg.evaluate("async()=>{await document.fonts.ready}")
            except: pass
            pg.wait_for_timeout(400)
            pg.screenshot(path=path, clip={'x':0,'y':0,'width':w,'height':ht}); pg.close()
        used=set()
        for ci,car in enumerate(content.get('carousels',[]),1):
            slides=car['slides']; total=len(slides); files=[]
            base=slugify(car.get('slug') or f'qrowg-carrousel-{ci}')
            while base in used: base=f'{base}-{ci}'
            used.add(base)
            for si,s in enumerate(slides,1):
                s['index']=si; s['total']=total
                s.setdefault('url', car.get('url'))
                s.setdefault('sector', car.get('sector'))
                s.setdefault('slug', base)
                path=os.path.join(outdir,f'{base}-{si:02d}.png')
                shot(carousel_slide_html(s),1080,1350,path); files.append(path)
            manifest['carousels'].append(files)
        for pi,p in enumerate(content.get('pins',[]),1):
            base=slugify(p.get('slug') or p.get('title') or f'qrowg-epingle-{pi}')
            name=base
            while name in used: name=f'{base}-{pi}'
            used.add(name)
            path=os.path.join(outdir,f'{name}.png')
            shot(pin_html(p),1000,1500,path); manifest['pins'].append(path)
        for li,p in enumerate(content.get('linkedin',[]),1):
            base=slugify(p.get('slug') or p.get('title') or f'qrowg-linkedin-{li}')
            name=base
            while name in used: name=f'{base}-{li}'
            used.add(name)
            path=os.path.join(outdir,f'{name}.png')
            shot(linkedin_html(p),1200,1500,path); manifest['linkedin'].append(path)
        for xi,p in enumerate(content.get('x',[]),1):
            base=slugify(p.get('slug') or p.get('title') or f'qrowg-x-{xi}')
            name=base
            while name in used: name=f'{base}-{xi}'
            used.add(name)
            path=os.path.join(outdir,f'{name}.png')
            shot(x_html(p),1600,900,path); manifest['x'].append(path)
        b.close()
    return manifest

if __name__=='__main__':
    content=json.load(open(sys.argv[1],encoding='utf-8'))
    m=render_images(content, sys.argv[2] if len(sys.argv)>2 else 'out')
    print('images OK carrousels:%d pins:%d'%(len(m['carousels']),len(m['pins'])))
