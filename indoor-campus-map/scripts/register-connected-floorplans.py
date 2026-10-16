"""Approximate photo registration against the existing OSM campus footprints.
Landmark correspondences are interpretations, not a surveyed indoor georeference.
The common first elevator anchor keeps floor stacks aligned. Re-run after tracing.
"""
import json, math, pathlib
import numpy as np
from PIL import Image, ImageDraw
ROOT=pathlib.Path(__file__).resolve().parents[1]
BUILDINGS=json.loads((ROOT/'src/data/new-indoors.json').read_text())
CAMPUS=json.loads((ROOT/'src/data/campus.json').read_text())
# Rotate the entire geographic complex, rather than independently moving wings.
# This view bearing presents Arts right, Peters central, Schlegel left, DAWB below.
BEARING=55
rotation=np.array([[math.cos(math.radians(BEARING)),-math.sin(math.radians(BEARING))],[math.sin(math.radians(BEARING)),math.cos(math.radians(BEARING))]])
def metres(p): return (np.array(p)+[60,3])*4
def affine(source,target):
    solution=np.linalg.lstsq(np.c_[source,np.ones(len(source))],np.array([metres(p) for p in target]),rcond=None)[0]
    return solution[:2].T,solution[2]
def fixed(source,target,offset):
    return np.linalg.lstsq(np.array(source),np.array([metres(p)-offset for p in target]),rcond=None)[0].T,offset
REG={}
def save(id,floor,matrix,offset,source,target):
    residual=[round(float(np.linalg.norm(matrix@np.array(s)+offset-metres(t))),2) for s,t in zip(source,target)]
    REG.setdefault(id,{})[str(floor)]={'matrix':(rotation@matrix).round(8).tolist(),'offset':(rotation@offset).round(8).tolist(),'anchors':[{'local':s,'campus':t} for s,t in zip(source,target)],'residualMetres':residual}
# E-wing endpoints and the A-wing/Peters doorway establish Arts orientation.
arts_source=[[-17.01,27.645],[-17.01,-41.895],[82.53,-11.115]]
arts_target=[[-48.411,-17.356],[-40.548,-1.109],[-64.687,-4.901]]
m,o=affine(arts_source,arts_target);save('ARTS',2,m,o,arts_source,arts_target)
for floor,src in [(1,[[-10.005,19.04],[-4.025,-45.9],[90.275,-7.225]]),(3,[[-16.972,27.083],[-16.972,-45.26],[63.51,-11.388]])]:
    target=arts_target if floor==1 else arts_target[:2]+[[-62.252,-3.031]]
    fm,fo=fixed(src,target,o);save('ARTS',floor,fm,fo,src,target)
# Peters east perimeter, Schlegel-facing doorway, north office-wing stair.
# The east perimeter is a registration landmark, not the Arts arrival door.
p_source=[[20.64,.24],[-20.72,-1.76],[-23.68,-68.72]]
p_target=[[-64.687,-4.901],[-65.20,.87],[-78.8,-4.4]]
# Preserve right angles: the former three-point affine fit sheared Peters.
# Keep the elevator anchor common while fitting orientation/scale to the footprint.
raw,o=affine(p_source,p_target)
u,sv,v=np.linalg.svd(raw);m=(u@v)*np.mean(sv)
save('P',1,m,o,p_source,p_target)
for floor,src in [(2,[[-18.8,-1.52],[-22.2,-78.96]]),(3,[[-16.92,-2.79],[-15.525,-68.49]])]:
    scale=np.linalg.norm(m@np.array(p_source[2]))/np.linalg.norm(np.array(src[1]))
    fm=m*scale;save('P',floor,fm,o,src,p_target[1:])
# Schlegel's two lecture-theatre corners and the Peters-facing passage.
s_source=[[-56.025,-20.85],[-.45,-21.6],[33.6,30.075]]
s_target=[[-66.497,13.005],[-69.646,6.521],[-65.20,.87]]
m,o=affine(s_source,s_target);save('SC',1,m,o,s_source,s_target)
for floor,src in [(2,[[-52.29,-20.895],[1.47,-20.475],[24.15,28.56]]),(3,[[-70.47,-30.645],[.54,-30.645],[27.54,35.865]])]:
    # Portal and far corner are stronger anchors than a photographed wall midpoint.
    fm,fo=fixed([src[0],src[2]],[s_target[0],s_target[2]],o);save('SC',floor,fm,fo,src,s_target)
# Upper DAWB footprint rectangle (west stair projection is retained separately).
d_source=[[-41.488,-29.645],[34.573,-29.645],[34.573,42.273]]
d_target=[[-53.184,2.805],[-44.736,-1.266],[-40.531,6.877]]
m,o=affine(d_source,d_target);save('DAWB',2,m,o,d_source,d_target)
for floor in [1,3,4,5]:
    b=next(b for b in BUILDINGS if b['id']=='DAWB');f=next(f for f in b['floors'] if f['level']==floor)
    src=([[-39.175,-31.64],[13.631,-31.64],[13.86,46.2]] if floor==1 else f['outline'][:3])
    fm,fo=fixed(src,d_target,o);save('DAWB',floor,fm,fo,src,d_target)
def area(poly):return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(poly,poly[1:]+poly[:1])))/2
legacy={}
for b in json.loads((ROOT/'src/data/indoors.json').read_text()):
    place=next(p for p in CAMPUS['places'] if p['id']==b['id'])
    footprint=area(place['polygon'])*16
    legacy[b['id']]=round(math.sqrt(footprint/max(area(f['outline']) for f in b['floors'])),6)
# Science and Bricker retain each source plan's angles. Registration is approximate.
originals=json.loads((ROOT/'src/data/indoors.json').read_text())
for id,src,target in [
    ('SCI',[[-27.225,-2.1],[46.875,-30.6],[42.525,23.55]],[[45.273,1.077],[24.799,.178],[30.88,17.683]]),
    ('BA',[[-49,0],[56,0]],[[21.01,18.062],[3.734,28.108]])
]:
    raw,offset=affine(src,target)
    if id=='BA':
        # Two endpoints define a similarity; avoid the rank-deficient affine fit.
        delta=metres(target[1])-metres(target[0]);local=np.array(src[1])-src[0]
        angle=math.atan2(delta[1],delta[0])-math.atan2(local[1],local[0])
        scale=np.linalg.norm(delta)/np.linalg.norm(local)
        matrix=scale*np.array([[math.cos(angle),-math.sin(angle)],[math.sin(angle),math.cos(angle)]])
    else:
        u,sv,v=np.linalg.svd(raw);matrix=(u@v)*np.mean(sv)
    offset=metres(target[0])-matrix@np.array(src[0])
    for f in next(b for b in originals if b['id']==id)['floors']:
        save(id,f['level'],matrix,offset,src,target)
output={'legacyMetresPerUnit':legacy,'method':'Approximate photo registration (Peters, Science and Bricker preserve right angles) of landmarks to campus footprint metres; common elevator anchor per building. Not surveyed.','viewBearingDegrees':BEARING,'sources':['https://map.concept3d.com/?id=638','https://www.google.com/maps/search/?api=1&query=Frank+C.+Peters+Building+Wilfrid+Laurier+University','src/data/campus.json','public/blueprints/new-floorplans/manifest.json'],'buildings':REG}
(ROOT/'src/data/indoor-registration.json').write_text(json.dumps(output,indent=2)+'\n')
# Overlay for human verification. Gray = campus outline; colors = floor plan.
im=Image.new('RGB',(1500,1200),'#f8f7f3');draw=ImageDraw.Draw(im)
def screen(p):return (750+p[0]*5,480+p[1]*5)
for place in CAMPUS['places']:
    if place['id'] not in ['P','SC','DAWB','ARTS-A','ARTS-C','ARTS-E','FNCC']:continue
    poly=[screen(rotation@metres(p)) for p in place['polygon']]
    draw.polygon(poly,fill='#e2dfd9',outline='#777777',width=2)
    draw.text(screen(rotation@metres(place['center'])),place['id'],fill='#777777')
colors={'ARTS':'#bd5b24','P':'#5954ad','SC':'#187b67','DAWB':'#b53f75'}
for b in BUILDINGS:
    f=next(f for f in b['floors'] if f['level']==(2 if b['id'] in ['ARTS','DAWB'] else 1));r=REG[b['id']][str(f['level'])]
    transform=lambda p: np.array(r['matrix'])@np.array(p)+r['offset']
    poly=[screen(transform(p)) for p in f['outline']];draw.line(poly+[poly[0]],fill=colors[b['id']],width=3)
    for room in f['rooms']:
        if room['kind'] not in ['entrance','elevator']:continue
        p=screen(transform(room['door']));draw.ellipse((p[0]-4,p[1]-4,p[0]+4,p[1]+4),fill=colors[b['id']])
        if 'link' in room['id']:draw.text(p,room['id'],fill=colors[b['id']])
draw.text((30,25),'Approximate campus registration: Arts 2 / Peters 1 / Schlegel 1 / DAWB 2',fill='#222222')
draw.text((30,50),'Gray: geographic footprints. Colored: photographed indoor outlines. View bearing 55 degrees.',fill='#222222')
(ROOT/'docs').mkdir(exist_ok=True);im.save(ROOT/'docs/registration-overlay.png')
print('Registered',sum(len(v) for v in REG.values()),'floors. Residuals (metres):', {k:{f:v['residualMetres'] for f,v in fs.items()} for k,fs in REG.items()})
