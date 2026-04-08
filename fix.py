path = r"C:\Users\Gala\Documents\GitHub\distribucionesl\js\catalog.js"
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Cambiar el panel de zoom a position:fixed (sale del overflow:hidden)
old1 = '<div id=\\"pma-zoom-result\\" style=\\"position:absolute;right:0;top:0;width:260px;height:100%;border-left:1px solid #eee;overflow:hidden;background:#fff;display:none;z-index:5\\">'
new1 = '<div id=\\"pma-zoom-result\\" style=\\"position:fixed;width:280px;height:340px;border:1px solid #ddd;box-shadow:0 4px 20px rgba(0,0,0,0.15);border-radius:6px;overflow:hidden;background:#fff;display:none;z-index:9999\\">'

# Sin escapes (para el archivo real)
old1 = '''<div id="pma-zoom-result" style="position:absolute;right:0;top:0;width:260px;height:100%;border-left:1px solid #eee;overflow:hidden;background:#fff;display:none;z-index:5">'''
new1 = '''<div id="pma-zoom-result" style="position:fixed;width:280px;height:340px;border:1px solid #ddd;box-shadow:0 4px 20px rgba(0,0,0,0.15);border-radius:6px;overflow:hidden;background:#fff;display:none;z-index:9999">'''

# 2. Reemplazar pmaZoom para posicionar el panel dinámicamente
old2 = '''function pmaZoom(e) {
  var img = document.getElementById('pma-main-img');
  var lens = document.getElementById('pma-lens');
  var zr = document.getElementById('pma-zoom-result');
  var zi = document.getElementById('pma-zoom-img');
  if (!img || !lens || !zr || !zi) return;
  var rect = img.getBoundingClientRect();
  var lw = lens.offsetWidth, lh = lens.offsetHeight;
  var x = e.clientX - rect.left - lw / 2;
  var y = e.clientY - rect.top - lh / 2;
  x = Math.max(0, Math.min(x, rect.width - lw));
  y = Math.max(0, Math.min(y, rect.height - lh));
  lens.style.left = (img.offsetLeft + x) + 'px';
  lens.style.top = (img.offsetTop + y) + 'px';
  var rx = zr.offsetWidth / lw;
  var ry = zr.offsetHeight / lh;
  zi.style.width = rect.width * rx + 'px';
  zi.style.height = rect.height * ry + 'px';
  zi.style.left = (-x * rx) + 'px';
  zi.style.top = (-y * ry) + 'px';
}'''

new2 = '''function pmaZoom(e) {
  var img = document.getElementById('pma-main-img');
  var lens = document.getElementById('pma-lens');
  var zr = document.getElementById('pma-zoom-result');
  var zi = document.getElementById('pma-zoom-img');
  if (!img || !lens || !zr || !zi) return;
  var rect = img.getBoundingClientRect();
  var lw = lens.offsetWidth, lh = lens.offsetHeight;
  var x = e.clientX - rect.left - lw / 2;
  var y = e.clientY - rect.top - lh / 2;
  x = Math.max(0, Math.min(x, rect.width - lw));
  y = Math.max(0, Math.min(y, rect.height - lh));
  lens.style.left = (img.offsetLeft + x) + 'px';
  lens.style.top = (img.offsetTop + y) + 'px';
  // Posicionar panel fixed según espacio disponible
  var panelW = zr.offsetWidth || 280;
  var panelH = zr.offsetHeight || 340;
  var gap = 12;
  var posLeft, posTop;
  if (e.clientX + panelW + gap < window.innerWidth) {
    posLeft = rect.right + gap;
  } else {
    posLeft = rect.left - panelW - gap;
  }
  posTop = Math.max(8, Math.min(e.clientY - panelH / 2, window.innerHeight - panelH - 8));
  zr.style.left = posLeft + 'px';
  zr.style.top = posTop + 'px';
  zr.style.right = 'auto';
  var rx = panelW / lw;
  var ry = panelH / lh;
  zi.style.width = rect.width * rx + 'px';
  zi.style.height = rect.height * ry + 'px';
  zi.style.left = (-x * rx) + 'px';
  zi.style.top = (-y * ry) + 'px';
}'''

assert old1 in text, "ERROR: no encontró el string del pma-zoom-result"
assert old2 in text, "ERROR: no encontró la función pmaZoom"

text = text.replace(old1, new1, 1)
text = text.replace(old2, new2, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("OK — fix aplicado")