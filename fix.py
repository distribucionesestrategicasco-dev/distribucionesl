file = r'C:\Users\Gala\Documents\GitHub\distribucionesl\js\catalog.js'

with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

old = '  imgSection = \'<div class="product-img" onclick="openProductModal(\' + JSON.stringify(p).replace(/\'/g,"\\\\\'") + \')" style="cursor:zoom-in">\''

new = '  imgSection = \'<div class="product-img" onclick="openProductModal(\\\'\' + p.id + \'\\\')" style="cursor:zoom-in">\''

if old in content:
    content = content.replace(old, new)
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: onclick usa id')
else:
    print('NO encontrado')
    print(repr(old[:80]))