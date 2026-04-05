file = r'C:\Users\Gala\Documents\GitHub\distribucionesl\js\admin.js'

with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

old = "  document.getElementById('prod-img-url').value = p.imagen_url || '';\n  document.getElementById('prod-img-file').value = '';\n  var wrap = document.getElementById('prod-img-preview-wrap');\n  wrap.innerHTML = p.imagen_url\n    ? '<img src=\"' + p.imagen_url + '\" style=\"width:80px;height:80px;object-fit:cover;border-radius:8px;margin-bottom:6px\"><br><span style=\"font-size:12px;color:var(--text-soft)\">Haz clic para cambiar</span>'\n    : '<div style=\"font-size:28px;margin-bottom:6px\">\U0001f4c1</div><div style=\"font-size:13px;color:var(--text-soft)\">Haz clic para agregar imagen</div>';\n  document.getElementById('prod-modal').style.display = 'flex';\n}"

new = """  document.getElementById('prod-img-url').value = p.imagen_url || '';
  document.getElementById('prod-img-file').value = '';
  var imgs = (p.imagenes && p.imagenes.length > 0) ? p.imagenes : (p.imagen_url ? [p.imagen_url] : []);
  window._prodImagenesPendientes = imgs.map(function(url){ return { url: url, preview: url, file: null }; });
  renderProdImgsList();
  document.getElementById('prod-modal').style.display = 'flex';
}"""

if old in content:
    content = content.replace(old, new)
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: editar carga imagenes[]')
else:
    print('NO encontrado')
    # debug
    idx = content.find("document.getElementById('prod-img-preview-wrap')")
    print(repr(content[idx-200:idx+300]))