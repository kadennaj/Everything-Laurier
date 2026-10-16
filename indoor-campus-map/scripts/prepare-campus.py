"""Reduce an OpenStreetMap API snapshot into offline campus geometry.
Coordinates use a local metre plane, scaled to four metres per scene unit.
OSM contributors, ODbL: https://www.openstreetmap.org/copyright
"""
import xml.etree.ElementTree as E,json,math,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
r=E.parse(root/'source-data/campus-2026-10-12.osm').getroot();lat0,lon0=43.4735,-80.5271
nodes={n.attrib['id']:n for n in r.findall('node')}
def xy(n):return [round((float(n.attrib['lon'])-lon0)*111320*math.cos(math.radians(lat0))/4,3),round((lat0-float(n.attrib['lat']))*111320/4,3)]
def tags(e):return {t.attrib['k']:t.attrib['v'] for t in e.findall('tag')}
def poly(w):return [xy(nodes[n.attrib['ref']]) for n in w.findall('nd') if n.attrib['ref'] in nodes]
def center(p):return [round(sum(c[i] for c in p)/len(p),3) for i in range(2)]
def visible(p):return len(p)>1 and any(-115<x<115 and -112<z<110 for x,z in p)
ids={'267589632':'LH','113042945':'BA','43250600':'LIB','43250659':'DAWB','43250661':'FNCC','113042392':'SCI','113040012':'AC','113021038':'JAC','113016892':'DH','113010274':'P','104690857':'SC','113021799':'TA','113045583':'AH','628586186':'ARTS-A','628586187':'ARTS-C','628586188':'ARTS-E','43250655':'MLUC'}
places=[];context=[];roads=[];paths=[];trees=[];walknodes={};walkedges=[];field=None;parks=[]
for w in r.findall('way'):
 t=tags(w);p=poly(w)
 if not visible(p):continue
 wid=w.attrib['id'];name=t.get('name','')
 if t.get('building'):
  height=float(t.get('building:levels','2').split(';')[0])*0.75
  if wid in ids or ('Wilfrid Laurier' in t.get('operator','') and t.get('residential')=='university'):
   cat='Residence' if 'Residence' in name or t.get('residential')=='university' else 'Academic'
   if wid=='43250661':cat='Student life'
   if wid=='113016892':cat='Food'
   if wid=='113040012':cat='Athletics'
   ident=ids.get(wid,'RES-'+wid)
   places.append(dict(id=ident,name=name,category=cat,polygon=p,center=center(p),height=height,indoor=ident in ['LH','BA','LIB','SCI'],description='Explore the supplied Science floor, with entrances and seven stairwells.' if ident=='SCI' else 'Explore seven library floors. Main entrance on Floor 2.' if ident=='LIB' else 'Explore three blueprint-based floors.' if ident in ['LH','BA','LIB'] else 'Campus landmark. Indoor floor plans are not available yet.'))
  else:context.append(dict(polygon=p,height=min(height,6)))
 if t.get('name')=='Alumni Field':
  field=p;places.append(dict(id='AF',name='Alumni Field',category='Athletics',polygon=p,center=center(p),height=.08,description='Outdoor campus field.'))
 if t.get('leisure')=='park':parks.append(p)
 h=t.get('highway')
 pedestrian=h in ['footway','path','pedestrian','steps','living_street','service'] and t.get('foot')!='no' and t.get('access') not in ['private','no']
 if h:
  if pedestrian:paths.append(p)
  elif h not in ['service','cycleway','construction']:roads.append(dict(name=name,points=p,width=3.8 if h in ['primary','secondary','tertiary'] else 2.4))
  if h not in ['motorway','trunk','construction','proposed'] and t.get('foot')!='no' and t.get('access') not in ['private','no']:
   refs=[n.attrib['ref'] for n in w.findall('nd') if n.attrib['ref'] in nodes]
   for ref in refs:walknodes[ref]=xy(nodes[ref])
   for a,b in zip(refs,refs[1:]):walkedges.append(dict(fromId=a,toId=b,stairs=h=='steps',road=h not in ['footway','path','pedestrian','steps','living_street'],crossing=t.get('footway')=='crossing',pedestrianAllowed=pedestrian,wayId=wid,highway=h,layer=t.get('layer','0'),bridge=t.get('bridge','no'),tunnel=t.get('tunnel','no')))
# Conrad is a multipolygon relation, not a tagged building way. Preserve its
# outer footprint and courtyard rather than reducing the residence to a point.
ways={w.attrib['id']:w for w in r.findall('way')}
for relation in r.findall('relation'):
 if relation.attrib['id']!='1584007':continue
 t=tags(relation);outer=[];holes=[]
 for member in relation.findall('member'):
  if member.attrib['type']!='way' or member.attrib['ref'] not in ways:continue
  ring=poly(ways[member.attrib['ref']])
  if member.attrib.get('role')=='outer':outer.append(ring)
  elif member.attrib.get('role')=='inner':holes.append(ring)
 if len(outer)!=1 or outer[0][0]!=outer[0][-1]:raise ValueError('Conrad footprint must be one closed outer ring')
 places.append(dict(id='CONRAD',name='Conrad Hall Residence',category='Residence',polygon=outer[0],holes=holes,center=center(outer[0]),height=float(t.get('building:levels','3'))*.75,indoor=False,description='Clara Conrad Hall, a Laurier residence. Campus footprint from OSM relation 1584007; indoor room plans are not available.'))
for place in places:
 if place['id']=='ARTS-E':place['name']='Concourse / Arts E Wing'
 if place['id']=='JAC':place['name']='John Aird Centre / Music Building'
for n in nodes.values():
 t=tags(n);p=xy(n)
 if t.get('natural')=='tree' and -100<p[0]<100 and -110<p[1]<100:trees.append(p)
# OSM amenity names inside the campus, supported by their mapped locations.
for n in nodes.values():
 t=tags(n);p=xy(n);name=t.get('name','')
 if -90<p[0]<70 and -80<p[1]<90 and name and t.get('amenity') in ['cafe','restaurant','fast_food','pub'] and any(q.lower() in name.lower() for q in ['wilf','byte','starbuck','tim horton']):
  places.append(dict(id='FOOD-'+n.attrib['id'],name=name,category='Food',polygon=[[p[0]-1,p[1]-1],[p[0]+1,p[1]-1],[p[0]+1,p[1]+1],[p[0]-1,p[1]+1]],center=p,height=.1,description='Food location from OpenStreetMap. Check current opening hours.'))
# Building entrances are taken from OSM tags or a pedestrian way terminating on
# a footprint boundary; no arbitrary indoor-to-outdoor coordinates are invented.
def segment_distance(q,a,b):
 dx,dy=b[0]-a[0],b[1]-a[1];t=max(0,min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dy)/(dx*dx+dy*dy or 1)))
 return math.hypot(q[0]-a[0]-t*dx,q[1]-a[1]-t*dy)
terminal=set()
for way in r.findall('way'):
 t=tags(way);refs=[n.attrib['ref'] for n in way.findall('nd')]
 if t.get('highway') in ['footway','path','pedestrian','steps'] and t.get('access') not in ['private','no'] and refs:
  terminal.update([refs[0],refs[-1]])
entrances={}
for place in places:
 if place['category']=='Food':continue
 poly=place['polygon'];candidates=[]
 for nid,node in nodes.items():
  t=tags(node)
  if not t.get('entrance') and nid not in terminal and nid not in walknodes:continue
  q=xy(node)
  if min(segment_distance(q,a,b) for a,b in zip(poly,poly[1:]+poly[:1]))>.15:continue
  if t.get('entrance') in ['no','emergency','exit','service'] or t.get('access') in ['private','no']:continue
  candidates.append(dict(point=q,nodeId=nid,source='OSM entrance tag' if t.get('entrance') else 'OSM pedestrian path on footprint boundary',main=t.get('entrance')=='main'))
 if candidates:entrances[place['id']]=candidates
data=dict(origin=dict(lat=lat0,lon=lon0),places=places,context=context,roads=roads,paths=paths,trees=trees,field=field,walkNodes=walknodes,walkEdges=walkedges,source='OpenStreetMap contributors, ODbL',snapshot='2026-10-12',metresPerUnit=4,parks=parks,entrances=entrances)
(root/'src/data/campus.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
print('Campus:',len(places),'places',len(context),'context buildings',len(paths),'paths',len(trees),'trees')
print([(p['id'],p['name'],p['center']) for p in places])
