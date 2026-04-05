$file = "C:\Users\Gala\Documents\GitHub\distribucionesl\js\admin.js"
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
$old = '<div style="width:48px;height:48px;background:var(--bg);border-radius:8px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:22px">' + (p.icono || ' + [char]0x1F4E6 + ') + '</div>'
$new = '(p.imagenes && p.imagenes[0] ? ' + [char]39 + '<img src="' + [char]39 + ' + p.imagenes[0] + ' + [char]39 + '" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">' + [char]39 + ' : ' + [char]39 + '<div style="width:48px;height:48px;background:var(--bg);border-radius:8px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:22px">' + [char]39 + ' + (p.icono || ' + [char]39 + [char]0x1F4E6 + [char]39 + ') + ' + [char]39 + '</div>' + [char]39 + ')'
$content = $content.Replace($old, $new)
[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host "Listo"
