"""Trace the supplied Science floor into the isolated 3D map.
Pixel coordinates refer to source-plan.webp after rotation, not survey metres.
Ambiguous IDs and rooms without a clear corridor door remain reference landmarks.
Only the supplied N1 floor is modeled; stairs never imply missing upper floors.
"""
import json, math, pathlib
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1]
assets=root/'public/blueprints/science'
labels=json.loads((assets/'labels.json').read_text())
by_id={r[0]:r for r in labels['rooms']}
def rect(a,b,c,d):return [[a,b],[c,b],[c,d],[a,d]]
def t(p):return [round((p[0]-800)*.075,3),round((p[1]-575)*.075,3)]
def border(p,poly):
 best=(float('inf'),p)
 for a,b in zip(poly,poly[1:]+poly[:1]):
  dx,dy=b[0]-a[0],b[1]-a[1];q=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy or 1)))
  point=[a[0]+q*dx,a[1]+q*dy];dist=math.dist(point,p)
  if dist<best[0]:best=(dist,point)
 return best[1]
rooms=[];traced=set()
def add(code,poly,door,kind='office',routeable=True,**extra):
 label=by_id.get(code);uncertain=label and label[3]=='tentative'
 name=code.replace('N','N ',1) if label else code
 id=code
 if uncertain:
  id='SCI1-unverified-'+code;name='Unverified room label';routeable=False
 if label:traced.add(code)
 detail='Room label read from the supplied historical floor plan. Geometry and current door access need checking on campus.'
 if uncertain:detail=f'Possible source reading: {code}. The small annotation is ambiguous, so this room is not included in directions.'
 elif not routeable:detail='Room number is readable, but the corridor door or internal access is not clear enough to include in directions.'
 room=dict(id=id,name=extra.pop('name',name),kind=kind,polygon=[t(p) for p in poly],door=t(border(door,poly)),center=t(label[1:3] if label else [sum(p[i] for p in poly)/len(poly) for i in range(2)]),routeable=routeable,details=extra.pop('details',detail),**extra)
 rooms.append(room);return room
# Atrium entrance vestibules are on opposite sides of the same open lobby.
add('SCI1-entrance-a',[[490,439],[510,425],[532,442],[519,460],[503,460]], [511,460], 'entrance',name='Atrium entrance A',details='Double-door vestibule shown on the upper edge of the atrium. Current opening hours and step-free access are not verified.')
add('SCI1-entrance-b',[[490,651],[510,670],[532,651],[519,634],[503,634]], [511,634], 'entrance',name='Atrium entrance B',details='Double-door vestibule shown on the lower edge of the atrium. Current opening hours and step-free access are not verified.')
add('SCI1-bricker-connection',rect(1260,597,1308,679),[1260,643],'entrance',name='Bricker building connection',details='Indoor connection to Bricker Floor 1, shown on the supplied plans and confirmed by the user. Passage geometry and current access are unverified.')
# Open atrium; short hall branches remain visible around its central stair.
add('N1000',[[435,440],[491,440],[504,456],[522,456],[532,442],[590,442],[590,477],[688,477],[688,504],[656,517],[658,618],[593,618],[593,650],[529,650],[516,636],[504,636],[492,650],[435,650]], [580,546],'study',open=True)
# Curved teaching wing, traced independently rather than rectangular placeholders.
add('N1002',[[435,358],[399,364],[354,382],[319,410],[290,448],[278,480],[316,498],[369,519],[408,490],[433,469]], [414,498], 'lecture')
add('N1001',[[278,527],[283,578],[304,625],[344,668],[391,697],[415,697],[415,649],[389,626],[351,587],[336,558],[338,540],[386,543],[386,521],[324,504],[290,490]], [416,643], 'lecture')
add('N1001A',rect(401,667,437,713),[437,687],routeable=False)
add('N1001B',[[281,490],[328,513],[319,535],[274,515]], [328,516],routeable=False)
add('N1001C',[[265,661],[309,662],[346,698],[397,718],[397,757],[355,752],[307,731],[271,697]], [306,664],'study',False,open=True)
add('N1001D',[[215,496],[270,514],[280,582],[305,644],[314,660],[285,689],[254,651],[229,608],[210,567]], [267,516],'study',False,open=True)
add('N1002A',rect(408,387,438,461),[438,448],routeable=False)
add('N1002B',[[257,425],[286,440],[273,467],[245,451]], [273,465],routeable=False)
# Office wing: small rooms and suite subdivisions follow the supplied walls.
add('N1003',rect(592,256,663,354),[663,281],routeable=False)
add('N1003A',[[592,210],[634,210],[634,194],[720,194],[720,233],[699,233],[699,210],[665,210],[665,253],[592,253]], [707,233],routeable=False)
for code,y1,y2 in [('N1004',315,352),('N1005',292,314),('N1006',267,291),('N1007',233,263),('N1008',211,231)]:add(code,rect(665,y1,697,y2),[697,(y1+y2)/2],routeable=code!='N1008')
add('N1009',rect(720,241,746,270),[720,259])
add('N1010',rect(720,194,746,239),[720,221],routeable=False)
add('N1011',rect(732,293,812,324),[766,293])
add('N1011A',rect(731,326,812,354),[731,341])
add('N1013',rect(754,221,809,243),[765,221],routeable=False)
add('N1014',rect(750,194,810,218),[750,204],routeable=False)
add('N1012',rect(761,247,791,270),[768,247],routeable=False)
add('N1016',rect(812,194,837,220),[837,206],routeable=False)
add('N1021',[[839,194],[875,194],[875,231],[904,231],[904,269],[839,269],[839,247],[812,247],[812,222],[839,222]], [866,269])
for code,box in [('N1021C',(812,224,836,244)),('N1021D',(812,249,836,270)),('N1021E',(877,194,904,231)),('N1021F',(877,233,904,270)),('N1023A',(906,194,940,230)),('N1023B',(906,232,940,270)),('N1023C',(978,194,1010,230)),('N1023E',(978,232,1010,270)),('N1025A',(1012,249,1040,270)),('N1025B',(1012,224,1040,246)),('N1025C',(1012,194,1040,220)),('N1025D',(1080,194,1111,231)),('N1025E',(1080,233,1111,270))]:add(code,rect(*box),[box[0],(box[1]+box[3])/2],routeable=False)
add('N1023',rect(942,194,976,270),[964,270])
add('N1025',rect(1042,194,1078,270),[1042,255])
for code,a,b in [('N1017',815,845),('N1018',847,877),('N1019',879,909),('N1020',911,977),('N1026',1010,1038),('N1027',1040,1068),('N1028',1070,1097),('N1029',1099,1127)]:add(code,rect(a,293,b,354),[(a+b)/2,293])
add('N1022',rect(980,293,1008,326),[990,293])
add('N1022A',rect(980,328,1008,354),[980,341],routeable=False)
add('N1031',rect(1139,252,1171,278),[1139,268],routeable=False)
add('N1032',[[1173,252],[1199,252],[1199,294],[1139,294],[1139,280],[1173,280]], [1150,294],routeable=False)
add('N1033',rect(1139,296,1198,327),[1139,310],'washroom')
add('N1034',rect(1139,329,1198,356),[1139,342],'washroom')
add('N1035A',rect(1258,170,1304,241),[1258,234],routeable=False)
add('N1036B',[[1258,242],[1304,242],[1304,212],[1398,212],[1398,304],[1304,304],[1304,298],[1258,298]], [1258,268],routeable=False)
add('N1036D',rect(1308,169,1398,209),[1308,194],routeable=False)
# Main teaching corridor separates this row from the central N1070 volume.
add('N1041',rect(653,387,674,470),[653,435],routeable=False)
add('N1042',[[692,416],[712,395],[744,395],[744,390],[803,390],[803,476],[754,476],[754,471],[692,471]], [755,476], 'classroom')
add('N1043',rect(810,392,889,475),[827,475], 'classroom')
add('N1037B',rect(893,393,928,433),[928,420],routeable=False)
add('N1037C',rect(893,436,928,475),[928,455],routeable=False)
add('N1037',rect(932,393,971,475),[955,393])
add('N1039',[[1006,393],[1053,393],[1053,426],[1096,426],[1096,399],[1128,399],[1128,475],[1006,475]], [1019,475], 'office',False)
add('N1040',rect(1134,454,1227,477),[1134,461],routeable=False)
add('N1044',[[1261,379],[1323,379],[1395,379],[1395,421],[1423,421],[1423,459],[1395,459],[1395,505],[1261,505]], [1261,428], 'lecture')
# This central space has no confidently readable corridor door. Do not route through it.
add('N1070',[[812,504],[1208,504],[1208,728],[1185,720],[811,609]], [1208,587], 'study',False,details='N1070 is shown as the large central volume on the supplied drawing. Its door and access are unverified; routes go around it.')
# Angled wing: boundaries use the skewed source walls, not a generic rectangular grid.
add('N1057',[[804,650],[923,682],[902,752],[785,719]], [826,731], 'classroom')
add('N1058',[[927,683],[1000,703],[979,774],[906,754]], [940,762], 'office',False)
add('N1053',[[1004,704],[1132,739],[1103,807],[983,775]], [1070,797], 'office',False)
add('N1059',[[620,701],[734,733],[720,777],[605,746]], [640,707], 'classroom')
add('N1068',[[747,752],[863,785],[841,852],[721,817]], [770,758])
add('N1066',[[871,786],[958,811],[936,879],[846,853]], [900,794])
add('N1064',[[965,813],[1113,855],[1091,924],[941,880]], [1000,823], 'office',False)
add('N1048',[[1120,854],[1169,868],[1155,915],[1105,901]], [1140,860])
add('N1048A',[[1196,880],[1233,891],[1216,941],[1180,931]], [1215,886])
add('N1047',[[1238,892],[1320,916],[1302,963],[1221,941]], [1300,910])
# Curved seminar room on the outer wing.
angle=.29
curve=[[1242+90*math.cos(a)*math.cos(angle)-59*math.sin(a)*math.sin(angle),796+90*math.cos(a)*math.sin(angle)+59*math.sin(a)*math.cos(angle)] for a in [-math.pi/2+i*math.pi/28 for i in range(29)]]
add('N1048B',curve, [1240,752], 'classroom',False)
# Remaining tiny source labels are explicitly uncertain reference shapes.
for code,x,y,status,name in labels['rooms']:
 if code not in traced:
  add(code,rect(x-12,y-11,x+12,y+11),[x,y+11],routeable=False)
# Seven observed stairs; no invented elevator or cross-floor connector.
stairs=[
 ('theatre-upper','Theatre stairwell A',rect(396,326,438,382),[430,360],False),
 ('theatre-outer','Outer theatre stairwell',[[218,466],[255,482],[242,506],[212,493]],[244,501],False),
 ('theatre-lower','Theatre stairwell B',rect(396,720,438,774),[430,740],False),
 ('atrium','Atrium stairwell',rect(595,529,624,559),[595,544],True),
 ('office-upper','Office stairwell A',rect(1225,170,1255,212),[1255,200],True),
 ('office-lower','Office stairwell B',rect(1200,252,1234,306),[1234,267],True),
 ('wing-end','End-wing stairwell',[[1357,947],[1399,959],[1417,991],[1377,981],[1357,973]],[1364,951],True),
]
for key,name,poly,door,routeable in stairs:
 add('SCI1-stairs-'+key,poly,door,'stairs',routeable,name=name,details='Stairwell shown on the supplied floor plan. Only Floor 1 is mapped; upper-floor destinations are unavailable.'+(' Corridor access needs verification.' if not routeable else ''))
# Connected traced hallways. Junctions share explicit endpoints for the routing graph.
lines=[
 [[511,460],[511,494],[450,546],[575,546],[575,494],[700,494],[775,489],[795,489],[1240,489]],
 [[511,634],[511,600],[450,546]],[[450,546],[440,505],[414,498]],[[450,546],[450,638],[416,643]],
 [[575,546],[590,544]],
 [[450,546],[650,489],[650,377],[693,367],[709,367],[740,366],[1129,366],[1160,373],[1237,357],[1240,489]],
 [[709,367],[709,280],[740,280],[1129,280],[1129,366]],[[709,280],[709,254]],
 [[1237,357],[1237,267],[1237,237],[1255,237],[1255,200]],
 [[1240,489],[1240,428],[1261,428]],[[1240,489],[1240,643],[1260,643]],
 [[575,546],[575,650],[615,694],[746,730],[768,737],[900,778],[1100,836],[1240,865],[1343,910],[1364,951]],
]
# The outer outline preserves both the round theatre wing and skewed far wing.
outline=[[437,295],[588,295],[588,186],[1225,186],[1225,170],[1278,170],[1278,209],[1307,209],[1307,167],[1400,167],[1400,210],[1425,210],[1425,306],[1260,306],[1260,377],[1395,377],[1395,422],[1425,422],[1425,458],[1395,458],[1395,508],[1260,508],[1260,581],[1395,581],[1395,725],[1260,725],[1260,741],[1368,772],[1344,880],[1367,889],[1361,913],[1407,940],[1422,995],[1352,984],[1315,963],[617,820],[588,800],[437,800]]
outline += [[437+250*math.cos(a),547+252*math.sin(a)] for a in [math.pi/2+i*math.pi/40 for i in range(41)]]
# Blank courtyard cutouts from the source; preserve the notched vestibule edges.
holes=[[[445,346],[582,346],[582,437],[534,437],[511,422],[489,437],[445,437]],[[445,669],[489,669],[511,675],[534,669],[582,669],[582,789],[445,789]]]
floor=dict(level=1,label='Floor 1 · Science',outline=[t(p) for p in outline],holes=[[t(p) for p in h] for h in holes],rooms=rooms,corridors=[[t(p) for p in line] for line in lines],blueprint='/blueprints/science/floor-1.webp')
science=dict(id='SCI',name='Science Building',defaultFloor=1,floors=[floor],source='/science-review.html')
path=root/'src/data/indoors.json';data=json.loads(path.read_text());data=[b for b in data if b['id']!='SCI']+[science];path.write_text(json.dumps(data,separators=(',',':'))+'\n')
path=root/'src/data/campus.json';campus=json.loads(path.read_text())
for place in campus['places']:
 if place['id']=='SCI':place['indoor']=True;place['description']='Explore the supplied Science floor, with room labels, two atrium entrances, a Bricker connection, and seven stairwells.'
path.write_text(json.dumps(campus,separators=(',',':'))+'\n')
Image.open(assets/'source-plan.webp').crop((150,145,1440,1010)).save(assets/'floor-1.webp',quality=94)
print('Science: ',len(rooms),'rooms and landmarks,',len(stairs),'stairwells, 3 entrance/connection markers. Other floors are not invented.')
