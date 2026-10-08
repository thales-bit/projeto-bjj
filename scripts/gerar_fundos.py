#!/usr/bin/env python3
"""Gera as versões em preto e branco (tom levemente esverdeado, como nas artes
do Battlefield) usadas como fundo: capa, faixa de fotos e blocos da equipe.
Rode de novo sempre que as fotos em fotos/ mudarem:
    python3 scripts/gerar_fundos.py"""
import glob, os
from PIL import Image, ImageOps, ImageEnhance

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOTOS = os.path.join(RAIZ, "fotos")
SAIDA = os.path.join(RAIZ, "img")

# Fotos de ação para o fundo da capa (paisagem funciona melhor)
CAPA = ["breno/03", "bernardo-martins/04", "miguel/04", "ravi/02", "breno/02"]
EXTRAS = {"equipe": "breno/02", "equipe-2": "ravi/02"}

def pb(im, brilho=1.0, contraste=1.25):
    g = ImageOps.grayscale(ImageOps.exif_transpose(im))
    g = ImageOps.autocontrast(g, cutoff=1)
    g = ImageEnhance.Contrast(g).enhance(contraste)
    g = ImageEnhance.Brightness(g).enhance(brilho)
    return ImageOps.colorize(g, black=(3, 6, 3), mid=(104, 112, 102), white=(238, 246, 234))

def salvar(im, caminho, largura=None, altura=None, q=70):
    if largura and im.width > largura:
        im = im.resize((largura, round(im.height * largura / im.width)), Image.LANCZOS)
    if altura and im.height > altura:
        im = im.resize((round(im.width * altura / im.height), altura), Image.LANCZOS)
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    im.save(caminho, "JPEG", quality=q, optimize=True, progressive=True)
    return im.size

for i, f in enumerate(CAPA, 1):
    s = salvar(pb(Image.open(f"{FOTOS}/{f}.jpg"), brilho=.8), f"{SAIDA}/fundo/{i:02d}.jpg", largura=1600, q=68)
    print("capa", i, f, s)
for nome, f in EXTRAS.items():
    s = salvar(pb(Image.open(f"{FOTOS}/{f}.jpg"), brilho=.9), f"{SAIDA}/fundo/{nome}.jpg", largura=1200, q=72)
    print(nome, f, s)
n = 0
for f in sorted(glob.glob(f"{FOTOS}/*/*.jpg")):
    slug, arq = f.split("/")[-2], os.path.basename(f)
    salvar(pb(Image.open(f), brilho=.95), f"{SAIDA}/faixa/{slug}-{arq}", altura=300, q=70)
    n += 1
print("faixa:", n, "miniaturas")
