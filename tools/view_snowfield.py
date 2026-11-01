import numpy as np
from PIL import Image
from scipy import ndimage
O='/home/claude/paper-desk/assets/view/'
im=np.asarray(Image.open('/tmp/sf/passendorf_snow.png').convert('RGB')).astype(np.float32); H,W,_=im.shape
HZ=417; SX,SY=2458,200; R=180
r,g,b=im[...,0],im[...,1],im[...,2]; lum=im.mean(2)
yy,xx=np.mgrid[0:H,0:W]
m1=ndimage.uniform_filter(lum,5); var=ndimage.uniform_filter(lum*lum,5)-m1*m1
sky=((b-r>40)|((var<6)&(lum>150)))&(yy<HZ-3)
sunzone=(xx-SX)**2+(yy-SY)**2<(R+40)**2
sky|=sunzone&(yy<HZ-40)
sky=np.pad(sky,4,mode='edge'); sky=ndimage.binary_closing(ndimage.binary_opening(sky,iterations=2),iterations=2)[4:-4,4:-4]
lb,_=ndimage.label(sky); top=np.unique(lb[:3]); sky=np.isin(lb,top[top>0])
skyrow=np.zeros((HZ+6,3))
for y in range(HZ+6):
    m=sky[y]&~sunzone[y]
    if m.sum()>50: skyrow[y]=np.median(im[y][m],0)
ok=skyrow.sum(1)>0; idx=np.where(ok)[0]
for y in range(HZ+6):
    if not ok[y]: skyrow[y]=skyrow[idx[np.argmin(abs(idx-y))]]
Image.fromarray(np.repeat(skyrow[:,None,:],4,1).astype(np.uint8)).save(O+'sky.png')
c=im[SY-R:SY+R,SX-R:SX+R]-skyrow[SY-R:SY+R,None,:]
c=np.clip(c-6,0,255); rr=np.hypot(*np.mgrid[-R:R,-R:R]); c*=(np.clip(1-rr/R,0,1)**1.6)[...,None]
Image.fromarray(c.astype(np.uint8)).save(O+'sun.png')
alpha=ndimage.gaussian_filter((~sky).astype(np.float32),.7)[:HZ+6]
land=np.dstack([im[:HZ+6],alpha*255]); land[HZ-2:,:,3]=255
Image.fromarray(land.astype(np.uint8)).save(O+'land.webp','WEBP',quality=88)
Image.fromarray(im[HZ-2:].astype(np.uint8)).save(O+'snow.webp','WEBP',quality=84)
p=np.asarray(Image.open(O+'land.webp').convert('RGBA')).astype(float); bg=np.full(p.shape[:2]+(3,),(255,0,255.)); a=p[...,3:]/255
Image.fromarray((p[...,:3]*a+bg*(1-a)).astype(np.uint8)).resize((1600,int((HZ+6)*1600/W))).save('/tmp/land.png')
