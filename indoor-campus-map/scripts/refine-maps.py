"""Hand traces from the supplied Laz PDF and official library plans matching screenshots.
Coordinates are source-image pixels, registered to shared shafts; not survey measurements.
Run after prepare-blueprints.py; also safe to run against the checked-in base data.
"""
import json, math, pathlib
root=pathlib.Path(__file__).resolve().parents[1]
data=json.loads((root/'src/data/indoors.json').read_text())
def rect(a,b,c,d): return [[a,b],[c,b],[c,d],[a,d]]
def ellipse(x,y,rx,ry,n=48):return [[x+rx*math.cos(i*2*math.pi/n),y+ry*math.sin(i*2*math.pi/n)] for i in range(n)]
def border(p,poly):
 best=(float('inf'),p)
 for a,b in zip(poly,poly[1:]+poly[:1]):
  dx,dy=b[0]-a[0],b[1]-a[1];t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy or 1)))
  q=[round(a[0]+t*dx,3),round(a[1]+t*dy,3)];d=math.dist(p,q)
  if d<best[0]:best=(d,q)
 return best[1]
def inside(p,poly):
 result=False
 for a,b in zip(poly,poly[1:]+poly[:1]):
  if (a[1]>p[1])!=(b[1]>p[1]) and p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]:result=not result
 return result
def model(id,level,transform):
 rooms=[];furniture=[]
 def add(code,name,kind,poly,door,**kwargs):
  polygon=[transform(p) for p in poly];p=transform(door)
  r=dict(id=f'{id}{level}-{code}',name=name,kind=kind,polygon=polygon,center=[round(sum(v[i] for v in polygon)/len(polygon),3) for i in range(2)],door=border(p,polygon),**kwargs)
  rooms.append(r);return r
 def furn(kind,x,y,w,d,angle=0):furniture.append(dict(kind=kind,point=transform([x,y]),width=w*abs(transform([1,0])[0]-transform([0,0])[0]),depth=d*abs(transform([0,1])[1]-transform([0,0])[1]),angle=angle))
 return rooms,furniture,add,furn
lh=next(b for b in data if b['id']=='LH')
for r in lh['floors'][0]['rooms']:
 if r['id']=='LH1-South lobby':
  r.update(name='Byte 75',kind='food',details='Byte 75 restaurant · Floor 1. Location confirmed by the user.')
for lev in [2,3]:
 ox,oy=(715,520) if lev==2 else (726,510)
 t=lambda p:[round((p[0]-ox)*.1-11,3),round((p[1]-oy)*.1-18,3)]
 rooms, furniture, add, furn=model('LH',lev,t)
 # Register service cores to Floor 1. Upper floor outlines include the oval wing.
 north=360 if lev==2 else 340;bottom=1083 if lev==2 else 1057
 outline=[[300,north],[590,north],[590,392 if lev==2 else north],[1370 if lev==2 else 1395,392 if lev==2 else north],[1370 if lev==2 else 1395,840],[1260,845]]
 # Continuous external outline follows oval southeast extension and bowed west wing.
 outline += [[1260+145*math.cos(a),985+135*math.sin(a)] for a in [(-math.pi/2)+i*(1.5*math.pi)/24 for i in range(25)]]
 outline += [[1100,bottom],[550,bottom],[550,965],[440,975],[350,943],[295,870],[280,740],[280,620],[300,540],[300,north]] if lev==2 else [[1100,bottom],[290,bottom],[290,north]]
 # Atrium follows the actual L/notched void; no study-room fill over open space.
 atrium= [[745,618],[1146,618],[1146,825],[1060,825],[1060,795],[945,795],[945,825],[745,825]] if lev==2 else [[765,615],[970,615],[970,642],[1073,642],[1073,615],[1168,615],[1168,825],[991,825],[991,795],[811,795],[811,825],[765,825]]
 # floor 2 gallery is a curved seating band around the lecture theatre volume.
 if lev==2:
  west_outer=ellipse(448,733,165,238);west_inner=[[305,652],[357,611],[416,561],[440,536],[478,542],[512,571],[530,643],[535,735],[515,817],[475,878],[428,905],[375,862],[329,815],[305,787]]
  gallery=add('gallery','Upper lecture theatre gallery','lecture',west_outer,[619,715],holes=[[t(p) for p in west_inner]])
  gallery['center']=t([577,735])
  holes=[atrium,west_inner]
 else:
  west_outer=[[366,611],[410,557],[432,522],[486,496],[528,512],[570,556],[602,619],[620,684],[620,759],[594,841],[560,902],[519,938],[473,928],[440,885],[402,850],[365,810]]
  gallery=add('west-study','West hallway','hallway',west_outer,[635,705],open=True,details='Open hallway, confirmed by the user; not a study lounge.')
  gallery['center']=t([480,706]);holes=[atrium]
  # The west hallway runs beside the office row.
  for i,(a,b) in enumerate(zip([501,533,568,603,640,674,708,738,810,874,907,953],[533,568,603,640,674,708,738,810,874,907,953,995])):
   add(f'west-{i}','Office','office',rect(292,a,348,b),[358,(a+b)/2])
  for i in range(6):add(f'southwest-{i}','Office','office',rect(292+i*45,999,335+i*45,1055),[314+i*45,986])
 # Perimeter north offices and interior row, accurately spaced to each source.
 starts=[589,632,674,715,754,796,838,880,922,964,1007,1050,1091] if lev==2 else [601,644,687,729,771,813,855,897,939,981,1023,1066,1108,1150]
 for i,a in enumerate(starts):add(f'north-{i}','Office','office',rect(a,north if lev==3 else 394,a+40,448 if lev==2 else 398),[a+20,458 if lev==2 else 407])
 for i in range(10 if lev==2 else 11):
  a=745+i*43 if lev==2 else 760+i*40
  add(f'inner-{i}','Office','office',rect(a,563,a+41,615),[a+20,548])
 if lev==2:
  for i,(a,b) in enumerate([(672,745),(747,794),(797,843),(846,893),(896,949),(952,1007),(1010,1053),(1056,1125),(1128,1158),(1160,1179)]):
   add(f'core-{i}','Office','office',rect(a,469,b,500 if i==0 else 533),[(a+b)/2,547])
  add('northwest-room','Northwest meeting room','classroom',rect(301,363,431,453),[410,475])
  # The oval is on the drawing despite a contradictory LH3094 annotation.
  oval=add('oval','Oval theatre · source label LH3094','lecture',ellipse(1245,986,123,121),[1120,995],routeable=False,details='The Floor 2 sheet labels this theatre LH3094. Floor assignment needs verification; the shape is preserved here.')
 else:
  add('northwest-room','Northwest meeting room','classroom',rect(292,343,443,449),[422,474])
  for i,(a,b) in enumerate([(760,863),(865,968),(970,1073)]):add(f'seminar-{i}',f'Seminar room {chr(65+i)}','classroom',rect(a,419,b,530),[(a+b)/2,549])
  for i in range(3):add(f'core-{i}','Office','office',rect(1076+i*36,421,1110+i*36,530),[1092+i*36,547])
  oval=add('3094','LH 3094','lecture',ellipse(1268,997,138,128),[1140,1000]);oval['id']='LH3094'
 # Southern teaching rooms include their small service strips above.
 ranges=[(678,815),(819,950),(953,1090)] if lev==2 else [(694,830),(832,970),(974,1106)]
 for i,(a,b) in enumerate(ranges):
  name=f'LH {2066+i*2}' if lev==2 else ('LH 3098' if i==1 else f'South lecture room {chr(65+i)}')
  r=add(f'south-{i}',name,'lecture',rect(a,944 if lev==2 else 917,b,bottom),[(a+b)/2,925 if lev==2 else 903])
  if name.startswith('LH '):r['id']=name.replace(' ','')
  add(f'south-service-{i}','Office','office',rect(a+15,895 if lev==2 else 875,b-24,940 if lev==2 else 915),[(a+b)/2,869 if lev==2 else 858])
 # Office blocks east of the atrium (not the old single thin generic strip).
 for i in range(5):
  y=602+i*38 if lev==2 else 609+i*38
  add(f'east-{i}','Office','office',rect(1318,y,1368 if lev==2 else 1390,y+35),[1299,y+17])
 for i in range(4):
  y=605+i*47
  add(f'east-inner-{i}','Office','office',rect(1225 if lev==2 else 1250,y,1295 if lev==2 else 1305,y+44),[1210 if lev==2 else 1237,y+22])
 # Lift boundary is fixed across sheets: same physical shaft as existing floor 1.
 lift=add('lift','Elevators','elevator',rect(ox-30,oy-20,ox+30,oy+10),[ox,oy+10],connector='lh-elevator');lift['polygon']=rect(-14,-21,-8,-18);lift['center']=[-11,-19.5];lift['door']=[-11,-18]
 add('washroom','Washrooms','washroom',rect(435 if lev==2 else 446,north,583 if lev==2 else 597,462 if lev==2 else 458),[527,475])
 for key,poly,door in [('northwest',rect(303,455,394,502),[410,484]),('southwest',rect(552,964,604,1049),[630,950]),('northeast',rect(1258,550,1368,598),[1237,575]),('southeast',rect(1256,798,1368,840),[1237,821])]:
  add(key,'Stairs','stairs',poly,door,connector='lh-'+key)
 add('atrium-stairs','Atrium stairs · connection unverified','stairs',rect(685 if lev==2 else 701,630,738 if lev==2 else 750,792),[674 if lev==2 else 685,715],routeable=False)
 # Curved benches/tables and tiered theatre rows visibly distinguish these floors.
 for j in range(8):
  for i in range(15):
   angle=-1.12+i*2.24/14;rx=(130+j*4) if lev==2 else (70+j*6);ry=(185+j*5) if lev==2 else (153+j*5)
   x=(417 if lev==2 else 427)+rx*math.cos(angle);y=726+ry*math.sin(angle)
   if lev==2 and inside([x,y],west_outer) and not inside([x,y],west_inner):furn('bench',x,y,10,3,math.atan2(ry*math.cos(angle),-rx*math.sin(angle)))
 for row in range(8):
  # Parallel seat bands clipped inside the oval rather than overlapping diagonal bars.
  for col in range(7):
   x=1167+col*24;y=938+row*14-col*9
   if ((x-(1245 if lev==2 else 1268))/100)**2+((y-986)/100)**2<.9:furn('bench',x,y,21,3,-.36)
 xwest=645 if lev==2 else 660;xeast=1205 if lev==2 else 1220;ynorth=458 if lev==2 else 407
 lines=[[[410,482],[xwest,482],[xwest,ynorth],[xeast,ynorth]],[[xwest,ynorth],[xwest,549],[xeast,549]],[[xwest,549],[xwest,715],[xwest,869 if lev==2 else 858],[xeast,869 if lev==2 else 858]],[[xeast,ynorth],[xeast,549],[xeast,715],[xeast,869 if lev==2 else 858]],[[xwest,549],[ox,549],[ox,oy+10]],[[xeast,715],[1299,715],[1299,788],[xeast,788]],[[xeast,869 if lev==2 else 858],[1110,869 if lev==2 else 858],[1110,996]],[[xwest,869 if lev==2 else 858],[xwest,950],[630,950]]]
 if lev==3:lines += [[[410,482],[358,482],[358,986],[550,986],[550,950],[xwest,950]]]
 f=dict(level=lev,label=f'Floor {lev}',outline=[t(p) for p in outline],holes=[[t(p) for p in h] for h in holes],rooms=rooms,corridors=[[t(p) for p in line] for line in lines],furniture=furniture,blueprint=f'/blueprints/lazaridis-{lev}.webp')
 lh['floors'][lev-1]=f
# Library plans: Albert Street at top, north at right. Pixel registration keeps shafts aligned.
lib=[]
t=lambda p:[round((p[0]-280)*.19,3),round((p[1]-210)*.19,3)]
for lev in range(1,8):
 rooms,furniture,add,furn=model('LIB',lev,t)
 outline=[[2,30],[560,30],[560,134],[596,134],[596,201],[560,201],[560,389],[2,389]]
 def box(code,name,kind,a,b,c,d,door,**kw):return add(code,name,kind,rect(a,b,c,d),door,**kw)
 def area(code,name,a,b,c,d,door):return box(code,name,'study',a,b,c,d,door,open=True)
 # Core positions are fixed across all seven levels, not inferred from GPS.
 box('stairs','Main stairs','stairs',414,124,454,211,[414,215],connector='library-stairs')
 box('lift','Elevator','elevator',561,134,595,201,[561,200],connector='library-elevator')
 if lev==1:
  box('washroom','Washrooms','washroom',268,151,412,208,[345,216])
  box('115','1-115 · Staff office','office',484,128,537,209,[490,216],routeable=False)
  box('122','1-122 · Archives reading area','study',3,118,93,187,[85,196])
  box('archives-staff','Archives staff area','office',3,31,93,117,[88,117],routeable=False)
  for i,(a,b) in enumerate([(3,39),(41,82),(84,127),(129,170)],101):box(str(i),f'1-{i} · Staff office','office',a,209,b,263,[(a+b)/2,220],routeable=False)
  box('105','1-105 · Staff office','office',228,234,267,290,[247,233],routeable=False)
  box('106','1-106 · Boardroom','office',270,234,337,297,[330,233],routeable=False)
  area('technical','1-100 · Technical services (staff)',3,267,267,388,[185,234])['routeable']=False
  box('lounge','Staff lounge','office',270,299,360,388,[336,298],routeable=False)
  for code,poly in [('109',rect(363,235,436,388)),('114',rect(459,235,558,301)),('113',rect(509,303,558,338)),('112',rect(464,340,558,388))]:add(code,f'1-{code} · Staff office','office',poly,[445,233],routeable=False)
  area('diginit','DIGINIT (staff)',438,303,509,338,[446,300])['routeable']=False
  lines=[[[6,197],[180,197],[180,220],[470,220],[546,220],[546,200],[561,200]]]
 elif lev==2:
  box('entrance','Main entrance · Floor 2','entrance',273,335,367,389,[320,335])
  box('207','2-207 · Learning Lab','classroom',3,31,88,109,[88,100])
  box('205','2-205 · Makerspace','classroom',3,111,88,163,[88,156])
  box('202','2-202','office',3,211,46,268,[46,256])
  # Curved gallery corner follows entrance-level plan.
  gallery=[[3,270],[45,270],[45,212],[92,212]]+[[92+65*math.cos(a),278+66*math.sin(a)] for a in [-math.pi/2+i*math.pi/2/12 for i in range(13)]]+[[175,278],[175,389],[3,389]]
  add('gallery','Robert Langen Art Gallery','study',gallery,[175,290],open=True)
  area('holds','Holds & reserves',177,301,271,388,[272,319])
  area('cafe','Café',370,303,462,388,[370,319])
  box('210','2-210','office',186,169,235,209,[186,196])
  add('desk','Service desk','study',[[184,154],[271,154],[271,209],[235,209],[235,169],[184,169]],[224,214],open=True)
  box('215','2-215','office',462,121,516,165,[507,120]);box('214','2-214','office',462,167,516,211,[507,211])
  box('accessible','Accessible washroom','washroom',340,189,373,214,[352,215])
  box('admin','2-213 · Administration','office',465,286,556,338,[511,340],routeable=False)
  add('213A','2-213A','office',[[505,267],[540,233],[556,233],[556,299],[524,299],[524,283]],[511,278])
  box('213C','2-213C · University Librarian','office',465,340,556,388,[505,340],routeable=False)
  area('reference','Reference collection & computers',300,32,549,109,[300,115])
  area('tables','Study tables',101,40,300,151,[305,149])
  area('self-check','Self check',290,270,330,295,[310,296])
  furn('counter',228,158,87,8);furn('counter',267,185,8,52)
  for x in [182,227,272]:furn('table',x,76,25,42)
  for y in [71,91]:
   for x in range(388,545,22):furn('desk',x,y,15,10)
  for x in [349,386,411,435,459,484,508,532]:furn('desk',x,40,12,7)
  lines=[[[90,198],[176,220],[300,220],[405,220],[535,220],[546,220],[546,200],[561,200]],[[320,335],[320,319],[286,319],[286,250],[300,220]],[[320,319],[370,319]],[[300,220],[300,149],[305,115],[540,115],[540,220]],[[90,198],[97,156],[97,100],[97,39],[305,39],[305,115]],[[286,250],[462,250],[503,267]],[[300,220],[224,214]],[[405,220],[414,215]]]
 elif lev==3:
  box('320','3-320','office',111,31,153,68,[111,61]);box('319','3-319','office',111,70,153,109,[150,110])
  box('318','3-318 · Interlibrary loans','study',155,31,195,109,[165,110])
  box('314','3-314 · Instruction room','classroom',197,31,325,109,[312,110])
  box('300','3-300 · Graduate Commons','study',328,31,560,110,[370,111])
  for i in range(3):box(str(317-i),f'3-{317-i} · Individual study','study',198+i*29,126,226+i*29,157,[213+i*29,123])
  for code,a,b,c,d,door in [('321',121,126,159,162,[131,123]),('322',161,126,197,162,[181,123]),('323',121,164,159,197,[125,201]),('324',161,164,197,197,[186,201]),('306',200,171,251,197,[215,201])]:box(code,f'3-{code}'+(' · Accessibility Services' if code=='306' else ''),'office',a,b,c,d,door)
  box('300G','3-300G · Reserves processing','office',455,133,520,206,[455,204],routeable=False)
  for i,(a,b) in enumerate([(3,31),(33,68),(70,107),(109,141),(143,177)],301):box(str(i),f'3-{i}','study',a,342,b,388,[(a+b)/2,340])
  for code,a,b in [('310',371,418),('311',420,457),('312A',459,492),('312B',494,528),('312C',530,560)]:box(code,f'3-{code}','office',a,342,b,388,[(a+b)/2,340])
  area('gov','Government documents',21,34,100,337,[101,216]);area('microform','Microform',104,225,192,306,[194,216]);area('computers','Computers & Datastream',207,236,539,313,[306,223])
  for y in range(84,319,23):furn('shelf',68,y,48,8)
  for x in range(115,194,18):furn('shelf',x,268,10,78)
  for x in [272,318]:furn('table',x,274,26,77)
  for x in [361,382,407,429]:
   for y in range(246,310,15):furn('desk',x,y,14,9)
  for x in [460,480,500,520]:
   for y in range(247,310,15):furn('desk',x,y,13,8)
  for x in [187,211,240,268,300,328,350]:
   for y in [351,375]:furn('desk',x,y,15,12)
  lines=[[[101,216],[194,216],[306,216],[405,220],[546,220],[546,200],[561,200]],[[101,216],[101,119],[131,119],[213,119],[306,119],[540,119],[540,220]],[[306,119],[306,216],[306,223]],[[101,216],[101,331],[194,331],[306,331],[546,331],[546,220]],[[194,216],[194,331]],[[405,220],[414,215]]]
 else:
  for i in range(2 if lev==7 else 3):
   number=(712-i) if lev==7 else lev*100+13-i
   box(str(number),f'{lev}-{number} · Individual study','study',198+i*22,127,219+i*22,156,[209+i*22,123])
  for number,a,b in [(lev*100+(8 if lev==4 else 7),132,168),(lev*100+(6 if lev==4 else 5),170,207)]:box(str(number),f'{lev}-{number} · Group study','study',455,a,507,b,[501,a])
  if lev==4:
   box('415','4-415 · Meeting room','office',363,272,447,308,[363,297])
   box('414','4-414 · Music, LP & film collection','study',448,272,560,388,[453,273])
   add('416','4-416 · WLU Press','office',[[278,311],[391,311],[391,388],[278,388]],[330,311],routeable=False)
   box('416A','4-416A','office',393,311,447,350,[394,330],routeable=False);box('416B','4-416B','office',393,353,447,388,[394,372],routeable=False)
   area('journals','Journals',32,226,191,359,[195,220]);area('music','Music books, scores & media',203,59,527,112,[306,116])
   for y in [251,326]:
    for x in range(45,185,23):furn('shelf',x,y,12,57)
   for x in [120,139,163,181]:
    for y in [135,157,179,199]:furn('desk',x,y,14,9)
   for x in [226,244,296,315,337,355]:
    for y in [241,258]:furn('desk',x,y,14,9)
   for x in [220,252]:
    for y in [296,331,366]:furn('table',x,y,19,22)
   for x in [393,432,473,514]:furn('table',x,256,24,15)
  else:
   area('quiet','Quiet study area',22,126,177,200,[180,220])
   if lev==5:box('501','5-501 · Corpus Christianorum','study',198,173,252,198,[206,201])
   labels={5:['DS – GV','BV – DS','A – BV'],6:['JX – PN','HN – JV','H – HN'],7:['QL – Z','PT – QL','PQ – PT']}[lev]
   area('collection-north','Books · '+labels[0],33,58,515,112,[306,116])
   area('collection-middle','Books · '+labels[1],32,238,530,293,[306,301])
   area('collection-south','Books · '+labels[2],32,313,530,360,[306,304])
   for y in [265,335]:
    for x in range(45,535,23):furn('shelf',x,y,11,55)
   for y in range(135,200,15):
    for x in range(35,171,31):furn('desk',x,y,23,8)
   if lev==5:
    for x in [473,513]:
     for y in [74,102]:furn('table',x,y,23,17)
  if lev==4:area('collection-north','Journals · PN – ZA',33,58,191,112,[193,116])
  for x in range(52,524 if lev==4 else 443,23):furn('shelf',x,86,11,53)
  lines=[[[20,220],[180,220],[306,220],[405,220],[546,220],[546,200],[561,200]],[[20,220],[20,116],[180,116],[306,116],[540,116],[540,220]],[[306,116],[306,220],[306,301]],[[20,220],[20,304],[195,304],[306,304],[306,301]],[[546,220],[546,263],[453,263]],[[405,220],[414,215]]]
 # Toilets immediately left of the stairs on upper levels.
 if lev>=3:
  box('washroom','Washrooms','washroom',370,126,412,210,[370,215]);box('accessible','Accessible washroom','washroom',338,183 if lev<5 else 127,368,211 if lev<5 else 155,[338,197 if lev<5 else 145])
 # Side exit staircase is only a landmark: continuity is not shown by these plans.
 box('exit','West exit · connection unverified','entrance',3,190,20,208,[20,199],routeable=False)
 # Perimeter reading carrels remain outside shelf aisles.
 if lev>=3:
  for x in range(20,553,27):furn('desk',x,41,17,7)
  for y in range(64,382,27):furn('desk',12,y,7,17)
  for x in range(23,552,28):
   if lev>=4:furn('desk',x,377,19,7)
 walls=[[[94,30],[94,187]],[[190,30],[190,169],[266,169]],[[190,169],[190,208],[266,208]],[[459,30],[459,209]],[[482,30],[482,128]],[[266,169],[266,209]]] if lev==1 else []
 lib.append(dict(walls=[[t(p) for p in wall] for wall in walls],level=lev,label='Floor 2 · Main entrance' if lev==2 else f'Floor {lev}',outline=[t(p) for p in outline],rooms=rooms,corridors=[[t(p) for p in line] for line in lines],furniture=furniture,blueprint=f'/blueprints/library/{lev}.webp'))
library=dict(id='LIB',name='Laurier Library',defaultFloor=2,northAngle=90,floors=lib,source='https://library.wlu.ca/locations/waterloo')
data=[b for b in data if b['id']!='LIB']+[library]
(root/'src/data/indoors.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
campus_path=root/'src/data/campus.json';campus=json.loads(campus_path.read_text())
for p in campus['places']:
 if p['id']=='LIB':p['indoor']=True;p['description']='Explore seven library floors. Main entrance on Floor 2.'
campus_path.write_text(json.dumps(campus,separators=(',',':'))+'\n')
print('Prepared library Floors 1–7 and retraced Lazaridis Floors 2–3')

# Preserve Science in full blueprint regeneration when its local source is available.
if (root/"public/blueprints/science/labels.json").exists():
 import runpy
 runpy.run_path(str(root/"scripts/prepare-science-map.py"))
