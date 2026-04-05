file = r'C:\Users\Gala\Documents\GitHub\distribucionesl\js\admin.js'

with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

old = """<div style="width:48px;height:48px;background:var(--bg);border-radius:8px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:22px">' + (p.icono || '\U0001F4E6') + '</div>"""

new = """(p.imagenes && p.imagenes[0] ? '<img src="' + p.imagenes[0] + '" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">' : '<div style="width:48px;height:48px;background:var(--bg);border-radius:8px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:22px">' + (p.icono || '\U0001F4E6') + '</div>')"""

if old in content:
    content = content.replace(old, new)
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Listo')
else:
    print('No encontrado - buscando fragmento...')
    if 'width:48px;height:48px' in content:
        print('El bloque de imagen SI existe en el archivo')
    else:
        print('No se encontro ningun bloque de imagen')