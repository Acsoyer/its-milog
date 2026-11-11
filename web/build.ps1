param(
  [string]$LandingSource = 'D:/Milog/milog.app-website/site_v6',
  [switch]$AppOnly,
  [switch]$Release
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$landing = Join-Path $PSScriptRoot 'dist/landing'
$app = Join-Path $PSScriptRoot 'dist/my-milog'
$screen = Join-Path $app 'screen'
if (!$AppOnly) {
$landingHtml = Get-Content "$LandingSource/index.html" -Raw
if ($landingHtml -notmatch '</nav>' -or $landingHtml -match '>My Milog<') {
  throw 'Expected a landing navigation without My Milog.'
}

New-Item -ItemType Directory -Force $landing, $screen, "$app/assets/fonts" | Out-Null
Copy-Item -Path "$LandingSource/*" -Destination $landing -Recurse -Force
$landingHtml = $landingHtml.Replace('</nav>', '<a class="my-milog" href="https://my.milog.app/">My Milog</a></nav>')
Set-Content -Encoding utf8 "$landing/index.html" $landingHtml
Add-Content "$landing/css/style.css" '
.nav { flex-wrap: wrap; }
.nav .my-milog { background: var(--ink); color: white; padding: 8px 14px; border-radius: 999px; }
.nav .my-milog:hover { background: var(--accent); color: white; }
'
}
New-Item -ItemType Directory -Force $screen, "$app/assets/fonts" | Out-Null

Copy-Item "$root/preview/timeline.css", "$root/preview/timeline.js", "$PSScriptRoot/account.css", "$PSScriptRoot/account.js", "$PSScriptRoot/compose.js", "$PSScriptRoot/quick.js", "$PSScriptRoot/desktop.js", "$PSScriptRoot/entry-tools.js", "$PSScriptRoot/locale.js" $screen -Force
Copy-Item "$root/node_modules/@supabase/supabase-js/dist/umd/supabase.js" $screen -Force
$settings = if (Test-Path "$root/.env") { ConvertFrom-StringData (Get-Content "$root/.env" -Raw) } else { @{} }
$url = ($env:EXPO_PUBLIC_SUPABASE_URL ?? $settings.EXPO_PUBLIC_SUPABASE_URL ?? '').Trim('"', "'")
$key = ($env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? $settings.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').Trim('"', "'")
if ($url -notmatch '^https://[a-z0-9]+\.supabase\.co/?$' -or $key -notmatch '^sb_publishable_') {
  throw 'Expected a Supabase project URL and a browser publishable key in .env.'
}
$config = @{ url = $url; anonKey = $key } | ConvertTo-Json -Compress
Set-Content -Encoding utf8 "$screen/config.js" "window.SUPABASE = $config;"
Copy-Item "$root/assets/milog-logo.svg" "$app/assets" -Force
Copy-Item "$root/assets/fonts/NeueHaasUnicaPro-Bold.ttf" "$app/assets/fonts" -Force
$skyPath = Join-Path $root 'src/lib/skyColors.ts'
$skySource = Get-Content $skyPath -Raw
$skyModule = $skySource + "`nwindow.MilogSky = { CITIES, DEFAULT_CITY_ID, skyProfileForCity };`n"
$skyModule = $skyModule -creplace '(?m)^export ', ''
$skyJs = $skyModule | node -e "const fs = require('fs'); const ts = require('typescript'); process.stdout.write(ts.transpileModule(fs.readFileSync(0, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText);"
if ($LASTEXITCODE) { throw 'Sky module compilation failed.' }
Set-Content -Encoding utf8 "$screen/sky.js" ("(() => {`n" + ($skyJs -join "`n") + "`n})();")

$html = Get-Content "$root/preview/index.html" -Raw
$html = $html.Replace('Milog · Timeline Önizleme', 'My Milog')
$html = $html.Replace('href="timeline.css"', 'href="screen/timeline.css"')
$html = $html.Replace('src="timeline.js"', 'src="screen/timeline.js"')
$accountScripts = @'
<link rel="stylesheet" href="screen/account.css">
<script src="screen/supabase.js" defer></script>
<script src="screen/config.js" defer></script>
<script src="screen/sky.js" defer></script>
<script src="screen/locale.js" defer></script>
<script src="screen/account.js" defer></script>
<script src="screen/compose.js" defer></script>
<script src="screen/quick.js" defer></script>
<script src="screen/entry-tools.js" defer></script>
<script src="screen/desktop.js" defer></script>
</head>
'@
$html = $html.Replace('</head>', $accountScripts)
$html = $html.Replace('<header class="toolbar">', '<header class="toolbar" hidden>')
$html = $html.Replace('<section class="timeline"', '<section class="timeline" hidden')
$html = [regex]::Replace($html, '(?s)(<section class="timeline"[^>]*>).*?(</article>\s*</section>)', '$1</section>')
$html = $html.Replace('Örnek kayıtlar', 'Günlük kayıtları').Replace('Örnek kayıtlarda ara', 'Kayıtlarda ara').Replace('Timeline önizleme kontrolleri', 'Timeline kontrolleri')
$html = [regex]::Replace($html, '(?s)<nav class="bottom".*?</nav>', (Get-Content "$PSScriptRoot/navigation.html" -Raw))
$html = $html.Replace('id="create-log"', 'id="create-log" hidden')
$html = $html.Replace('id="quick"', 'id="quick-logs"')
$html = $html.Replace('id="search-toggle"', 'id="calendar-search-toggle"')
$html = $html.Replace('<span class="avatar" aria-label="Örnek profil">M</span>', '<button class="avatar" id="profile-toggle" aria-label="Profili aç">M</button>')
$html = $html.Replace('  </header>', '    <button id="settings-toggle" aria-label="Ayarlar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3 .8 2.3h4.4L15 3l2.7 1.5-.5 2.5 2.2 2 2.5-.1.9 3-2.2 1.3-.8 2.9 1.4 2-2 2.4-2.3-.9-2.6 1.2-.5 2.2h-3.6l-.5-2.2-2.6-1.2-2.3.9-2-2.4 1.4-2-.8-2.9L1.2 12l.9-3 2.5.1 2.2-2-.5-2.5z"/><circle cx="12" cy="12" r="3"/></svg></button></header>')
$html = $html.Replace('<header class="toolbar" hidden>', (Get-Content "$PSScriptRoot/desktop.html" -Raw) + '<header class="toolbar" hidden>')
$html = $html.Replace('</main>', (Get-Content "$PSScriptRoot/account.html" -Raw) + '</main>')
$html = $html.Replace('../assets/', 'assets/')
$html = $html.Replace('<head>', '<head><meta name="referrer" content="no-referrer">')
$html = $html.Replace('lang="tr"', 'lang="en"')
$html = $html.Replace('</head>', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;display=swap"></head>')
$html = $html.Replace('</head>', '<link rel="icon" type="image/svg+xml" href="assets/milog-logo.svg"></head>')
foreach ($asset in (Get-ChildItem "$screen" -File)) {
  $version = (Get-FileHash -LiteralPath $asset.FullName).Hash.Substring(0, 12).ToLowerInvariant()
  $html = $html.Replace(('screen/' + $asset.Name + '"'), ('screen/' + $asset.Name + '?v=' + $version + '"'))
}
Set-Content -Encoding utf8 "$app/index.html" $html
# Rewrite one-segment profile URLs to the app shell when deployed as Worker assets.
'/:username /index.html 200' | Set-Content -Encoding ascii "$app/_redirects"
Write-Output "Prepared $landing and $app"
if ($Release) {
  foreach ($script in (Get-ChildItem "$screen/*.js" -File)) {
    node --check $script.FullName
    if ($LASTEXITCODE) { throw "Invalid JavaScript in $($script.Name)." }
  }
  $versions = Get-ChildItem "$PSScriptRoot/dist/my-milog_v*.zip" -File | ForEach-Object {
    if ($_.BaseName -match '^my-milog_v(\d+)$') { [int]$Matches[1] }
  }
  $latest = ($versions | Measure-Object -Maximum).Maximum
  $next = [Math]::Max(12, [int]$latest + 1)
  $archive = Join-Path $PSScriptRoot ('dist/my-milog_v{0:D3}.zip' -f $next)
  Compress-Archive -Path "$app/*" -DestinationPath $archive
  Write-Output "Created $archive"
}




