"""Readable visual transcription of the supplied flattened Science plan.
This builds a separate reference viewer, not routing data or a surveyed floor model.
Usage: python prepare-science-review.py "science floorplan.pdf"
"""
import base64, html, io, json, pathlib, sys
from pypdf import PdfReader
root=pathlib.Path(__file__).resolve().parents[1]
folder=root/'public/blueprints/science'
data=json.loads((folder/'labels.json').read_text())
source=PdfReader(sys.argv[1]).pages[0].images[0].image.rotate(270,expand=True)
source.save(folder/'source-plan.webp',quality=95)
buf=io.BytesIO();source.save(buf,format='WEBP',quality=95)
uri='data:image/webp;base64,'+base64.b64encode(buf.getvalue()).decode()
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="150 145 1290 865" role="img" aria-label="Science Building floor plan with readable room numbers"><image href="{uri}" width="1650" height="1275"/>']
svg.append('''<style>.room{cursor:pointer}.room text{font:700 10px Arial,sans-serif;text-anchor:middle;dominant-baseline:middle;fill:#31214b}.room rect{fill:#fff;stroke:#624092;stroke-width:.6}.room.tentative text{fill:#885400}.room.tentative rect{fill:#fff5dc;stroke:#b67a11;stroke-dasharray:2 1}.room.selected rect{fill:#e8dbff;stroke:#5b21a5;stroke-width:2}.room:hover rect{stroke-width:1.7}.stairs text{font:700 8px Arial,sans-serif;fill:#04516b;text-anchor:middle;dominant-baseline:middle}.stairs rect{fill:#e5f8fd;stroke:#27849b;stroke-width:.6}</style>''')
for ident,x,y,status,name in data['rooms']:
 text='?' if status=='tentative' else ident
 width=len(text)*6.2+7
 svg.append(f'<g class="room {status}" data-room="{ident}" data-x="{x}" data-y="{y}"><title>{ident}: {"tentative reading" if status=="tentative" else "read from supplied plan"}</title><rect x="{x-width/2}" y="{y-6.6}" width="{width}" height="13.2" rx="2"/><text x="{x}" y="{y+.5}">{text}</text></g>')
for x,y in data['stairs']:
 svg.append(f'<g class="stairs"><rect x="{x-18}" y="{y-6}" width="36" height="12" rx="2"/><text x="{x}" y="{y+.5}">STAIRS</text></g>')
svg.append('</svg>');svg=''.join(svg)
(folder/'labeled-plan.svg').write_text(svg)
page=(root/'scripts/science-review-template.html').read_text().replace('<!-- PLAN -->',svg).replace('/* ROOM_DATA */',json.dumps(data['rooms']))
(root/'public/science-review.html').write_text(page)
print(f"Rendered {sum(r[3]=='read' for r in data['rooms'])} read labels and {sum(r[3]=='tentative' for r in data['rooms'])} tentative readings.")
