file = r'C:\Users\Gala\Documents\GitHub\distribucionesl\js\catalog.js'

with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

old2 = 'function buildProductCard(p) {\n  var imgSection = p.img\n    ? \'<div class="product-img">\'\n        + \'<span class="product-cat-badge">\' + p.cat + \'</span>\'\n        + \'<img class="product-photo" src="\' + p.img + \'" alt="\' + p.name + \'" onclick="openImgLightbox(this.src,\\\'\' + p.name.replace(/\'/g,"\\\\\'") + \'\\\')" style="cursor:zoom-in">\'\n      + \'</div>\'\n    : \'<div class="product-img">\'\n        + \'<span class="product-cat-badge">\' + p.cat + \'</span>\'\n        + \'<span class="product-emoji">\' + (p.icon || \'📦\') + \'</span>\'\n      + \'</div>\';'

new2 = 'function buildProductCard(p) {\n  var imgs = (p.imgs && p.imgs.length > 0) ? p.imgs : (p.img ? [p.img] : []);\n  var mainImg = imgs[0] || null;\n  var imgSection;\n  if (mainImg) {\n    var thumbs = imgs.length > 1\n      ? \'<div class="product-thumbs">\' + imgs.map(function(url, i) {\n          return \'<img class="product-thumb\' + (i === 0 ? \' active\' : \'\') + \'" src="\' + url + \'" onclick="setMainImg(this,\\\'\' + url.replace(/\'/g,"\\\\\'") + \'\\\')">\' ;\n        }).join(\'\') + \'</div>\'\n      : \'\';\n    imgSection = \'<div class="product-img">\'\n      + \'<span class="product-cat-badge">\' + p.cat + \'</span>\'\n      + \'<img class="product-photo" src="\' + mainImg + \'" alt="\' + p.name + \'" onclick="openImgLightbox(this.src,\\\'\' + p.name.replace(/\'/g,"\\\\\'") + \'\\\')" style="cursor:zoom-in">\'\n      + thumbs\n      + \'</div>\';\n  } else {\n    imgSection = \'<div class="product-img">\'\n      + \'<span class="product-cat-badge">\' + p.cat + \'</span>\'\n      + \'<span class="product-emoji">\' + (p.icon || \'📦\') + \'</span>\'\n      + \'</div>\';\n  }'

if old2 in content:
    content = content.replace(old2, new2)
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Cambio OK: galeria aplicada')
else:
    print('NO encontrado')