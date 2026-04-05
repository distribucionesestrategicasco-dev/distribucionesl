import re

# ── CATALOG.JS ──────────────────────────────────────────────
js_file = r'C:\Users\Gala\Documents\GitHub\distribucionesl\js\catalog.js'

with open(js_file, 'r', encoding='utf-8') as f:
    js = f.read()

# Reemplazar buildProductCard: click abre modal en lugar de lightbox
old_card = 'function buildProductCard(p) {\n  var imgs = (p.imgs && p.imgs.length > 0) ? p.imgs : (p.img ? [p.img] : []);\n  var mainImg = imgs[0] || null;\n  var imgSection;\n  if (mainImg) {\n    var thumbs = imgs.length > 1\n      ? \'<div class="product-thumbs">\' + imgs.map(function(url, i) {\n          return \'<img class="product-thumb\' + (i === 0 ? \' active\' : \'\') + \'" src="\' + url + \'" onclick="setMainImg(this,\\\'\' + url.replace(/\'/g,"\\\\\'") + \'\\\')">\' ;\n        }).join(\'\') + \'</div>\'\n      : \'\';\n    imgSection = \'<div class="product-img">\'\n      + \'<span class="product-cat-badge">\' + p.cat + \'</span>\'\n      + \'<img class="product-photo" src="\' + mainImg + \'" alt="\' + p.name + \'" onclick="openImgLightbox(this.src,\\\'\' + p.name.replace(/\'/g,"\\\\\'") + \'\\\')" style="cursor:zoom-in">\'\n      + thumbs\n      + \'</div>\';\n  } else {\n    imgSection = \'<div class="product-img">\'\n      + \'<span class="product-cat-badge">\' + p.cat + \'</span>\'\n      + \'<span class="product-emoji">\' + (p.icon || \'📦\') + \'</span>\'\n      + \'</div>\';\n  }'

new_card = '''function buildProductCard(p) {
  var imgs = (p.imgs && p.imgs.length > 0) ? p.imgs : (p.img ? [p.img] : []);
  var mainImg = imgs[0] || null;
  var imgSection;
  if (mainImg) {
    imgSection = \'<div class="product-img" onclick="openProductModal(\' + JSON.stringify(p).replace(/\'/g,"\\\\\'") + \')" style="cursor:zoom-in">\'\n      + \'<span class="product-cat-badge">\' + p.cat + \'</span>\'\n      + \'<img class="product-photo" src="\' + mainImg + \'" alt="\' + p.name + \'">\'\n      + \'<div class="product-img-zoom-hint">🔍</div>\'\n      + \'</div>\';
  } else {
    imgSection = \'<div class="product-img">\'\n      + \'<span class="product-cat-badge">\' + p.cat + \'</span>\'\n      + \'<span class="product-emoji">\' + (p.icon || \'📦\') + \'</span>\'\n      + \'</div>\';
  }'''

# Agregar funcion openProductModal y modal al final antes del Init
old_init = '// ── Init ──'
new_modal = '''// ── Modal estilo Amazon ────────────────────────────────
function openProductModal(p) {
  var existing = document.getElementById('product-modal-amazon');
  if (existing) existing.remove();

  var imgs = (p.imgs && p.imgs.length > 0) ? p.imgs : (p.img ? [p.img] : []);
  var mainImg = imgs[0] || '';

  var thumbsHtml = imgs.map(function(url, i) {
    return '<img class="pma-thumb' + (i === 0 ? ' active' : '') + '" src="' + url + '" onclick="pmaSetImg(this,\'' + url.replace(/'/g,"\\'") + '\')">';
  }).join('');

  var precioTxt = p.price > 0 ? '$' + Math.round(p.price).toLocaleString('es-CO') + ' COP' : 'Precio a consultar';

  var modal = document.createElement('div');
  modal.id = 'product-modal-amazon';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML =
    '<div style="background:#fff;border-radius:16px;width:100%;max-width:780px;display:flex;overflow:hidden;max-height:92vh;position:relative">'
    + '<button onclick="document.getElementById(\'product-modal-amazon\').remove()" style="position:absolute;top:10px;right:10px;background:#eee;border:none;border-radius:50%;width:30px;height:30px;font-size:18px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center">×</button>'
    + '<div style="width:72px;background:#f8f8f8;border-right:1px solid #eee;display:flex;flex-direction:column;gap:8px;padding:12px 8px;overflow-y:auto;flex-shrink:0">' + thumbsHtml + '</div>'
    + '<div id="pma-main-col" style="flex:1;position:relative;background:#fafafa;display:flex;align-items:center;justify-content:center;min-height:360px;overflow:hidden">'
    +   '<img id="pma-main-img" src="' + mainImg + '" style="max-width:100%;max-height:420px;object-fit:contain;cursor:crosshair;display:block" onmousemove="pmaZoom(event)" onmouseleave="pmaHideZoom()" onmouseenter="pmaShowZoom()">'
    +   '<div id="pma-lens" style="position:absolute;width:130px;height:130px;border:1.5px solid #1A3C5E;background:rgba(26,60,94,0.08);pointer-events:none;display:none;border-radius:4px"></div>'
    +   '<div id="pma-zoom-result" style="position:absolute;right:0;top:0;width:260px;height:100%;border-left:1px solid #eee;overflow:hidden;background:#fff;display:none;z-index:5">'
    +     '<img id="pma-zoom-img" src="' + mainImg + '" style="position:absolute;transform-origin:top left">'
    +   '</div>'
    + '</div>'
    + '<div style="width:210px;padding:20px 16px;border-left:1px solid #eee;display:flex;flex-direction:column;gap:14px;flex-shrink:0;overflow-y:auto">'
    +   '<div>'
    +     '<p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">' + (p.cat || '') + '</p>'
    +     '<p style="font-size:16px;font-weight:700;color:#1A3C5E;line-height:1.3">' + (p.name || '') + '</p>'
    +   '</div>'
    +   '<p style="font-size:22px;font-weight:800;color:#1A3C5E">' + precioTxt + '</p>'
    +   '<span style="display:inline-block;background:#e8f5e9;color:#2e7d32;font-size:11px;padding:3px 10px;border-radius:20px;font-weight:500">En stock</span>'
    +   '<div style="border-top:1px solid #eee;padding-top:12px">'
    +     '<p style="font-size:12px;color:#888;margin-bottom:6px">Cantidad</p>'
    +     '<div style="display:flex;align-items:center;gap:10px">'
    +       '<button onclick="pmaQty(-1)" style="width:30px;height:30px;border:1px solid #ddd;border-radius:6px;background:#f5f5f5;cursor:pointer;font-size:18px;line-height:1">−</button>'
    +       '<span id="pma-qty" style="font-size:16px;font-weight:600;min-width:20px;text-align:center">1</span>'
    +       '<button onclick="pmaQty(1)" style="width:30px;height:30px;border:1px solid #ddd;border-radius:6px;background:#f5f5f5;cursor:pointer;font-size:18px;line-height:1">+</button>'
    +     '</div>'
    +   '</div>'
    +   '<button onclick="pmaAddCart(\'' + (p.id+'').replace(/'/g,"\\'") + '\')" style="background:#1A3C5E;color:#fff;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;width:100%">+ Agregar al carrito</button>'
    +   '<p style="font-size:11px;color:#bbb;text-align:center">Hover sobre imagen para zoom</p>'
    + '</div>'
    + '</div>';

  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  window._pmaQty = 1;
}

function pmaSetImg(el, url) {
  document.querySelectorAll('.pma-thumb').forEach(function(t){ t.classList.remove('active'); });
  el.classList.add('active');
  document.getElementById('pma-main-img').src = url;
  document.getElementById('pma-zoom-img').src = url;
}
function pmaQty(d) {
  window._pmaQty = Math.max(1, (window._pmaQty || 1) + d);
  var el = document.getElementById('pma-qty');
  if (el) el.textContent = window._pmaQty;
}
function pmaAddCart(id) {
  var qty = window._pmaQty || 1;
  for (var i = 0; i < qty; i++) addToCart(id);
  document.getElementById('product-modal-amazon').remove();
}
function pmaShowZoom() {
  var l = document.getElementById('pma-lens');
  var z = document.getElementById('pma-zoom-result');
  if (l) l.style.display = 'block';
  if (z) z.style.display = 'block';
}
function pmaHideZoom() {
  var l = document.getElementById('pma-lens');
  var z = document.getElementById('pma-zoom-result');
  if (l) l.style.display = 'none';
  if (z) z.style.display = 'none';
}
function pmaZoom(e) {
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
}

// ── Init ──'''

count = 0
if old_card in js:
    js = js.replace(old_card, new_card)
    count += 1
    print('Cambio 1 OK: card abre modal')
else:
    print('Cambio 1 NO encontrado')

if old_init in js:
    js = js.replace(old_init, new_modal)
    count += 1
    print('Cambio 2 OK: modal Amazon agregado')
else:
    print('Cambio 2 NO encontrado')

if count > 0:
    with open(js_file, 'w', encoding='utf-8') as f:
        f.write(js)

# ── CATALOG.CSS ─────────────────────────────────────────────
css_file = r'C:\Users\Gala\Documents\GitHub\distribucionesl\css\catalog.css'
css_extra = """
.product-img-zoom-hint {
  position: absolute; bottom: 8px; right: 8px;
  background: rgba(0,0,0,0.45); color: #fff;
  font-size: 14px; width: 28px; height: 28px;
  border-radius: 50%; display: flex; align-items: center;
  justify-content: center; opacity: 0; transition: opacity .2s;
}
.product-card:hover .product-img-zoom-hint { opacity: 1; }
.pma-thumb {
  width: 56px; height: 56px; border-radius: 6px;
  border: 2px solid transparent; cursor: pointer;
  object-fit: cover; transition: border-color .15s; display: block;
}
.pma-thumb.active { border-color: #1A3C5E; }
.pma-thumb:hover { border-color: #49C9F4; }
"""
with open(css_file, 'a', encoding='utf-8') as f:
    f.write(css_extra)
print('Cambio 3 OK: CSS agregado')
print(str(count) + ' cambios JS + 1 CSS aplicados')