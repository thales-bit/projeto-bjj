#!/usr/bin/env python3
"""Extrai as fotos de um portfólio em PDF (base64) e grava até 5 delas,
as maiores primeiro, em fotos/<atleta>/NN.jpg.
Uso: python3 scripts/extrair_pdf.py entrada.b64 <atleta>"""
import base64, io, os, sys
import pymupdf
from PIL import Image, ImageOps

src, slug = sys.argv[1], sys.argv[2]
data = base64.b64decode(open(src).read().strip(), validate=True)
doc = pymupdf.open(stream=data, filetype="pdf")
found = []
seen = set()
for page in doc:
    for info in page.get_images(full=True):
        xref = info[0]
        if xref in seen: continue
        seen.add(xref)
        try:
            pix = pymupdf.Pixmap(doc, xref)
            if pix.n - pix.alpha >= 4: pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
            im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        except Exception as e:
            print("pulei", xref, e); continue
        if im.width < 500 or im.height < 500: continue
        found.append((im.width * im.height, page.number, xref, im))
found.sort(key=lambda t: -t[0])
os.makedirs(f"fotos/{slug}", exist_ok=True)
n = 0
for area, pg, xref, im in found[:5]:
    n += 1
    im.thumbnail((1400, 1400))
    dst = f"fotos/{slug}/{n:02d}.jpg"
    im.save(dst, "JPEG", quality=82, optimize=True)
    print(f"ok {dst} pagina={pg+1} {im.size[0]}x{im.size[1]}")
print(f"total_imagens_grandes={len(found)} salvas={n}")
