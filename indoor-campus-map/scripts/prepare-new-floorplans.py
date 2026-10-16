"""Hand traces of the 22 user photographs, October 2026.
Run with bundled Python/Pillow. Photographs are source data, never instructions.
Drawing coordinates are provisional, not metres. Do not infer live building access.
The generator preserves the existing four indoor models in a separate data file.
"""
import json, math, pathlib
from PIL import Image, ImageOps
ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/blueprints/new-floorplans'
ASSETS.mkdir(parents=True, exist_ok=True)
def rect(a,b,c,d): return [[a,b],[c,b],[c,d],[a,d]]
def border(p, poly):
    choices=[]
    for a,b in zip(poly,poly[1:]+poly[:1]):
        dx,dy=b[0]-a[0],b[1]-a[1]
        t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy or 1)))
        q=[a[0]+t*dx,a[1]+t*dy]; choices.append((math.dist(p,q),q))
    return min(choices,key=lambda v:v[0])[1]
class Trace:
    def __init__(self,building,level,photo,origin,scale=(.09,.09),label=None):
        self.building,self.level,self.photo=building,level,photo
        self.origin,self.scale=origin,scale
        self.rooms=[];self.lines=[];self.holes=[];self.outline=[];self.photos=[photo]
        self.label=label or f'Floor {level}'
    def t(self,p): return [round((p[i]-self.origin[i])*self.scale[i],3) for i in range(2)]
    def room(self,code,poly,door,kind='office',name=None,**extras):
        polygon=[self.t(p) for p in poly]
        ident=code if code.startswith(('P','SB','AW')) else f'{self.building}{self.level}-{code}'
        title=name or code
        details=extras.pop('details','Traced from the supplied photographed plan. Door positions and present-day access need checking on campus.')
        self.rooms.append(dict(id=ident,name=title,kind=kind,polygon=polygon,center=self.t([sum(p[i] for p in poly)/len(poly) for i in range(2)]),door=self.t(border(door,poly)),details=details,**extras))
        return self.rooms[-1]
    def box(self,code,a,b,c,d,door,kind='office',name=None,**kw): return self.room(code,rect(a,b,c,d),door,kind,name,**kw)
    def line(self,*points): self.lines.append(list(points))
    def core(self,code,box,door,kind,key): return self.room(code,rect(*box),door,kind,'Elevator' if kind=='elevator' else 'Stairs',connector=f'{self.building}-{key}')
    def finish(self):
        # Register the shared elevator door, rather than each camera's frame,
        # so stacked levels use the same shaft. These remain drawing units.
        lift=next((r for r in self.rooms if r['kind']=='elevator'),None)
        if lift:
            shift=lift['door'][:]
            lifts=[r for r in self.rooms if r['kind']=='elevator']
            xscale=6.3/(lifts[1]['door'][0]-shift[0]) if len(lifts)==2 else 1
            def registered(p): return [round((p[0]-shift[0])*xscale,3),round(p[1]-shift[1],3)]
            for room in self.rooms:
                for key in ['center','door']:room[key]=registered(room[key])
                room['polygon']=[registered(p) for p in room['polygon']]
        else:
            def registered(p):return p
        # A sharp, correctly oriented crop for comparison; full photographs stay available.
        original=Image.open(ASSETS/f'{self.photo}.webp')
        w,h=original.size
        points=self.outline
        xs=[p[0] for p in points]; ys=[p[1] for p in points]
        # Traces are authored against EXIF-oriented 1600px review images.
        factor=max(w,h)/1600
        crop=(max(0,int((min(xs)-35)*factor)),max(0,int((min(ys)-35)*factor)),min(w,int((max(xs)+35)*factor)),min(h,int((max(ys)+35)*factor)))
        im=original.crop(crop);im.thumbnail((2400,2400));path=f'{self.building.lower()}-{self.level}.webp';im.save(ASSETS/path,quality=94)
        return dict(level=self.level,label=self.label,outline=[registered(self.t(p)) for p in self.outline],holes=[[registered(self.t(p)) for p in q] for q in self.holes],rooms=self.rooms,corridors=[[registered(self.t(p)) for p in q] for q in self.lines],blueprint=f'/blueprints/new-floorplans/{path}',sourcePhotos=[f'/blueprints/new-floorplans/{p}.webp' for p in self.photos])

# Arts A/C/E and the Concourse are one connected indoor area. Each wing's name
# remains in room labels. Floor 1 and the upper-floor drawings have different extents.
a=Trace('ARTS',1,'IMG_1451',(855,720),(.115,.085),'Floor 1 · Concourse & Arts A/C/E')
a.photos=['IMG_1451','IMG_1452','IMG_1453','IMG_1454','IMG_1455','IMG_1456','IMG_1457']
a.outline=[[625,170],[700,170],[700,103],[1020,103],[1020,445],[1360,445],[1360,573],[1398,605],[1660,605],[1710,662],[1710,930],[1615,974],[1540,930],[1540,745],[973,745],[973,710],[867,710],[867,937],[670,937],[670,710],[350,710],[350,660],[625,660]]
a.room('concourse',[[625,175],[751,175],[751,330],[780,330],[780,415],[790,415],[790,625],[940,625],[940,140],[700,140],[700,175]], [940,255],'study','Concourse · 1E101 / 1E102',open=True)
a.box('1E1',670,735,866,934,[700,735],'lecture','1E1 · Lecture hall')
a.box('solarium',350,663,670,707,[650,685],'hallway','Toyota Solarium connecting link',open=True)
a.box('starbucks',636,179,748,278,[748,246],'food','Starbucks · Concourse',open=True)
a.box('hub',851,343,937,409,[937,374],'office','The Hub')
a.box('onecard',794,493,858,592,[825,592],'office','OneCard office')
# C-wing source labels and doors from IMG_1451/1452.
for code,x1,x2 in [('1C18',999,1115),('1C17',1117,1247),('1C16',1249,1358)]: a.box(code,x1,447,x2,545,[(x1+x2)/2,545],'classroom',code)
for code,x1,x2 in [('1C14',1042,1110),('1C15',1112,1194),('1C15B',1197,1328)]: a.box(code,x1,578,x2,630,[(x1+x2)/2,630])
for code,x1,x2 in [('1C12',977,1040),('1C11',1070,1126),('1C10',1128,1185),('1C09',1187,1238),('1C08',1240,1299),('1C07',1301,1395)]: a.box(code,x1,665,x2,742,[(x1+x2)/2,665],'office',f'{code} · Accessible Learning' if code=='1C11' else code)
# A-wing close-up is registered to the C-wing corridor junction.
for code,x1,y1,x2,y2,door,kind in [
 ('1A5',1653,659,1710,718,[1653,680],'study'),('1A1',1653,721,1680,754,[1653,735],'office'),('1A2',1653,758,1710,805,[1653,776],'office'),('1A3B',1653,851,1710,928,[1653,880],'office'),('1A3A',1545,851,1615,928,[1615,880],'office'),('1A4',1545,802,1615,847,[1615,825],'office'),('1A4A',1545,765,1615,800,[1615,781],'office'),('1A4B',1545,721,1615,762,[1615,741],'office')]:
    a.box(code,x1,y1,x2,y2,door,kind,'1A5 · Multi-faith room' if code=='1A5' else code)
a.core('lift',(842,710,868,733),[855,710],'elevator','lift')
a.core('stairs-e',(900,663,945,706),[922,663],'stairs','stairs-e')
a.core('stairs-c-west',(977,580,999,623),[999,601],'stairs','stairs-c-west')
a.core('stairs-c-east',(1350,579,1392,622),[1350,600],'stairs','stairs-c-east')
a.box('washroom-c',1004,582,1040,630,[1040,606],'washroom','Arts C washrooms')
a.box('washroom-e',864,493,937,570,[937,540],'washroom','Concourse washrooms')
a.box('entrance',668,636,704,661,[704,647],'entrance','Concourse entrance')
a.box('dawb-link',971,110,1020,140,[996,110],'entrance','To DAWB · Floor 1',open=True)
a.box('fncc-link',700,110,745,140,[700,125],'entrance','To Fred Nichols · reference only',routeable=False,open=True)
a.line([685,685],[855,685],[855,647],[955,647],[1370,647],[1395,625],[1640,625],[1640,935])
a.line([955,647],[955,558],[1338,558],[1338,647])
a.line([955,647],[955,125],[996,125],[996,110])
a.line([955,125],[720,125]);a.line([685,685],[855,685],[855,710])
arts=[a.finish()]

# Upper Arts plans share the elevator shaft and C-wing end stair. Unknown tiny
# suite labels are not promoted into invented classroom identifiers.
for level,photo,origin,scale in [(2,'IMG_1458',(348,852),(.09,.095)),(3,'IMG_1459',(660,810),(.073,.073))]:
    a=Trace('ARTS',level,photo,origin,scale,f'Floor {level} · Arts E & C')
    if level==2:
        a.outline=[[18,388],[300,388],[300,635],[488,635],[488,454],[985,454],[985,601],[1016,601],[1016,667],[1260,667],[1300,701],[1260,739],[1016,739],[1016,867],[441,867],[441,853],[299,853],[299,1120],[18,1120]]
        for code,y1,y2 in [('2E8',392,574),('2E7',576,664),('2E6',666,755),('2E5C',757,834),('2E5B',836,981),('2E5A',983,1110)]: a.box(code,21,y1,158,y2,[158,(y1+y2)/2])
        for code,y1,y2 in [('2E9',442,487),('2E10',489,532),('2E11',534,577),('2E12',579,636),('2E1',755,800),('2E2',802,844),('2E3',846,889),('2E4',891,935)]:a.box(code,210,y1,296,y2,[210,(y1+y2)/2])
        for code,x1,x2 in [('2C17',490,647),('2C16',649,830),('2C15',832,983)]:a.box(code,x1,457,x2,596,[(x1+x2)/2,596],'classroom',code)
        for code,x1,x2 in [('2C07',583,647),('2C08',649,690),('2C09',692,731),('2C10',733,777),('2C11',779,831),('2C12',833,885),('2C13',887,937)]:a.box(code,x1,640,x2,711,[(x1+x2)/2,711])
        for code,x1,x2 in [('2C04',480,724),('2C03',726,936),('2C02',938,976)]:a.box(code,x1,750,x2,865,[(x1+x2)/2,750],'office',code)
        a.core('lift',(325,829,371,875),[348,829],'elevator','lift')
        a.core('stairs-e',(283,753,441,799),[370,753],'stairs','stairs-e')
        a.core('stairs-c-west',(447,641,488,711),[488,680],'stairs','stairs-c-west')
        a.core('stairs-c-east',(979,640,1016,711),[979,679],'stairs','stairs-c-east')
        a.box('washroom',298,641,385,711,[350,711],'washroom','Arts E washrooms')
        a.box('peters-link',1230,689,1265,733,[1265,712],'entrance','To Peters · Floor 1',open=True)
        a.box('landing',159,703,210,750,[210,727],'entrance','Arts E stair landing · Floor 2',open=True)
        a.line([185,450],[185,1080]);a.line([185,727],[470,727],[996,727],[1250,712],[1265,712])
        a.line([506,727],[506,618],[957,618],[957,727]);a.line([454,727],[454,817],[348,817],[348,829])
    else:
        a.outline=[[214,166],[588,166],[588,499],[1530,516],[1555,602],[1530,816],[778,816],[778,725],[573,725],[573,1157],[194,1157]]
        for code,y1,y2 in [('3E14',170,350),('3E12',415,530),('3E8C',535,594),('3E10',610,707),('3E8B',785,963),('3E8A',966,1150)]:a.box(code,210,y1,394,y2,[394,(y1+y2)/2])
        for code,y1,y2 in [('3E15',237,300),('3E16',303,352),('3E17',356,420),('3E18',422,490),('3E1',660,718),('3E2',722,780),('3E3',783,841),('3E4',845,903),('3E5',906,965),('3E6',968,1025),('3E7',1028,1090)]:a.box(code,461,y1,572,y2,[461,(y1+y2)/2])
        for i,(x1,x2) in enumerate(zip([780,839,895,951,1005,1061,1120,1178,1235,1294,1350,1402],[837,893,949,1003,1059,1118,1176,1233,1292,1348,1400,1475])):
            code=['3C17','3C16','3C15','3C14','3C13','3C12','3C11','3C10B','3C10A','3C09A','3C09B','3C08'][i];a.box(code,x1,510,x2,605,[(x1+x2)/2,605])
        for code,x1,x2 in [('3C01',781,840),('3C02',842,1040),('3C03',1042,1098),('3C04',1100,1243),('3C05',1245,1313),('3C06',1315,1418),('3C07',1420,1526)]:a.box(code,x1,663,x2,813,[(x1+x2)/2,663])
        a.core('lift',(638,786,686,835),[660,786],'elevator','lift')
        a.core('stairs-e',(576,667,772,720),[660,667],'stairs','stairs-e')
        a.core('stairs-c-east',(1476,530,1528,603),[1476,580],'stairs','stairs-c-east')
        a.box('washroom',580,505,747,603,[670,603],'washroom','Arts E washrooms')
        a.box('landing',400,603,455,655,[455,633],'entrance','Arts E stair landing · Floor 3',open=True)
        a.line([428,190],[428,1080]);a.line([428,633],[777,633],[1500,633]);a.line([777,633],[777,760],[660,760],[660,786])
    arts.append(a.finish())

# Peters: retain its irregular north office wing, semicircular P110 theatre,
# circular upper-floor void and southeast office wing instead of a rectangular grid.
peters=[]
for level,photo,origin,scale in [(1,'IMG_1460',(636,1178),(.08,.08)),(2,'IMG_1464',(570,1258),(.08,.08)),(3,'IMG_1467',(624,1060),(.09,.09))]:
    p=Trace('P',level,photo,origin,scale,f'Floor {level} · Peters')
    if level==1:
        p.outline=[[330,215],[485,215],[485,305],[594,305],[594,473],[689,473],[689,570],[776,635],[776,785],[847,785],[847,857],[995,857],[995,1008],[943,1061],[1060,1155],[970,1247],[890,1177],[710,1250],[624,1290],[624,1170],[390,1170],[390,1070],[448,1015],[448,938],[340,938],[340,799],[249,799],[249,650],[159,650],[146,480],[224,480],[224,309],[330,309]]
        for code,box,door,kind in [
          ('P119',(226,311,338,442),[318,442],'office'),('P120',(432,310,595,473),[432,455],'classroom'),('P115',(155,485,308,643),[300,643],'classroom'),('P118',(430,476,577,603),[430,575],'office'),('P111',(579,476,688,570),[579,549],'office'),('P114',(251,648,367,791),[367,771],'office'),('P109',(347,840,446,935),[446,888],'office'),('P108',(534,893,597,967),[550,893],'office'),('P107',(534,970,605,1075),[534,1040],'office'),('P103',(768,795,844,950),[768,920],'office'),('P101',(876,864,991,986),[880,938],'office')]:p.room(code,rect(*box),door,kind,code)
        # Two separately labelled parts of the stepped lecture theatre share a boundary.
        arc=[[650,639],[695,648],[759,694],[771,788],[751,875],[651,935],[613,896],[588,849],[582,789],[588,730],[611,672]]
        p.room('P110',arc, [595,770],'lecture','P110 · Lecture theatre (P110A/B)')
        p.room('P104',[[722,963],[780,966],[817,1005],[770,1052],[704,994]],[745,973],'office','P104')
        p.room('lift',[[652,1127],[680,1108],[708,1133],[684,1155]],[652,1127],'elevator','Elevator',connector='P-lift')
        p.core('stairs-north',(331,215,383,268),[356,268],'stairs','stairs-north')
        p.core('stairs-east',(618,577,685,631),[618,608],'stairs','stairs-east')
        p.core('stairs-west',(343,798,414,844),[414,820],'stairs','stairs-west')
        p.core('stairs-south',(625,1200,694,1277),[650,1200],'stairs','stairs-south')
        p.room('washroom',[[649,1049],[672,1024],[702,1055],[679,1079]],[649,1049],'washroom','Peters washrooms')
        p.box('schlegel-link',393,1075,440,1133,[393,1105],'entrance','To Schlegel · Floor 1',open=True)
        p.box('arts-link',676,1178,710,1200,[676,1190],'entrance','To Arts · Floor 2',open=True)
        p.box('entrance',448,1140,535,1170,[488,1170],'entrance','Peters south entrance')
        p.line([356,268],[356,460],[400,460],[400,712],[490,712],[490,1105],[440,1105],[393,1105])
        p.line([490,1105],[615,1105],[630,1032],[666,990],[715,952],[756,952],[756,960],[850,960],[850,1000],[923,1000]);p.line([850,960],[850,938]);p.line([615,1105],[615,1170],[637,1170],[676,1190]);p.line([615,1105],[652,1127]);p.line([615,1105],[615,1200],[650,1200])
        p.line([400,712],[490,820]);p.line([400,712],[575,712],[575,608],[618,608]);p.line([490,712],[490,820],[414,820])
    else:
        if level==2:
            p.photos=['IMG_1464','IMG_1465','IMG_1466'];ox,oy=0,0
            p.outline=[[221,290],[384,290],[384,330],[485,330],[485,535],[586,535],[586,682],[685,682],[685,844],[779,844],[779,914],[845,914],[845,979],[1090,979],[1148,1028],[1194,1110],[1113,1210],[1009,1143],[951,1235],[740,1197],[639,1380],[548,1435],[548,1330],[360,1330],[354,1103],[267,1103],[267,975],[156,975],[156,800],[46,800],[46,519],[128,519],[128,340],[221,340]]
            void=[424+74*math.cos(i*math.pi/24) for i in range(48)]
            p.holes=[[[424+74*math.cos(i*math.pi/24),828+74*math.sin(i*math.pi/24)] for i in range(48)]]
            roomdefs=[('P224',(564,904,687,1062),[564,949]),('P226',(352,944,510,1067),[352,1004]),('P225',(334,635,389,714),[334,695]),('P234',(617,684,682,745),[617,721]),('P233',(617,747,682,797),[617,777]),('P232',(617,800,682,848),[617,827]),('P231',(617,851,682,877),[617,870]),('P230',(710,850,778,943),[710,919]),('P228',(760,945,844,976),[760,960])]
            p.box('north-suite',148,378,388,535,[280,535],'office','North office suite · doors unverified',routeable=False)
            p.box('west-suite',151,577,280,741,[280,700],'office','West office suite · doors unverified',routeable=False)
            core=[570,1258];northstairs=(536,666,586,738);weststairs=(238,926,318,974);southstairs=(551,1384,639,1435)
            p.line([400,368],[400,549],[507,549],[507,754],[570,754],[570,892],[699,892],[699,1080],[1067,1058])
            p.line([507,754],[310,754],[230,754],[230,893],[330,893],[330,1080],[530,1080],[530,1258],[530,1327],[570,1327])
            p.line([530,1080],[699,1080]);p.line([530,1230],[570,1230],[570,1238]);p.line([530,1258],[377,1258],[360,1258])
            portal=[360,1258]
        else:
            p.outline=[[400,330],[521,330],[521,366],[594,366],[594,505],[665,505],[665,646],[732,646],[732,767],[794,767],[794,821],[845,821],[845,886],[1046,886],[1107,935],[1044,1008],[815,1008],[721,1070],[663,1164],[614,1227],[560,1180],[460,1180],[460,1090],[248,1090],[248,1018],[457,1018],[457,948],[405,948],[405,824],[331,824],[331,703],[266,703],[266,500],[329,500],[329,366],[400,366]]
            p.holes=[[[533+53*math.cos(i*math.pi/24),740+53*math.sin(i*math.pi/24)] for i in range(48)]]
            roomdefs=[('P344',(403,408,454,477),[403,453]),('P337',(456,408,519,477),[519,453]),('P351',(335,541,421,598),[335,570]),('P357',(335,600,421,668),[335,635]),('P358',(423,541,486,668),[486,630]),('P359',(515,543,588,644),[588,615]),('P331',(610,507,662,615),[610,572]),('P329',(653,647,729,780),[653,753]),('P360',(336,691,388,788),[388,769]),('P361',(405,691,454,780),[454,759]),('P364',(477,800,584,916),[477,866]),('P327',(613,800,742,889),[613,875]),('P328',(744,827,841,916),[744,893])]
            p.core('stairs-north',(616,615,662,679),[616,654],'stairs','stairs-east')
            core=[624,1060];northstairs=(616,615,662,679);weststairs=(372,813,445,860);southstairs=(615,1150,673,1210)
            p.line([393,396],[530,396],[530,530],[601,530],[601,679],[620,679],[620,787],[601,787],[601,940],[601,1025],[601,1120],[624,1120]);p.line([601,1025],[624,1025],[624,1040])
            p.line([393,396],[393,530],[324,530],[324,679],[469,679],[469,787],[469,940],[601,940])
            p.line([601,940],[715,940],[1015,950]);p.line([469,940],[469,1060],[601,1060]);p.line([398,679],[398,800],[469,800]);p.line([469,1060],[460,1060]);portal=[460,1060]
        for code,box,door in roomdefs:p.room(code,rect(*box),door,'office',code)
        # Source-visible small perimeter offices; labels retained only when legible.
        if level==3:
            for i in range(4):p.box(f'north-office-{i}',333,370+i*36,382,403+i*36,[382,386+i*36],name='Office',routeable=False)
            for i in range(6):p.box(f'east-office-{i}',828+i*35,889,859+i*35,934,[842+i*35,934],name='Office',routeable=False)
        if level==2:p.room('lift',[[580,1277],[607,1254],[635,1281],[606,1303]],[580,1277],'elevator','Elevator',connector='P-lift')
        else:p.room('lift',[[633,1091],[658,1068],[684,1092],[655,1117]],[633,1091],'elevator','Elevator',connector='P-lift')
        if level==2:p.core('stairs-east',northstairs,[northstairs[0],(northstairs[1]+northstairs[3])/2],'stairs','stairs-east')
        p.core('stairs-west',weststairs,[weststairs[2],(weststairs[1]+weststairs[3])/2],'stairs','stairs-west')
        p.core('stairs-south',southstairs,[southstairs[0],southstairs[1]],'stairs','stairs-south')
        p.box('washroom',core[0]+20,core[1]-60,core[0]+90,core[1]-5,[core[0]+20,core[1]-35],'washroom','Peters washrooms')
        p.box('schlegel-link',portal[0]-15,portal[1]-15,portal[0]+15,portal[1]+15,portal,'entrance',f'To Schlegel · Floor {level}',open=True)
        p.box('landing',core[0]-50,core[1]+35,core[0]-10,core[1]+65,[core[0]-10,core[1]+50],'entrance',f'Peters south landing · Floor {level}',open=True)
    for room in p.rooms:
        if room['id']=='P107':
            room['name']='P107 · Service Laurier'
            room['details']='Service Laurier, identified by you beside the Peters elevators and Arts arrival route. Room geometry is traced from IMG_1460.'
    peters.append(p.finish())

# Schlegel: all THREE floors are distinct; IMG_1463 contains SB3xx identifiers.
schlegel=[]
for level,photo,origin,scale in [(1,'IMG_1461',(877,377),(.075,.075)),(2,'IMG_1462',(748,577),(.105,.105)),(3,'IMG_1463',(970,421),(.09,.09))]:
    s=Trace('SC',level,photo,origin,scale,f'Floor {level} · Schlegel')
    if level==1:
        s.outline=[[95,93],[836,83],[836,276],[1190,573],[1315,604],[1245,690],[1450,904],[1308,1035],[1085,807],[846,1050],[210,1052],[210,904],[112,904]]
        s.holes=[[[490,422],[646,422],[740,515],[739,647],[665,724],[438,724],[438,478],[490,478]]]
        s.room('SB106',[[97,95],[494,91],[462,337],[420,337],[347,414],[347,493],[254,493],[223,473],[104,498]],[444,336],'lecture','SB106')
        s.room('SB107',[[497,91],[833,87],[833,265],[746,356],[720,337],[467,337]],[700,337],'lecture','SB107')
        s.room('SB105',[[104,501],[223,475],[345,548],[345,704],[214,732],[112,731]],[345,680],'lecture','SB105')
        s.room('SB103',[[212,817],[514,818],[514,1051],[210,1051]],[475,818],'lecture','SB103')
        s.room('SB102',[[594,802],[898,802],[898,869],[1056,935],[845,1051],[595,1051]],[680,802],'office','SB102')
        s.room('SB101',[[901,800],[1070,803],[969,919],[899,872]],[937,800],'office','SB101')
        s.box('SB104',256,704,354,737,[305,737]);s.box('SB108',791,381,862,445,[791,420]);s.room('SB109',[[866,381],[978,474],[866,536],[824,491]],[837,480],'washroom','Schlegel washroom');s.room('SB110',[[981,478],[1062,547],[976,620],[918,571]],[950,581],'washroom','Schlegel washroom')
        lift=(842,335,916,407);stairswest=(113,737,210,904);stairseast=(1039,573,1135,663);portal=[1270,772]
        s.line([233,772],[390,772],[785,772],[1060,741],[1270,772]);s.line([390,772],[390,445],[455,382],[750,382],[806,334]);s.line([750,382],[790,500],[925,640],[1080,697],[1060,741])
    elif level==2:
        s.outline=[[220,374],[732,378],[732,512],[992,795],[943,845],[913,885],[871,845],[716,1028],[299,1032],[299,932],[234,932]]
        s.holes=[[[456,608],[593,608],[662,681],[662,817],[456,817]]]
        for code,box,door,kind in [('SB210',(223,377,445,553),[435,553],'office'),('SB212',(449,378,637,553),[628,553],'office'),('SB213',(640,379,731,513),[670,543],'office'),('SB208',(227,557,400,767),[400,735],'office'),('SB205',(333,771,400,817),[363,817],'office'),('SB206',(233,772,306,817),[306,804],'office')]:s.room(code,rect(*box),door,kind,code)
        s.room('SB204',[[300,872],[509,872],[509,1030],[299,1032]],[470,872],'lecture','SB204')
        s.room('SB203',[[512,872],[710,872],[710,1027],[510,1030]],[644,872],'lecture','SB203')
        s.room('SB201',[[892,721],[989,795],[968,816],[886,816]],[886,800])
        s.room('SB202',[[713,819],[871,845],[715,1028]],[747,819])
        s.room('SB218',[[715,731],[783,782],[715,812]],[715,781])
        lift=(718,544,778,602);stairswest=(234,817,299,932);stairseast=(830,687,922,765);portal=[928,845]
        s.room('washroom-a',[[780,594],[831,643],[776,693],[723,645]],[738,659],'washroom','Schlegel washroom A')
        s.room('washroom-b',[[834,645],[893,699],[835,745],[782,696]],[803,716],'washroom','Schlegel washroom B')
        s.line([320,846],[427,846],[692,846],[692,817],[807,817],[849,824],[928,845]);s.line([427,846],[427,584],[660,584],[718,544]);s.line([660,584],[692,640],[692,846]);s.line([692,640],[807,780],[849,824])
    else:
        s.outline=[[146,80],[935,80],[935,327],[1250,635],[1254,779],[1327,779],[1250,880],[1095,778],[927,1093],[295,1093],[295,955],[204,955]]
        s.holes=[[[453,469],[743,469],[831,558],[831,850],[453,850]]]
        for code,box,door in [('SB304F',(284,83,431,387),[431,374]),('SB305',(435,83,749,387),[568,387]),('SB306',(753,83,935,323),[856,345]),('SB304',(291,390,431,549),[431,480]),('SB304A',(337,550,446,710),[446,620]),('SB302E',(346,796,451,953),[451,865])]:s.room(code,rect(*box),door,'classroom' if code=='SB305' else 'office',code)
        for code,y1,y2 in [('SB304E',392,469),('SB304D',471,625),('SB304C',627,704),('SB304B',707,782)]:s.box(code,194,y1,286,y2,[286,(y1+y2)/2])
        s.room('SB302',[[453,858],[928,858],[928,1093],[298,1093],[298,955],[453,955]],[874,858])
        s.room('SB310',[[913,649],[945,649],[1061,764],[962,858],[913,811]],[913,697])
        s.room('SB301',[[1220,667],[1335,750],[1288,779],[1171,779]],[1235,779],routeable=False,details='Label visible; the connecting suite door is unclear in the photo.')
        lift=(929,379,1009,462);stairswest=(206,813,295,955);stairseast=(1110,595,1217,683);portal=[1215,819]
        s.room('washroom-a',[[994,447],[1090,532],[1010,575],[931,518]],[954,533],'washroom','Schlegel washroom A')
        s.room('washroom-b',[[1097,544],[1163,589],[1074,661],[1016,610]],[1058,644],'washroom','Schlegel washroom B')
        s.line([473,427],[797,427],[858,377]);s.line([797,427],[872,550],[872,809],[901,809]);s.line([872,550],[1073,729],[1139,810],[1215,819])
        s.box('west-landing',294,782,339,820,[339,805],'entrance','West stair landing · corridor access unverified',routeable=False)
        for room in s.rooms:
            if room['id'] in ['SB304A','SB304B','SB304C','SB304D','SB304E','SB302E']:
                room['routeable']=False;room['details']='Suite doorway visible; public corridor continuity is unclear. Reference landmark only.'
            if room['id']=='SB304F':room['door']=s.t([431,387])
    s.core('lift',lift,[lift[0],(lift[1]+lift[3])/2],'elevator','lift')
    s.core('stairs-west',stairswest,[stairswest[2],stairswest[1]+25],'stairs','stairs-west')
    if level==3:s.rooms[-1]['routeable']=False
    s.core('stairs-east',stairseast,[stairseast[0],stairseast[3]],'stairs','stairs-east')
    s.box('peters-link',portal[0]-20,portal[1]-20,portal[0]+20,portal[1]+20,[portal[0]+20,portal[1]],'entrance',f'To Peters · Floor {level}',open=True)
    s.box('entrance',portal[0]-30,portal[1]+20,portal[0],portal[1]+40,[portal[0],portal[1]+30],'entrance',f'Schlegel entrance / landing · Floor {level}',open=True)
    schlegel.append(s.finish())

# DAWB 1–5. All five assignments confirmed by the user and AW1/AW2/AW3/AW4
# labels; Floor 5's sign provides functions rather than numeric room identifiers.
dawb=[]
for level,photo,origin,scale in [(1,'IMG_1468',(484,858),(.14,.14)),(2,'IMG_1469',(700,810),(.077,.077)),(3,'IMG_1470',(698,810),(.077,.077)),(4,'IMG_1471',(725,848),(.077,.077)),(5,'IMG_1472',(626,781),(.087,.087))]:
    d=Trace('DAWB',level,photo,origin,scale,f'Floor {level} · Dr. Alvin Woods')
    if level==1:
        d.outline=[[47,695],[135,695],[135,605],[596,605],[596,775],[1175,820],[1175,1164],[161,1164],[161,841],[47,841]]
        for code,box,door in [('AW1-301A',(441,608,596,775),[542,775]),('AW1-301B',(282,608,440,775),[433,775]),('AW1-301C',(139,608,281,775),[269,775]),('AW1-108',(448,881,558,1068),[558,996]),('AW1-109',(309,965,370,1030),[370,1006]),('AW1-110',(372,962,450,1063),[450,1040]),('AW1-111',(244,965,307,1034),[295,1034]),('AW1-407',(601,823,664,879),[601,850]),('AW1-122',(666,825,731,866),[666,852])]:d.room(code,rect(*box),door,'office',code)
        d.room('AW1-215',[[733,824],[1172,824],[1172,1163],[746,1163],[746,1144],[733,1144]],[746,1144],'study','AW1-215 · Concourse-side open area',open=True)
        d.box('washroom-a',298,865,368,955,[298,909],'washroom','DAWB Floor 1 washroom A');d.box('washroom-b',371,865,448,955,[448,908],'washroom','DAWB Floor 1 washroom B')
        d.core('lift-a',(448,831,505,879),[477,831],'elevator','lift-a');d.core('lift-b',(506,831,558,879),[532,831],'elevator','lift-b')
        d.core('stairs-west',(48,700,134,802),[134,780],'stairs','stairs-west');d.core('stairs-inner',(502,978,559,1068),[559,1038],'stairs','stairs-inner')
        d.box('concourse-link',580,775,619,823,[619,800],'entrance','To Concourse · Arts Floor 1',open=True)
        d.box('entrance',460,1105,598,1161,[530,1161],'entrance','DAWB south entrance',open=True)
        for room in d.rooms:
            if room['id']=='AW1-108':room['polygon']=[d.t(p) for p in [[448,881],[558,881],[558,960],[502,960],[502,1068],[448,1068]]];room['door']=d.t([490,1068])
            if room['id'] in ['AW1-109','AW1-110','AW1-111','AW1-122']:room['routeable']=False;room['details']='Source label retained. The adjoining suite route needs verification.'
            if room['id']=='DAWB1-washroom-b':room['door']=d.t([408,865])
        d.line([134,803],[580,803],[619,800]);d.line([580,803],[580,1087],[530,1087],[530,1161]);d.line([477,803],[477,831]);d.line([532,803],[532,831]);d.line([580,1087],[559,1038])
    elif level in [2,3,4]:
        # Author room boundaries in each photo's own pixel frame. Upper floors
        # retain the two nested loops and central service/stair core.
        if level==2:
            left,right,top,bottom=140,1130,396,1330;xl,xr,ym,yb=278,990,737,1210;yn=0
            north=[('101',140,346),('104',348,625),('106',627,914),('108',916,1128)];northbottom=691
            west=[('142',781,853),('140',855,931),('139',933,1009),('138',1011,1087),('136',1089,1165),('134',1167,1236)]
            east=[('110',769,844),('111',846,923),('112',925,1002),('114',1004,1080),('116',1082,1159),('118',1161,1235)]
            south=['133A','133','133B','130','128','126','124','123','119B','119','119A'];coretop=781;corebottom=1182
            d.box('AW2-105',403,839,625,1080,[625,865],'classroom','DAWB 2-105')
            d.box('AW2-125',643,854,810,1010,[700,1010],routeable=False,details='Suite door access is unclear in this source; reference only.')
            d.box('AW2-113',817,900,966,973,[966,950]);d.box('AW2-115',817,975,966,1050,[966,1025]);d.box('AW2-117',817,1052,966,1134,[966,1102])
        else:
            left,right,top,bottom=(151,1180,380,1330) if level==3 else (176,1180,427,1327)
            xl,xr,ym,yb=(300,1030,745,1203) if level==3 else (322,1041,782,1211);yn=522 if level==3 else 568
            codes=['147','148','149','150','151','152','153','154','155','156','157'] if level==3 else ['148','149','150','151','152','153','154','155','156','157','159']
            edges=[left]+[310+i*85 for i in range(10)]+[right]
            north=list(zip(codes,edges,edges[1:]));northbottom=yn-25
            westcodes=['146','145','144','143','142','140','139','138','136'] if level==3 else ['147','146','145','144','142','141','140','138','136']
            heights=[498,581,665,773,856,932,1008,1093,1175,1227] if level==3 else [543,627,709,810,893,969,1045,1122,1179,1231]
            west=list(zip(westcodes,heights,heights[1:]))
            eastcodes=['158','159' if level==3 else '160','109','110','112','114','116','118','119'];heights2=[542,631,719,773,860,950,1036,1083,1161,1230] if level==3 else [588,674,757,810,899,987,1075,1120,1185,1231];east=list(zip(eastcodes,heights2,heights2[1:]))
            south=['134A','134','132','130','128','126','124','120','120A'] if level==3 else ['135A','135','132','130','128','126','124','120','120A']
            coretop=ym+34;corebottom=yb-28
            d.line([xl,ym],[xl,yn],[xr,yn],[xr,ym])
            if level==3:
                for code,box,door in [('101B',(325,548,434,627),[395,548]),('101A',(325,631,434,715),[399,715]),('103',(438,548,656,715),[501,715]),('105',(660,548,911,715),[852,715]),('108',(915,548,1006,715),[943,715])]:d.room(f'AW3-{code}',rect(*box),door,'office',f'AW3-{code}')
            else:
                d.box('AW4-101',353,598,451,752,[420,752]);
                for code,x1,x2,y1,y2,door in [('103A',453,560,598,672,[490,598]),('103B',562,668,598,672,[620,598]),('105A',672,787,598,672,[710,598]),('105B',791,910,598,672,[850,598]),('103C',453,560,677,752,[490,752]),('103D',562,668,677,752,[620,752]),('105C',672,787,677,752,[710,752]),('105D',791,910,677,752,[850,752]),('108',914,1008,598,752,[970,752])]:d.box(f'AW4-{code}',x1,y1,x2,y2,door)
            d.room(f'AW{level}-106',[[460,coretop+56],[625,coretop+56],[625,coretop+86],[665,coretop+86],[665,corebottom-110],[460,corebottom-110]],[625,coretop+73],'classroom' if level==3 else 'office',f'DAWB {level}-106')
        d.outline=[[left,top],[right,top],[right,bottom],[left,bottom],[left,ym+44],[40,ym+44],[40,ym-165],[left,ym-165]]
        for i,(code,x1,x2) in enumerate(north):
            door=[(x1+x2)/2,northbottom]
            if level in [3,4] and i==0:door=[min(x2-10,xl+10),northbottom]
            d.box(f'AW{level}-{code}',x1,top,x2,northbottom,door,'classroom' if level==2 else 'office',f'DAWB {level}-{code}')
        for code,y1,y2 in west:
            if level in [3,4]:
                if y1<ym<y2:y2=ym-28
                elif y1>=ym and y1<ym+44:y1=ym+28
            y2=min(y2,yb+20)
            if y2-y1>12:d.box(f'AW{level}-{code}',left,y1,xl-25,y2,[xl-25,(y1+y2)/2])
        for code,y1,y2 in east:
            y2=min(y2,yb+20)
            if y2-y1>12:d.box(f'AW{level}-{code}',xr+25,y1,right,y2,[xr+25,(y1+y2)/2])
        south_edges=[left,xl+30]+[xl+30+(xr-xl-60)*i/(len(south)-2) for i in range(1,len(south)-1)]+[right]
        for i,code in enumerate(south):
            x1,x2=south_edges[i:i+2]
            door=[(x1+x2)/2,yb+28]
            if i==0:door=[xl+10,yb+28]
            elif i==len(south)-1:door=[xr-10,yb+28]
            d.box(f'AW{level}-{code}',x1,yb+28,x2,bottom,door)
        d.core('lift-a',(origin[0]-60,coretop,origin[0]+20,coretop+70),[origin[0]-20,coretop],'elevator','lift-a')
        d.core('lift-b',(origin[0]+25,coretop,origin[0]+100,coretop+70),[origin[0]+62,coretop],'elevator','lift-b')
        d.core('stairs-west',(40,ym-165,left,ym+44),[left,ym],'stairs','stairs-west')
        d.core('stairs-inner',(origin[0]+40,corebottom-165,origin[0]+115,corebottom),[origin[0]+77,corebottom],'stairs','stairs-inner')
        d.box('washroom-a',xl+28,coretop+56,xl+132,coretop+183,[xl+28,coretop+124],'washroom','DAWB washroom A')
        d.box('washroom-b',xl+28,coretop+188,xl+132,corebottom-30,[xl+28,corebottom-65],'washroom','DAWB washroom B')
        d.box('landing',left,ym-22,left+40,ym+22,[left+40,ym],'entrance',f'DAWB west landing · Floor {level}',open=True)
        d.line([left,ym],[xl,ym],[xr,ym]);d.line([xl,ym],[xl,yb],[xr,yb],[xr,ym]);d.line([origin[0]+77,yb],[origin[0]+77,corebottom]);
    else:
        d.outline=[[135,411],[1006,402],[1006,1241],[152,1241],[152,752],[32,752],[32,553],[135,553]]
        for i in range(7):d.box(f'private-north-{i}',273+i*74,411,342+i*74,503,[303+i*74,503],name='Private office',routeable=False)
        for i in range(6):d.box(f'private-west-{i}',148,758+i*67,240,818+i*67,[240,788+i*67],name='Private office',routeable=False)
        for i in range(6):d.box(f'private-east-{i}',913,738+i*67,1006,800+i*67,[913,768+i*67],name='Private office',routeable=False)
        for i in range(7):d.box(f'private-south-{i}',267+i*82,1150,344+i*82,1240,[303+i*82,1150],name='Private office',routeable=False)
        d.box('lecture-north',361,551,568,692,[568,625],'classroom','Lecture room · north (number not shown)')
        d.room('lecture-south',[[371,797],[567,797],[567,1010],[432,1010],[432,966],[371,966]],[567,980],'classroom','Lecture room · south (number not shown)')
        d.box('meeting-a',437,1014,505,1102,[475,1102],'study','Meeting room · west (number not shown)')
        d.box('meeting-b',508,1014,568,1102,[545,1102],'study','Meeting room · east (number not shown)')
        d.box('mtr',283,551,359,692,[359,650],'office','M.T.R. room (source label)',routeable=False)
        d.box('reception',605,504,745,689,[675,689],'office','Reception (reference)',open=True,routeable=False)
        d.box('washroom-a',286,800,369,906,[286,857],'washroom','Men’s washroom')
        d.box('washroom-b',287,910,370,1063,[287,1000],'washroom','Women’s washroom')
        d.box('mechanical',578,817,730,954,[578,893],name='Mechanical / electrical room',routeable=False)
        d.core('lift-a',(583,752,642,806),[610,752],'elevator','lift-a');d.core('lift-b',(647,752,713,806),[680,752],'elevator','lift-b')
        d.core('stairs-west',(33,555,134,750),[134,718],'stairs','stairs-west');d.core('stairs-inner',(656,963,733,1102),[695,1102],'stairs','stairs-inner')
        d.box('landing',135,697,180,741,[180,718],'entrance','DAWB west landing · Floor 5',open=True)
        d.line([134,718],[260,718],[889,718],[889,1127],[260,1127],[260,718]);d.line([260,718],[260,527],[585,527],[585,718]);d.line([695,1127],[695,1102])
        d.line([585,980],[585,1127])
    dawb.append(d.finish())

for f in arts+dawb:
    for room in f['rooms']:
        if room['id'] in ['ARTS1-dawb-link','DAWB1-concourse-link']:
            room['name']='Printed sign reference · '+room['name'];room['routeable']=False
            room['details']='Printed reference only. DAWB excluded from indoor connections following the user correction.'

buildings=[dict(id='ARTS',name='Arts & Concourse',campusIds=['ARTS-A','ARTS-C','ARTS-E'],floors=arts,source='/floorplan-sources.html',coverage='Arts A/C/E and Concourse. Peters Level 0 and Schlegel Level 0 appear as context on the Floor 1 sign; their interiors were not supplied.'),dict(id='P',name='Frank C. Peters Building',floors=peters,source='/floorplan-sources.html',coverage='Floors 1–3. The Arts link enters Peters Floor 1 from Arts Floor 2. Level 0 is shown only as an outline on the Arts sign.'),dict(id='SC',name='Schlegel Building',floors=schlegel,source='/floorplan-sources.html',coverage='Floors 1–3 of the Schlegel wing, connected to Peters. Level 0 interior was not supplied.'),dict(id='DAWB',name='Dr. Alvin Woods Building',floors=dawb,source='/floorplan-sources.html',coverage='Floors 1–5 from your photographs. Floor 5 supplies room functions rather than numeric identifiers. Private offices remain reference landmarks.')]
connections=[dict(id='arts-peters',fromBuilding='ARTS',fromRoom='ARTS2-peters-link',toBuilding='P',toRoom='P1-arts-link',status='source-shown',source='/blueprints/new-floorplans/IMG_1458.webp',note='Arts Floor 2 to Peters Floor 1: the Arts sign labels the Peters Floor 1 link; your description places the Peters arrival beside its elevator, south stair and P107 Service Laurier. Exact door registration is approximate.')]
for level in [1,2,3]:connections.append(dict(id=f'peters-schlegel-{level}',fromBuilding='P',fromRoom=f'P{level}-schlegel-link',toBuilding='SC',toRoom=f'SC{level}-peters-link',status='source-shown',source=f'/blueprints/new-floorplans/IMG_{1460+level}.webp',note=f'Peters and Schlegel are connected wings, confirmed by you. The wide hallway is on the bottom-left/elevator-core side of IMG_1460, matched to IMG_1461 and confirmed by your walking description; exact door placement and current door access and step-free continuity are unverified.'))
(ROOT/'src/data/new-indoors.json').write_text(json.dumps(buildings,separators=(',',':'))+'\n')
connections += [dict(id='science-bricker',fromBuilding='SCI',fromRoom='SCI1-bricker-connection',toBuilding='BA',toRoom='BA-science',status='source-shown',source='/blueprints/science/floor-1.webp',note='Supplied Science and Bricker Floor 1 portals; user-confirmed connection. Passage geometry and current access are unverified.')]
(ROOT/'src/data/indoor-connections.json').write_text(json.dumps(connections,indent=2)+'\n')
assignments={**{f'IMG_{n}':'Arts / Concourse Floor 1 (overlapping views)' for n in range(1451,1458)},'IMG_1458':'Arts Floor 2 / Peters Floor 1 link','IMG_1459':'Arts Floor 3','IMG_1460':'Peters Floor 1','IMG_1461':'Schlegel Floor 1','IMG_1462':'Schlegel Floor 2','IMG_1463':'Schlegel Floor 3',**{f'IMG_{n}':'Peters Floor 2 (overlapping views)' for n in range(1464,1467)},'IMG_1467':'Peters Floor 3',**{f'IMG_{1467+n}':f'Dr. Alvin Woods Floor {n}' for n in range(1,6)}}
(ASSETS/'manifest.json').write_text(json.dumps(dict(assignments=assignments,identification='Room-number prefixes, printed floor captions and user confirmation. Peters/Schlegel treated as connected wings; Arts/Concourse is one area.',sources=['https://students.wlu.ca/campus-services/classrooms-and-spaces/classrooms/index.html','https://ammcs.wlu.ca/2023/conference-program/ammcs2023_program.pdf']),indent=2)+'\n')
cards=''.join(f'<article><h2>{title}</h2><p>{photo}</p><a href="/blueprints/new-floorplans/{photo}.webp" target="_blank"><img loading="lazy" src="/blueprints/new-floorplans/{photo}.webp" alt="{title} source photograph"></a></article>' for photo,title in assignments.items())
(ROOT/'public/floorplan-sources.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New floorplan sources · Campus map</title><style>body{font-family:system-ui;background:#f8f7f3;color:#332c3a;margin:0;padding:28px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:24px}article{background:white;padding:20px;border:1px solid #ddd;border-radius:14px}img{width:100%;max-height:520px;object-fit:contain}h1{font-size:28px}h2{font-size:18px}a{color:#71489b}p{line-height:1.6}</style><a href="/">← Campus map</a><h1>Your photographed floorplans</h1><p>22 original views, grouped by their printed floor captions, readable room prefixes and your confirmation. Click a photograph to inspect it at full size. These are reference drawings, not a current access survey.</p><p>Arts Floor 2 connects to Peters Floor 1. Peters and Schlegel are connected wings. DAWB is displayed separately and is excluded from indoor connections, as confirmed by you. Unsupplied Level 0 interiors are not invented.</p><main>'+cards+'</main></html>')
print('Prepared',len(buildings),'buildings,',sum(len(b['floors']) for b in buildings),'floors,',sum(len(f['rooms']) for b in buildings for f in b['floors']),'rooms/landmarks and',len(connections),'building links.')
