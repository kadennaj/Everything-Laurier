"""Prepare local blueprint reference images and hand-traced navigation models.

Room labels and spatial layouts come from the user PDFs. Geometry is simplified;
routes and connector continuity require an on-site survey before real navigation.
"""
import json, math, pathlib, shutil
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1]
assets=root/'public'/'blueprints'; assets.mkdir(parents=True,exist_ok=True)
sources={
 'bricker':'/Users/kadennajarali/Library/Messages/Attachments/f0/00/2AFC2307-9672-47C7-B746-859ADA5E5050/proper bricker.pdf',
 'lazaridis':'/Users/kadennajarali/Library/Messages/Attachments/10/00/038DF957-A508-40C3-BE0B-D55EB05D704D/proper laz.pdf'}
for name,path in sources.items(): shutil.copyfile(path,assets/f'{name}.pdf')
for name,page,box in [('bricker-1',1,(340,140,1370,461)),('bricker-2',1,(385,530,1365,855)),('bricker-3',2,(139,122,1680,748)),('lazaridis-1',1,(260,370,1340,1100)),('lazaridis-2',2,(271,350,1381,1110)),('lazaridis-3',3,(280,333,1415,1145))]:
 stem=name.split('-')[0]
 Image.open(root/f'tmp/pdfs/{stem}-{page}.png').crop(box).save(assets/f'{name}.webp',quality=92)
def rect(x1,z1,x2,z2): return [[x1,z1],[x2,z1],[x2,z2],[x1,z2]]
def room(id,name,kind,poly,door,connector=None):
 c=[round(sum(p[i] for p in poly)/len(poly),2) for i in range(2)]
 r=dict(id=id,name=name,kind=kind,polygon=poly,center=c,door=door)
 if connector:r['connector']=connector
 return r

def floor(level,outline,rooms,corridors,building,holes=None):
 f=dict(level=level,label=f'Floor {level}',outline=outline,rooms=rooms,corridors=corridors,blueprint=f'/blueprints/{building}-{level}.webp')
 if holes:f['holes']=holes
 return f
# Bricker: west classrooms, central circulation/service core, east auditoria.
ba_outline=[[-50,-15],[-45,-15],[-45,-19],[-9,-19],[-9,-16],[0,-16],[0,-19],[17,-19],[17,-15],[24,-15],[24,-13],[33,-13],[35,-17],[54,-16],[56,-13],[56,17],[48,18],[32,12],[24,10],[24,15],[17,15],[17,19],[0,19],[0,15],[-9,15],[-9,19],[-45,19],[-45,15],[-50,15]]
ba_corr=[[[-48,0],[-41,0],[-30,0],[-18,0],[-7,0],[5,0],[15,0],[25,0],[27,0]],[[5,0],[5,-10],[5,-12]],[[15,0],[21,-10]],[[15,0],[21,10]],[[ -48,0],[-48,-10]],[[-48,0],[-48,10]],[[5,0],[5,13]]]
ba=[]
for lev in [1,2,3]:
 rooms=[]
 def add(code,poly,door,kind='classroom',name=None):rooms.append(room(f'BA{code}',name or f'BA {code}',kind,poly,door))
 if lev==1:
  for code,a,b in [('113',-42,-27),('111',-27,-11)]:add(code,rect(a,-18,b,-5),[(a+b)/2,0])
  for code,a,b in [('112',-39,-27),('110',-27,-11)]:add(code,rect(a,5,b,18),[(a+b)/2,0])
  add('101',[[33,-14],[53,-14],[52,-1],[31,-3]],[32,-2],'lecture')
  add('102',[[31,-2],[52,0],[49,17],[29,10]],[32,3],'lecture')
  for code,poly,door in [('117',rect(-47,-18,-43,-6),[-43,0]),('116',rect(-47,6,-43,18),[-43,0]),('109',rect(-10,7,-6,18),[-7,0]),('108',rect(-11,-16,-6,-8),[-7,0]),('107',rect(0,-18,6,-13),[5,-12]),('103',rect(8,4,19,10),[15,0]),('104',rect(4,10,8,18),[5,13])]:add(code,poly,door,'office')
 elif lev==2:
  for code,a,b in [('211',-44,-31),('209',-31,-18),('207',-18,-6)]:add(code,rect(a,-18,b,-5),[(a+b)/2,0])
  for code,a,b in [('210',-44,-31),('208',-31,-18),('206',-18,-6)]:add(code,rect(a,5,b,18),[(a+b)/2,0])
  add('201',[[32,-17],[53,-16],[48,18],[27,11]],[32,0],'lecture')
  add('202',rect(0,5,18,18),[5,0]); add('200',rect(-7,-3,1,3),[-7,-4.5],'study')
  add('205',rect(1,-18,8,-13),[5,-12],'office')
 else:
  for code,a,b in [('314',-44,-33),('313A',-33,-27),('313B',-27,-21),('313D',-21,-15),('313F',-15,-9),('313H',-9,-3),('313K',-3,3),('313L',3,9),('313M',9,15)]:
   add(code,rect(a,-18,b,-9),[(a+b)/2,-6],'office')
  for code,a,b in [('313',-33,-27),('313C',-27,-21),('313E',-21,-9),('313G',-9,-3),('313J',-3,15)]:add(code,rect(a,-8,b,-1),[(a+b)/2,0],'office')
  for code,a,b in [('308',-33,-21),('307',-21,-9),('306',-9,3),('305',3,15)]:add(code,rect(a,8,b,18),[(a+b)/2,4],'office')
  add('316',rect(15,5,27,18),[20,4],'office','BA 316 · ICT support')
  add('310',rect(-44,8,-34,18),[-38,4],'office');add('311',rect(-49,-1,-43,6),[-43,0],'office');add('312',rect(-44,-9,-34,-1),[-38,0],'office')
  add('304',rect(15,-17,25,-1),[20,0],'office');add('303A',rect(37,6,49,11),[35,4],'study','BA 303A · Meeting room')
  for code,a,b in [('303E',27,36),('303D',37,43),('303C',43,49)]:add(code,rect(a,12,b,18),[35,4],'office')
 if lev<3:
  for suffix,p in [('auditorium-north',[55,-9]),('auditorium-south',[53,11])]:
   x,z=p
   landmark=room(f'BA{lev}-{suffix}','Auditorium stairs · access unverified','stairs',rect(x-1.5,z-3,x+1.5,z+3),[x,z])
   landmark['routeable']=False;rooms.append(landmark)
 # Service cores visibly present on all provided plans; continuity is draft.
 coreX=5 if lev<3 else 31
 rooms.append(room(f'BA{lev}-lift','Elevator','elevator',rect(coreX-1,-12,coreX+2,-9),[coreX,-8],'ba-elevator'))
 rooms.append(room(f'BA{lev}-washroom','Washrooms','washroom',rect(coreX+3,-18,coreX+10,-7),[coreX+5,0]))
 for key,p,d in [('west-north',[-48,-10],[-48,0]),('west-south',[-48,10],[-48,0]),('east-north',[21 if lev<3 else 51,-10],[15 if lev<3 else 45,0]),('east-south',[21 if lev<3 else 51,10],[15 if lev<3 else 45,4])]:
  x,z=p;rooms.append(room(f'BA{lev}-{key}','Stairs','stairs',rect(x-2,z-4,x+2,z+4),d,f'ba-{key}'))
 if lev==1:
  rooms.append(room('BA-entrance','South entrance','entrance',rect(1,15,7,18),[5,13]))
  rooms.append(room('BA-science','Science atrium connection','entrance',rect(-52,-2,-49,2),[-48,0]))
 corridors=ba_corr if lev<3 else [[[-48,0],[-38,0],[-30,0],[-20,0],[-10,0],[0,0],[10,0],[20,0],[31,0],[45,0]],[[ -38,0],[-38,-6],[12,-6]],[[ -38,0],[-38,4],[35,4],[45,4]],[[31,0],[31,-8]],[[45,0],[51,-10]],[[45,4],[51,10]],[[-48,0],[-48,-10]],[[-48,0],[-48,10]]]
 if lev==2:
  corridors=[[[-48,0],[-41,0],[-30,0],[-18,0],[-10,0],[-10,-4.5],[3,-4.5],[3,0],[5,0],[15,0],[25,0],[27,0]],[[ -10,0],[-10,4.5],[3,4.5],[3,0]]] + ba_corr[1:]
 outline=ba_outline if lev<3 else [[-50,-15],[-44,-15],[-44,-19],[15,-19],[15,-15],[25,-15],[25,-19],[45,-19],[45,-15],[54,-15],[54,15],[48,15],[48,19],[25,19],[25,15],[15,15],[15,19],[-44,19],[-44,15],[-50,15]]
 if lev==3:
  # Register the differently scaled third-floor sheet to the same west edge
  # and elevator shaft as the first two floor plans.
  transform=lambda p:[round((p[0]+50)*55/81-50,3),p[1]]
  outline=[transform(p) for p in outline]
  corridors=[[transform(p) for p in line] for line in corridors]
  for r in rooms:
   r['polygon']=[transform(p) for p in r['polygon']]
   r['center']=transform(r['center']);r['door']=transform(r['door'])
  # The east auditorium volume is open below on this sheet, not a room.
  outline=ba_outline
  auditorium_void=[[32,-17],[53,-16],[48,18],[27,11]]
 else:auditorium_void=None
 ba.append(floor(lev,outline,rooms,corridors,'bricker',[auditorium_void] if auditorium_void else None))
# Lazaridis: central open atrium, west lecture theatre, perimeter circulation.
lh_outline=[[-54,-28],[-41,-28],[-41,-35],[-21,-35],[-21,-33],[54,-33],[54,20],[42,20],[42,34],[-27,34],[-27,29],[-43,29],[-52,21],[-56,5],[-56,-10]]
lh=[]
for lev in [1,2,3]:
 rooms=[]
 def add(code,poly,door,kind='classroom',name=None):rooms.append(room(f'LH{code}',name or f'LH {code}',kind,poly,door))
 if lev==1:
  auditorium=[[-52,-11],[-43,-22],[-34,-22],[-25,-15],[-21,-3],[-22,14],[-31,26],[-42,25],[-52,13],[-55,0]]
  add('1001',auditorium,[-18,2],'lecture')
  for code,a,b in [('1009',-8,12),('1010',12,32),('1011',32,52)]:add(code,rect(a,-33,b,-16),[(a+b)/2,-13],'lecture')
  for label,poly,door in [('Student lounge',rect(-11,23,8,34),[-3,19]),('Study area',rect(9,23,27,34),[19,19]),('South lobby',rect(31,23,49,34),[38,19])]:rooms.append(room(f'LH1-{label}',label,'study',poly,door))
  # User correction: the south lounge is Byte 75 restaurant; keep its stable ID.
  rooms[-1].update(name='Byte 75',kind='food',details='Byte 75 restaurant · Floor 1. Location confirmed by the user.')
  corridors=[[[-47,-22],[-34,-22],[-18,-22],[-18,-30]],[[-18,-30],[-18,-13],[-18,0],[-18,19],[-18,30]],[[-18,-13],[0,-13],[20,-13],[38,-13],[49,-13]],[[38,-13],[38,0],[38,19],[49,19]],[[38,19],[20,19],[0,19],[-18,19]],[[-18,-13],[-11,-13],[-11,-19]]]
 elif lev==2:
  add('2066',rect(-13,23,1,35),[-6,19],'lecture')
  for label,a,b in [('South lecture room A',1,16),('South lecture room B',16,31)]:rooms.append(room(f'LH2-{label}',label,'lecture',rect(a,23,b,35),[(a+b)/2,19]))
  # The source's LH3094 conference annotation appears on floor 2; no invented duplicate room.
  rooms.append(room('LH2-auditorium-upper','Upper lecture theatre · open below','study',[[-53,-12],[-39,-24],[-25,-18],[-20,0],[-24,19],[-40,26],[-53,13]],[-18,0]))
  for i in range(14):
   a=-14+i*4.7; rooms.append(room(f'LH2-north-{i}','Office','office',rect(a,-34,a+4.35,-26),[a+2,-22]))
  for i in range(10):
   a=-9+i*4.2; rooms.append(room(f'LH2-inner-{i}','Office','office',rect(a,-6,a+3.9,1),[a+2,-10]))
  for i in range(7):
   a=-7+i*5.5; rooms.append(room(f'LH2-core-{i}','Office','office',rect(a,-20,a+5,-13),[a+2,-10]))
  corridors=[[[-47,-22],[-34,-22],[-18,-22],[0,-22],[20,-22],[38,-22],[49,-22]],[[ -18,-22],[-18,-10],[-18,0],[-18,19],[-18,30]],[[-18,-10],[0,-10],[20,-10],[38,-10],[49,-10]],[[38,-22],[38,-10],[38,0],[38,19],[49,19]],[[38,19],[20,19],[0,19],[-18,19]],[[-18,-10],[-11,-10],[-11,-17]]]
 else:
  add('3098',rect(0,23,16,35),[8,19],'lecture')
  for label,a,b in [('South lecture room A',-15,0),('South lecture room B',16,31)]:rooms.append(room(f'LH3-{label}',label,'lecture',rect(a,23,b,35),[(a+b)/2,19]))
  oval=[[44+13*math.cos(t*math.pi/12),26+11*math.sin(t*math.pi/12)] for t in range(24)]
  add('3094',oval,[34,23],'lecture')
  rooms.append(room('LH3-west-study','West study lounge','study',[[-44,-13],[-33,-21],[-23,-10],[-22,5],[-27,20],[-41,24]],[-18,0]))
  for i in range(18):
   a=-22+i*4;rooms.append(room(f'LH3-north-{i}','Office','office',rect(a,-35,a+3.7,-29),[a+1.8,-25]))
  for i in range(7):
   z=-15+i*5.5;rooms.append(room(f'LH3-west-{i}','Office','office',rect(-55,z,-49,z+5),[-46,z+2]))
  for i in range(10):
   a=-10+i*4.5;rooms.append(room(f'LH3-inner-{i}','Office','office',rect(a,-6,a+4,1),[a+2,-10]))
  for label,a,b in [('Seminar room A',-8,4),('Seminar room B',4,17),('Seminar room C',17,29)]:rooms.append(room(f'LH3-{label}',label,'classroom',rect(a,-23,b,-13),[(a+b)/2,-10]))
  corridors=[[[-47,-22],[-34,-22],[-18,-22],[-18,-25],[0,-25],[20,-25],[38,-25]],[[ -18,-25],[-18,-10],[-18,0],[-18,19],[-18,30]],[[-18,-10],[0,-10],[20,-10],[38,-10],[49,-10]],[[38,-25],[38,-10],[38,0],[38,19],[49,19]],[[38,19],[20,19],[0,19],[-18,19]],[[-18,-10],[-11,-10],[-11,-17]],[[-47,-22],[-46,-16],[-46,0],[-46,28],[-18,28],[-18,19]],[[38,19],[34,23]]]
 # Circulation markers, following stairs and paired lifts visible in the plans.
 liftz=-19
 rooms.append(room(f'LH{lev}-lift','Elevators','elevator',rect(-14,liftz-2,-8,liftz+1),[-11,liftz],'lh-elevator'))
 rooms.append(room(f'LH{lev}-washroom','Washrooms','washroom',rect(-38,-34,-23,-24),[-34,-22]))
 for key,p,d in [('northwest',[-47,-24],[-47,-22]),('southwest',[-24,31],[-18,30]),('northeast',[48,-8],[49,-10 if lev>1 else -13]),('southeast',[48,17],[49,19])]:
  x,z=p;rooms.append(room(f'LH{lev}-{key}','Stairs','stairs',rect(x-4,z-2,x+4,z+2),d,f'lh-{key}'))
 # Central atrium stair participates in routes after a site survey; visible but not linked.
 rooms.append(room(f'LH{lev}-atrium-stairs','Atrium stairs','stairs',rect(-14,-2,-11,11),[-18,3]))
 if lev==1:
  rooms.append(room('LH-entrance','South entrance','entrance',rect(-23,32,-17,35),[-18,30]))
  rooms.append(room('LH-north-entrance','University Avenue entrance','entrance',rect(-21,-35,-15,-32),[-18,-30]))
 for i in range(5 if lev==1 else 8):
  z=-3+i*2.5;rooms.append(room(f'LH{lev}-east-{i}','Office','office',rect(42,z,53,z+2.2),[38,z+1]))
 hole=rect(-10,2,34,15)
 lh.append(floor(lev,lh_outline,rooms,corridors,'lazaridis',[hole]))
# Convert corridor-side references to actual room boundary door points.
# This makes route endpoints stop at doors rather than corridor centre lines.
def closest_border(point,polygon):
 best=None
 for a,b in zip(polygon,polygon[1:]+polygon[:1]):
  dx,dz=b[0]-a[0],b[1]-a[1];length=dx*dx+dz*dz
  t=max(0,min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dz)/(length or 1)))
  p=[round(a[0]+t*dx,3),round(a[1]+t*dz,3)]
  dist=math.hypot(p[0]-point[0],p[1]-point[1])
  if best is None or dist<best[0]:best=(dist,p)
 return best[1]
for f in ba+lh:
 for r in f['rooms']:r['door']=closest_border(r['door'],r['polygon'])
data=[dict(id='BA',name='Bricker Academic Building',floors=ba,source='/blueprints/bricker.pdf'),dict(id='LH',name='Lazaridis Hall',floors=lh,source='/blueprints/lazaridis.pdf')]
(root/'src/data/indoors.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
print('Prepared',sum(len(f['rooms']) for b in data for f in b['floors']),'rooms and landmarks on six floors')

# Apply the more detailed upper-floor and library traces after the base model.
import runpy
runpy.run_path(str(root/"scripts/refine-maps.py"))
