"""纸桌 · the snowy wood seen from the train, drawn in flat pixel shapes (1200×190, tiles horizontally) → assets/snow-forest-px.png"""
# night snowy wood in the reference's palette: deep blue sky, blue-white snow, a few warm distant lights
import numpy as np, random
from PIL import Image, ImageDraw, ImageFilter
random.seed(3); S=1; W,H=1200*S,190*S
P=dict(sky0=(150,192,236),sky1=(178,210,242),sky2=(206,226,246),far0=(160,184,222),far1=(142,168,212),mid0=(96,128,182),mid1=(76,106,162),
       pine0=(44,72,118),pine1=(30,52,94),snow=(250,252,255),snowM=(196,214,244),ground=(236,242,252),groundL=(204,218,244),birch=(240,238,232),mark=(60,64,80))
im=Image.new('RGB',(W,H),P['sky0']); d=ImageDraw.Draw(im)
for i,(y,c) in enumerate([(30,'sky1'),(70,'sky2')]): d.rectangle([0,y*S,W,H],fill=P[c])
def pine(x,base,h,c0,c1,snow):
    tiers=max(3,h//(9*S))
    for t in range(tiers):
        y0=base-h+t*h//tiers; y1=y0+h//tiers+4*S; w=4*S+int((t+1)/tiers*h*.42)
        d.polygon([(x,y0),(x-w,y1),(x+w,y1)],fill=c0); d.polygon([(x,y0),(x+w,y1),(x+w//3,y1)],fill=c1)
        if snow:
            d.polygon([(x,y0),(x-w+S,y1-S),(x-w//2,y1-S),(x-S,y0+3*S)],fill=P['snowM'])
            d.rectangle([x-w+S,y1-2*S,x+w//3,y1-S],fill=P['snow'])
    d.rectangle([x-S,base-2*S,x+S,base+2*S],fill=c1)
def wrap(f,x,*a):
    for o in (-W,0,W): f(x+o,*a)
for i in range(80): wrap(pine,random.randrange(W),112*S,random.randint(22,40)*S,P['far0'],P['far1'],False)
d.rectangle([0,110*S,W,H],fill=P['far0'])
# distant lit windows: the warm accent, like the reference's buildings
for i in range(9):
    x=random.randrange(W); y=random.randint(98,108)*S
    for o in (-W,0,W): d.rectangle([x+o,y,x+o+2*S,y+2*S],fill=(176,200,236))
for i in range(50): wrap(pine,random.randrange(W),128*S,random.randint(30,54)*S,P['mid0'],P['mid1'],True)
d.rectangle([0,126*S,W,H],fill=P['ground']); d.rectangle([0,126*S,W,127*S],fill=P['groundL'])
for i in range(22): wrap(pine,random.randrange(W),156*S,random.randint(52,86)*S,P['pine0'],P['pine1'],True)
d.rectangle([0,154*S,W,H],fill=P['ground'])
for x in range(0,W,2*S):
    if random.random()<.3: yy_=155*S+random.randint(0,20)*S; d.rectangle([x,yy_,x+S,yy_+S],fill=P['groundL'])
for i in range(12):
    x=random.randrange(W); w=random.choice([3,4])*S
    for o in (-W,0,W):
        X=x+o; d.rectangle([X,0,X+w-1,160*S],fill=P['birch']); d.rectangle([X+w-S,0,X+w-1,160*S],fill=P['snowM'])
        for y in range(4*S,158*S,random.randint(9,14)*S): d.rectangle([X,y,X+random.randint(1,w//S-1)*S,y+S-1],fill=P['mark'])
import os; im.save(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'assets','snow-forest-px.png')); print(im.size)
