"""纸桌 · the 雪国线 window view: Poly Haven "Snowy Park 01" (CC0) horizon band split by depth (Depth Anything V2) into bg / mid / near.
   Needs /tmp/one/band.png and d.npy made from the panorama; see carview.js for how the layers move."""
import numpy as np
from PIL import Image
from scipy import ndimage
O='/home/claude/paper-desk/assets/view/'
im=np.asarray(Image.open('/tmp/one/band.png').convert('RGB')); d=np.load('/tmp/one/d.npy'); H,W=d.shape
lum=im@np.array([.3,.59,.11]); yy=np.mgrid[0:H,0:W][0]; hz=412; HZ0=hz
base=np.percentile(d,35,axis=1)[:,None]
tree=(d-base)>.07
tree&=~((yy>hz-10)&(lum>175))
rowmed=np.median(lum,axis=1)[:,None]
thin=(yy<hz-14)&(lum<rowmed-14)&(d>.12)              # fine twigs against the sky that the depth model blurs over
tree|=thin
tree=ndimage.binary_opening(tree,iterations=1)|thin
# near: the depth model's near tree, plus every bit of tree it touches up in its crown (follow connected pixels from it)
seedn=tree&(d>.5)
lb,n=ndimage.label(ndimage.binary_dilation(tree,iterations=1)&(d>.33))
ids=np.unique(lb[seedn]); ids=ids[ids>0]
near=tree&np.isin(lb,ids)
mid=tree&~near
mid&=~(ndimage.binary_dilation(near,iterations=25)&(yy<hz-60))   # crown dust around the near tree: dropped
cov=ndimage.binary_dilation(tree,iterations=4)
bg=im.astype(np.float32).copy()
for y in range(H):
    free=~cov[y]
    if free.sum()>20:
        xs=np.where(free)[0]
        for c in range(3): bg[y,~free,c]=np.interp(np.where(~free)[0],xs,ndimage.uniform_filter1d(im[y,free,c].astype(np.float32),301,mode='wrap'),period=W)
bl=ndimage.gaussian_filter(bg,(3,10,0)); interp=np.where(cov[...,None],bl,bg)
# better: fill from the open stretch of the same field (no near trees there), where that stretch is itself clear
xs=np.arange(W); src=1650+(xs%1200); real=im[:,src]; ok=~cov[:,src]
fill=np.where(ok[...,None],real,interp)
# soften the seam around each filled patch
m=ndimage.gaussian_filter(cov.astype(np.float32),2)[...,None]
bg=interp*(1-m)+fill*m
bg=np.where(cov[...,None],fill,bg)
# the sky: overcast, so wherever a canopy was (generously), it is just the sky's own gradient
wide=ndimage.binary_dilation(tree,iterations=14)
skyrow=np.median(im[:HZ0,1700:2800].astype(np.float32),axis=1)   # one colour per row, from open sky
TOP=290                                                          # the far trees reach up to here
for y in range(TOP):
    bg[y,wide[y]]=skyrow[y]
dark=(bg[:TOP]@np.array([.3,.59,.11]))<(skyrow[:TOP]@np.array([.3,.59,.11]))[:,None]-6   # stray twigs left in the open sky
dark=ndimage.binary_dilation(dark,iterations=3)
for y in range(TOP): bg[y,dark[y]]=skyrow[y]
bg[:TOP]=ndimage.gaussian_filter(bg[:TOP],(1.5,3,0))
def cool(a):
    a=a.astype(np.float32)/255; l=(a@[.3,.59,.11])[...,None]; a=l+(a-l)*.85; a=a*np.array([.97,.99,1.03]); return (np.clip(a,0,1)*255).astype(np.uint8)
Image.fromarray(cool(bg)).save(O+'bg.webp','WEBP',quality=84)
def layer(m,name,soft):
    a=ndimage.gaussian_filter(m.astype(np.float32),soft); a=np.clip(a*1.5,0,1)
    Image.fromarray(np.dstack([cool(im),(a*255).astype(np.uint8)])).save(O+name,'WEBP',quality=86)
layer(mid,'mid.webp',.6); layer(near,'near.webp',.8)
Image.fromarray(cool(bg)).resize((1600,256)).save('/tmp/bg.png')
