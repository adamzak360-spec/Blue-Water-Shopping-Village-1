from pathlib import Path
import markdown

root = Path(__file__).resolve().parents[1]
source = root / 'docs' / 'reliable-system-operations-manual.md'
out = root / 'public' / 'docs' / 'reliable-system-operations-manual.html'
out.parent.mkdir(parents=True, exist_ok=True)
body = markdown.markdown(source.read_text(encoding='utf-8'), extensions=['tables', 'sane_lists'])
html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reliable System Operations Manual</title>
<style>
:root{{--navy:#102f56;--teal:#0b9a96;--coral:#e8795e;--ink:#20354c;--muted:#617287;--line:#dbe6ed;--paper:#f5f9fb}}
*{{box-sizing:border-box}}
html{{background:var(--paper)}}
body{{margin:0;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.65;background:linear-gradient(180deg,#eef9f8 0,#f8fbfc 280px,var(--paper) 100%)}}
.page{{width:min(100% - 28px,960px);margin:0 auto;padding:24px 0 56px}}
.cover{{position:relative;overflow:hidden;padding:clamp(24px,6vw,58px);border-radius:26px;background:linear-gradient(135deg,#081d38,#102f56 65%,#087f80);color:#fff;box-shadow:0 18px 44px rgba(16,47,86,.18)}}
.cover:after{{content:"";position:absolute;right:-100px;bottom:-150px;width:340px;height:340px;border:1px solid rgba(255,255,255,.23);border-radius:50%;box-shadow:0 0 0 28px rgba(255,255,255,.06),0 0 0 58px rgba(255,255,255,.04)}}
.cover h1{{position:relative;z-index:1;margin:0;max-width:760px;font-size:clamp(2rem,6vw,4.1rem);line-height:1.04;letter-spacing:-.045em}}
.cover .eyebrow{{position:relative;z-index:1;margin-bottom:14px;color:#8ee8df;font-size:.74rem;font-weight:850;letter-spacing:.16em;text-transform:uppercase}}
.cover p{{position:relative;z-index:1;max-width:720px;margin:18px 0 0;color:#d5e6ef;font-size:clamp(.92rem,2vw,1.1rem)}}
.meta{{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}}.meta span{{padding:9px 12px;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:rgba(255,255,255,.09);color:#e1edf3;font-size:.78rem}}
.content{{margin-top:18px;padding:clamp(22px,5vw,48px);border:1px solid var(--line);border-radius:24px;background:#fff;box-shadow:0 10px 30px rgba(16,47,86,.07)}}
.content h2{{margin:34px 0 10px;color:var(--navy);font-size:clamp(1.35rem,3vw,2rem);line-height:1.15;letter-spacing:-.025em;border-top:3px solid #d8f0ed;padding-top:18px}}.content h2:first-child{{margin-top:0;border-top:0;padding-top:0}}
.content h3{{margin:22px 0 8px;color:var(--navy);font-size:1.1rem}}
.content p{{margin:0 0 14px;color:var(--muted)}}.content strong{{color:var(--navy)}}
.content blockquote{{margin:18px 0;padding:16px 18px;border-left:4px solid var(--coral);border-radius:0 12px 12px 0;background:#fff7f3;color:#536779}}
.content ol,.content ul{{padding-left:1.35rem;color:var(--muted)}}.content li{{margin:.25rem 0}}
table{{width:100%;margin:16px 0 22px;border-collapse:collapse;font-size:.9rem}}th{{background:var(--navy);color:#fff;text-align:left;font-weight:800}}th,td{{padding:10px 11px;border:1px solid var(--line);vertical-align:top}}td{{color:var(--muted)}}tr:nth-child(even) td{{background:#f8fbfc}}
.footer{{margin-top:18px;text-align:center;color:#8090a0;font-size:.78rem}}
@media(max-width:620px){{.page{{width:min(100% - 14px,960px);padding-top:7px}}.cover,.content{{border-radius:18px}}.content{{padding:19px 16px}}.content h2{{font-size:1.35rem}}table{{display:block;overflow-x:auto;white-space:normal}}th,td{{min-width:125px;padding:8px;font-size:.78rem}}.meta{{display:grid;grid-template-columns:1fr}}}}
@media print{{body{{background:#fff}}.page{{width:100%;padding:0}}.cover,.content{{box-shadow:none;border:0}}.content{{padding:28px 0}}.content h2{{break-after:avoid}}}}
</style>
</head>
<body><main class="page"><header class="cover"><div class="eyebrow">Reliable Premium Marketplace</div><h1>System Operations Manual</h1><p>A clear operating reference for company leadership, administrators, sellers, support staff, and conference audiences.</p><div class="meta"><span>Last updated: August 2026</span><span>Document owner: Reliable Operations</span></div></header><article class="content">{body}</article><div class="footer">Reliable Premium Marketplace · Internal operations reference · No credentials or private secrets included</div></main></body>
</html>'''
out.write_text(html, encoding='utf-8')
print(out)
