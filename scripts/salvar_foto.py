#!/usr/bin/env python3
"""Decodifica um arquivo base64 (vindo do Google Drive), valida a imagem,
corrige a orientação EXIF, reduz para no máximo 1400 px e grava como JPEG.
Uso: python3 scripts/salvar_foto.py entrada.b64 fotos/<atleta>/NN.jpg"""
import base64, io, os, sys
from PIL import Image, ImageOps

src, dst = sys.argv[1], sys.argv[2]
raw = open(src).read().strip()
data = base64.b64decode(raw, validate=True)
Image.open(io.BytesIO(data)).verify()
im = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
orig = im.size
im.thumbnail((1400, 1400))
os.makedirs(os.path.dirname(dst), exist_ok=True)
im.save(dst, "JPEG", quality=82, optimize=True)
print(f"ok {dst} original={orig[0]}x{orig[1]} salvo={im.size[0]}x{im.size[1]}")
