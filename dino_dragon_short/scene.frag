#version 330
// Procedural 3D cartoon scene: baby dinosaur, magic egg, tiny dragon.
// Signed-distance-field raymarcher with soft shadows, AO, SSS-ish skin.
out vec4 fragColor;

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uCamPos;
uniform vec3 uCamTar;
uniform float uFov;
uniform float uCamRoll;

// dino
uniform vec3 uDPos;
uniform float uDYaw;
uniform vec3 uDSquash;   // y scale, xz scale, lean
uniform vec4 uDHead;     // pitch, roll, yaw, -
uniform vec4 uDFace;     // eyeOpen, laugh, mouth, eyeScale
uniform vec4 uDMisc;     // tail phase, arm raise, walk phase, walk amount
uniform vec2 uDLook;

// dragon
uniform vec3 uGPos;
uniform float uGYaw;
uniform vec4 uGSquash;   // y scale, xz scale, lean, overall scale
uniform vec4 uGHead;
uniform vec4 uGFace;
uniform vec4 uGMisc;     // wing flap angle, tail phase, arm raise, nose scrunch
uniform vec2 uGLook;

// egg
uniform vec3 uEPos;
uniform vec4 uEWob;      // tiltX, tiltZ, squash, glow
uniform vec4 uECrack;    // crack progress, open flag, interior glow, burst
uniform vec3 uCapPos;
uniform vec3 uCapRot;

// fireball
uniform vec4 uFB;        // pos, size
uniform vec4 uFBp;       // intensity, smoke, flash, -
uniform vec3 uFBVel;
uniform vec3 uSmokePos;

#define PI 3.14159265

// ---------------------------------------------------------------- utils
float hash11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec3 hash33(vec3 p){ p = fract(p*vec3(0.1031,0.1030,0.0973)); p += dot(p, p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx); }
float noise2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y); }
float noise3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  float n = i.x + i.y*57.0 + i.z*113.0;
  float a=hash11(n), b=hash11(n+1.0), c=hash11(n+57.0), d=hash11(n+58.0);
  float e=hash11(n+113.0), g=hash11(n+114.0), h=hash11(n+170.0), k=hash11(n+171.0);
  return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,g,f.x),mix(h,k,f.x),f.y), f.z); }
float fbm2(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*noise2(p); p*=2.03; a*=0.5; } return s; }

vec2 rot(vec2 v, float a){ float c=cos(a), s=sin(a); return vec2(c*v.x - s*v.y, s*v.x + c*v.y); }

float smin(float a, float b, float k){ float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0); return mix(b,a,h) - k*h*(1.0-h); }
float smax(float a, float b, float k){ return -smin(-a,-b,k); }
float sdSphere(vec3 p, float r){ return length(p)-r; }
float sdEllipsoid(vec3 p, vec3 r){ float k0 = length(p/r); float k1 = length(p/(r*r)); return k0*(k0-1.0)/max(k1,1e-5); }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r){ vec3 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h)-r; }
float sdRoundCone(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba=b-a; float l2=dot(ba,ba); float rr=r1-r2; float a2=l2-rr*rr; float il2=1.0/l2;
  vec3 pa=p-a; float y=dot(pa,ba); float z=y-l2; vec3 xv = pa*l2-ba*y; float x2=dot(xv,xv);
  float y2=y*y*l2; float z2=z*z*l2; float k=sign(rr)*rr*rr*x2;
  if(sign(z)*a2*z2>k) return sqrt(x2+z2)*il2-r2;
  if(sign(y)*a2*y2<k) return sqrt(x2+y2)*il2-r1;
  return (sqrt(x2*a2*il2)+y*rr)*il2-r1; }
float sdCylY(vec3 p, float r, float h){ vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(r,h); return min(max(d.x,d.y),0.0)+length(max(d,0.0)); }

// material ids
#define M_GROUND 1.0
#define M_TRUNK 2.0
#define M_CANOPY 3.0
#define M_MUSHCAP 4.0
#define M_MUSHSTEM 5.0
#define M_FLOWER 6.0
#define M_STEM 7.0
#define M_ROCK 8.0
#define M_GMUSH 9.0
#define M_DSKIN 10.0
#define M_DSPIKE 12.0
#define M_DEYE 13.0
#define M_DMOUTH 14.0
#define M_DLID 15.0
#define M_GSKIN 20.0
#define M_GHORN 22.0
#define M_GEYE 23.0
#define M_GWING 24.0
#define M_GMOUTH 25.0
#define M_GLID 26.0
#define M_EGG 30.0
#define M_EGGIN 31.0

vec2 opU(vec2 a, vec2 b){ return a.x<b.x ? a : b; }

// ---------------------------------------------------------------- eyes
// eye in head-local space. returns vec2(dist, mat) for eyeball + lids
vec2 eyeSDF(vec3 h, vec3 c, float r, float side, float open, float laugh, float matEye, float matLid){
  vec3 q = h - c;
  float de = length(q) - r;
  vec3 f = normalize(vec3(1.0, 0.0, side*0.62));
  vec3 a = normalize(cross(vec3(0,1,0), f));
  float qy = q.y, qz = dot(q,a);
  float zn = qz/r;
  float arc = r*(0.28 - 0.75*zn*zn);
  float topB = mix(r*mix(-0.08, 1.25, open), arc, laugh);
  float botB = mix(-r*mix(0.0, 1.25, open), arc - 0.01*r, laugh);
  float shell = length(q) - r*1.07;
  float lidT = max(shell, topB - qy);
  float lidB = max(shell, qy - botB);
  float dl = min(lidT, lidB);
  return opU(vec2(de, matEye), vec2(dl, matLid));
}

// ---------------------------------------------------------------- dino
vec3 toDino(vec3 p, out float sc){
  vec3 q = p - uDPos;
  float c = cos(uDYaw), s = sin(uDYaw);
  q = vec3(q.x*c + q.z*s, q.y, -q.x*s + q.z*c);
  q.xy = rot(q.xy, uDSquash.z);
  q.y /= uDSquash.x; q.xz /= uDSquash.y;
  sc = min(uDSquash.x, uDSquash.y);
  return q;
}
vec3 dinoHeadLocal(vec3 q){
  vec3 h = q - vec3(0.17, 0.70, 0.0);
  h.xz = rot(h.xz, -uDHead.z);
  h.xy = rot(h.xy, -uDHead.x);
  h.zy = rot(h.zy, uDHead.y);
  return h;
}
vec2 mapDino(vec3 p){
  float sc; vec3 q = toDino(p, sc);
  float bd = length(q - vec3(-0.1,0.6,0.0)) - 1.15;
  if(bd > 0.5) return vec2(bd*sc, 0.0);
  float walk = uDMisc.z, wa = uDMisc.w;
  // body
  float d = sdEllipsoid(q - vec3(0.0,0.44,0.0), vec3(0.37,0.37,0.33));
  // tail
  float wag = sin(uDMisc.x);
  for(int i=0;i<6;i++){
    float t = float(i)/5.0;
    vec3 c = vec3(-0.28 - t*0.62, 0.36 - t*0.26 + t*t*0.16, wag*0.28*t*t);
    d = smin(d, length(q-c) - 0.19*(1.0-0.78*t), 0.09);
  }
  // legs
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    float ph = walk + (i==0 ? 0.0 : PI);
    float lift = max(sin(ph),0.0)*0.09*wa;
    float sw = cos(ph)*0.08*wa;
    vec3 foot = vec3(0.06+sw, 0.07+lift, s*0.17);
    d = smin(d, sdCapsule(q, foot, vec3(0.02,0.32,s*0.16), 0.115), 0.06);
    d = smin(d, sdEllipsoid(q - foot - vec3(0.05,-0.02,0.0), vec3(0.15,0.07,0.11)), 0.04);
  }
  // arms
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    float ar = uDMisc.y;
    vec3 a0 = vec3(0.22,0.58,s*0.22);
    vec3 a1 = a0 + vec3(0.13 - ar*0.05, -0.1 + ar*0.32, s*(0.06 + ar*0.06));
    d = smin(d, sdCapsule(q, a0, a1, 0.055), 0.05);
  }
  // head
  vec3 h = dinoHeadLocal(q);
  float dh = sdEllipsoid(h - vec3(0.10,0.30,0.0), vec3(0.31,0.28,0.28));
  dh = smin(dh, sdEllipsoid(h - vec3(0.33,0.20,0.0), vec3(0.20,0.155,0.185)), 0.12);
  float mo = uDFace.z;
  float dm = sdEllipsoid(h - vec3(0.47,0.11,0.0), vec3(0.13, 0.015+0.085*mo, 0.12));
  vec2 res;
  if(mo > 0.02){
    float dcut = smax(dh, -dm, 0.025);
    dh = dcut;
  }
  d = smin(d, dh, 0.13);
  res = vec2(d, M_DSKIN);
  if(mo > 0.02){
    // mouth interior surface
    float inner = max(dm + 0.008, dh - 0.0);
    if(abs(dm) < 0.012 && d < 0.02) res.y = M_DMOUTH;
  }
  // spikes along back
  float ds = 1e5;
  for(int i=0;i<5;i++){
    float t = float(i)/4.0;
    vec3 base = vec3(0.05 - t*0.75, 0.80 - t*0.48, wag*0.28*t*t*0.6);
    vec3 dir = normalize(vec3(-0.35, 1.0, 0.0));
    float sz = 0.085*(1.0 - 0.45*t);
    ds = min(ds, sdRoundCone(q, base - dir*0.03, base + dir*sz*1.2, sz*0.75, 0.015));
  }
  // head spikes
  ds = min(ds, sdRoundCone(h, vec3(-0.02,0.55,0.0), vec3(-0.08,0.66,0.0), 0.06, 0.015));
  ds = min(ds, sdRoundCone(h, vec3(-0.17,0.47,0.0), vec3(-0.25,0.56,0.0), 0.05, 0.012));
  res = opU(res, vec2(ds, M_DSPIKE));
  // eyes
  float er = 0.098*uDFace.w;
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    vec2 e = eyeSDF(h, vec3(0.28,0.41,s*0.135), er, s, uDFace.x, uDFace.y, M_DEYE, M_DLID);
    res = opU(res, e);
  }
  res.x *= sc;
  return res;
}

// ---------------------------------------------------------------- dragon
vec3 toDrag(vec3 p, out float sc){
  vec3 q = p - uGPos;
  float c = cos(uGYaw), s = sin(uGYaw);
  q = vec3(q.x*c + q.z*s, q.y, -q.x*s + q.z*c);
  q /= uGSquash.w;
  q.xy = rot(q.xy, uGSquash.z);
  q.y /= uGSquash.x; q.xz /= uGSquash.y;
  sc = min(uGSquash.x, uGSquash.y)*uGSquash.w;
  return q;
}
vec3 dragHeadLocal(vec3 q){
  vec3 h = q - vec3(0.08, 0.66, 0.0);
  h.xz = rot(h.xz, -uGHead.z);
  h.xy = rot(h.xy, -uGHead.x);
  h.zy = rot(h.zy, uGHead.y);
  return h;
}
vec3 wingLocal(vec3 q, float s){
  vec3 w = q - vec3(-0.18, 0.62, s*0.2);
  w.z *= s;
  w.zy = rot(w.zy, 0.5 + uGMisc.x);   // flap
  w.xz = rot(w.xz, -0.35);
  return w;
}
vec2 mapDragon(vec3 p){
  if(uGSquash.w < 0.01) return vec2(1e5, 0.0);
  float sc; vec3 q = toDrag(p, sc);
  float bd = length(q - vec3(-0.1,0.6,0.0)) - 1.25;
  if(bd > 0.5) return vec2(bd*sc, 0.0);
  float d = sdEllipsoid(q - vec3(0.0,0.38,0.0), vec3(0.31,0.34,0.29));
  // tail
  float tp = uGMisc.y;
  vec3 tipc = vec3(0.0);
  for(int i=0;i<6;i++){
    float t = float(i)/5.0;
    vec3 c = vec3(-0.25 - t*0.5, 0.2 - t*0.08 + t*t*0.3, sin(tp)*0.3*t*t);
    d = smin(d, length(q-c) - 0.13*(1.0-0.75*t), 0.07);
    tipc = c;
  }
  // legs
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    vec3 foot = vec3(0.07, 0.06, s*0.15);
    d = smin(d, sdCapsule(q, foot, vec3(0.02,0.25,s*0.14), 0.095), 0.05);
    d = smin(d, sdEllipsoid(q - foot - vec3(0.05,-0.02,0.0), vec3(0.12,0.06,0.09)), 0.03);
  }
  // arms
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    float ar = uGMisc.z;
    vec3 a0 = vec3(0.2,0.5,s*0.19);
    vec3 a1 = a0 + vec3(0.12 - ar*0.03, -0.08 + ar*0.3, s*(0.05+ar*0.08));
    d = smin(d, sdCapsule(q, a0, a1, 0.048), 0.04);
  }
  // head
  vec3 h = dragHeadLocal(q);
  float dh = sdEllipsoid(h - vec3(0.06,0.3,0.0), vec3(0.34,0.31,0.31));
  dh = smin(dh, sdEllipsoid(h - vec3(0.32,0.2,0.0), vec3(0.19,0.15,0.18)), 0.12);
  // nostrils
  float ns = 1.0 + uGMisc.w*0.6;
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    dh = smax(dh, -(length(h - vec3(0.5,0.27,s*0.055)) - 0.022*ns), 0.015);
  }
  float mo = uGFace.z;
  float dm = sdEllipsoid(h - vec3(0.46,0.11,0.0), vec3(0.12, 0.015+0.08*mo, 0.11));
  if(mo > 0.02) dh = smax(dh, -dm, 0.025);
  d = smin(d, dh, 0.12);
  vec2 res = vec2(d, M_GSKIN);
  if(mo > 0.02 && abs(dm) < 0.012 && d < 0.02) res.y = M_GMOUTH;
  // tail spade
  vec3 tq = q - tipc - vec3(-0.07,0.05,0.0);
  float dsp = sdEllipsoid(tq, vec3(0.1,0.08,0.025));
  // horns + back ridges
  float dhorn = 1e5;
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    dhorn = min(dhorn, sdRoundCone(h, vec3(-0.02,0.52,s*0.15), vec3(-0.16,0.72,s*0.22), 0.06, 0.018));
    // ear fins
    dhorn = min(dhorn, sdEllipsoid(h - vec3(-0.16,0.42,s*0.27), vec3(0.08,0.05,0.02)));
  }
  for(int i=0;i<4;i++){
    float t = float(i)/3.0;
    vec3 b = vec3(-0.06 - t*0.42, 0.68 - t*0.38, 0.0);
    dhorn = min(dhorn, sdRoundCone(q, b, b + vec3(-0.03,0.07,0.0)*(1.0-0.4*t), 0.04*(1.0-0.4*t), 0.01));
  }
  res = opU(res, vec2(min(dhorn, dsp), M_GHORN));
  // wings
  float dw = 1e5;
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    vec3 w = wingLocal(q, s);
    float wing = 1e5;
    for(int k=0;k<3;k++){
      float fa = -0.35 + float(k)*0.55;
      vec3 fw = w; fw.xz = rot(fw.xz, fa);
      float len = 0.2 - float(k)*0.035;
      wing = smin(wing, sdEllipsoid(fw - vec3(0.0,0.0,len), vec3(0.06,0.018,len)), 0.06);
    }
    // bony top edge
    wing = min(wing, sdCapsule(w, vec3(0.0), vec3(-0.12,0.0,0.36), 0.022));
    dw = min(dw, wing);
  }
  res = opU(res, vec2(dw, M_GWING));
  // eyes
  float er = 0.11*uGFace.w;
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    res = opU(res, eyeSDF(h, vec3(0.25,0.42,s*0.155), er, s, uGFace.x, uGFace.y, M_GEYE, M_GLID));
  }
  res.x *= sc;
  return res;
}

// ---------------------------------------------------------------- egg
const float EH = 0.34;
float crackY(float ang){
  float z = ang*7.0/PI;
  return 0.07 + 0.045*(abs(fract(z)-0.5)*4.0 - 1.0);
}
float eggShape(vec3 q){
  vec3 e = q;
  e.xz /= (1.0 - 0.17*clamp(e.y/EH, -1.0, 1.0));
  return sdEllipsoid(e, vec3(0.255, EH, 0.255))*0.85;
}
vec3 toEgg(vec3 p){
  vec3 q = p - uEPos;
  q.yz = rot(q.yz, -uEWob.x);
  q.xy = rot(q.xy, -uEWob.y);
  q.y /= uEWob.z; q.xz /= (1.0 + (1.0-uEWob.z)*0.6);
  q.y -= EH;
  return q;
}
vec3 toCap(vec3 p){
  vec3 q = p - uCapPos;
  q.xy = rot(q.xy, -uCapRot.z);
  q.yz = rot(q.yz, -uCapRot.x);
  q.y -= EH;
  return q;
}
vec2 mapEgg(vec3 p){
  vec3 q = toEgg(p);
  float bd = length(q) - 0.5;
  vec2 res = vec2(1e5, 0.0);
  if(bd > 0.5 && uECrack.y < 0.5) return vec2(bd, 0.0);
  float de = eggShape(q);
  if(uECrack.y < 0.5){
    res = vec2(de, M_EGG);
  } else {
    float ang = atan(q.z, q.x);
    float cy = crackY(ang);
    float shell = max(de, -(de + 0.022));
    float bot = max(shell, (q.y - cy)*0.7);
    res = vec2(bot, M_EGG);
    if(abs(de + 0.022) < 0.01 && bot < 0.01) res.y = M_EGGIN;
    // cap
    vec3 c = toCap(p);
    if(length(c - vec3(0.0,0.2,0.0)) < 0.6){
      float dc = eggShape(c);
      float angc = atan(c.z, c.x);
      float capd = max(max(dc, -(dc + 0.022)), (crackY(angc) - c.y)*0.7);
      vec2 cap = vec2(capd, M_EGG);
      res = opU(res, cap);
    } else {
      res = opU(res, vec2(length(c - vec3(0.0,0.2,0.0)) - 0.5, M_EGG));
    }
  }
  return res;
}

// ---------------------------------------------------------------- environment
float groundH(vec2 xz){
  float h = 0.02*sin(xz.x*1.7)*sin(xz.y*1.3);
  float far = smoothstep(2.5, 9.0, xz.y);
  h += far*(0.6*fbm2(xz*0.25) - 0.15);
  return h;
}

vec2 mapTrees(vec3 p){
  // grid of trees behind the action
  float cs = 2.4;
  vec2 cell = floor(p.xz/cs);
  vec2 res = vec2(1e5, 0.0);
  for(int j=0;j<2;j++)
  for(int i=0;i<2;i++){
    vec2 cid = cell + vec2(float(i), float(j)) - vec2(0.0);
    vec2 cc = (cid + 0.5)*cs;
    float hh = hash21(cid);
    vec2 off = (vec2(hash21(cid+7.1), hash21(cid+3.7)) - 0.5)*cs*0.45;
    vec2 tp = cc + off;
    if(tp.y < 1.9 && abs(tp.x) < 3.2) continue;      // keep clearing open
    if(tp.y < -2.5) continue;
    if(hh < 0.12) continue;
    float th = 1.6 + hh*1.4;
    vec3 q = p - vec3(tp.x, groundH(tp), tp.y);
    float bend = sin(q.y*1.3 + hh*6.0)*0.08;
    float trunk = sdCapsule(q + vec3(bend,0.0,0.0), vec3(0.0,-0.2,0.0), vec3(0.0,th,0.0), 0.13 + 0.05*hh - q.y*0.02);
    res = opU(res, vec2(trunk, M_TRUNK));
    float cr = 0.75 + 0.35*hh;
    vec3 cq = q - vec3(0.0, th + cr*0.4, 0.0);
    float can = sdEllipsoid(cq, vec3(cr, cr*0.85, cr));
    can = smin(can, length(cq - vec3(cr*0.55, -cr*0.3, 0.2)) - cr*0.6, 0.25);
    can = smin(can, length(cq - vec3(-cr*0.55, -cr*0.25, -0.15)) - cr*0.62, 0.25);
    can = smin(can, length(cq - vec3(0.1, cr*0.5, -0.1)) - cr*0.55, 0.25);
    can += 0.05*sin(cq.x*9.0)*sin(cq.y*8.0)*sin(cq.z*9.0);
    res = opU(res, vec2(can*0.8, M_CANOPY));
  }
  return res;
}

// fixed props
const int NMUSH = 5;
vec4 mushData(int i){ // xz pos, scale, type
  if(i==0) return vec4(-1.35, 0.75, 1.0, 0.0);
  if(i==1) return vec4(-1.05, 0.95, 0.6, 0.0);
  if(i==2) return vec4(1.25, 0.85, 0.8, 1.0);
  if(i==3) return vec4(1.5, 0.45, 0.5, 1.0);
  return vec4(-0.95, -0.85, 0.45, 1.0);
}
vec2 mapProps(vec3 p){
  vec2 res = vec2(1e5, 0.0);
  for(int i=0;i<NMUSH;i++){
    vec4 m = mushData(i);
    vec3 q = (p - vec3(m.x, 0.0, m.y))/m.z;
    if(length(q - vec3(0.0,0.3,0.0)) > 1.2){ res = opU(res, vec2((length(q - vec3(0.0,0.3,0.0))-0.6)*m.z, 0.0)); continue; }
    float stem = sdCapsule(q, vec3(0.0,0.0,0.0), vec3(0.03,0.32,0.0), 0.07 - q.y*0.05);
    vec3 cq = q - vec3(0.03,0.36,0.0);
    float cap = sdEllipsoid(cq, vec3(0.26,0.17,0.26));
    cap = smax(cap, -(cq.y + 0.02), 0.04);
    res = opU(res, vec2(stem*m.z, M_MUSHSTEM));
    res = opU(res, vec2(cap*m.z, m.w > 0.5 ? M_GMUSH : M_MUSHCAP));
  }
  // rocks
  float r1 = sdEllipsoid(p - vec3(-1.6, 0.0, 0.0), vec3(0.28,0.18,0.22));
  float r2 = sdEllipsoid(p - vec3(1.65, 0.0, 1.3), vec3(0.35,0.22,0.3));
  res = opU(res, vec2(min(r1,r2), M_ROCK));
  return res;
}

vec2 mapFlowers(vec3 p){
  if(p.y > 0.35) return vec2(p.y - 0.3, 0.0);
  float cs = 0.42;
  vec2 cid = floor(p.xz/cs);
  vec2 cc = (cid + 0.5)*cs;
  vec2 fr = p.xz - cid*cs;
  float edge = min(min(fr.x, cs-fr.x), min(fr.y, cs-fr.y)) + 0.01;   // safe step to the next cell
  float h = hash21(cid*1.37);
  bool skip = h < 0.5 || cc.y > 4.0 || cc.y < -3.5 || (abs(cc.y - 0.05) < 0.5 && abs(cc.x) < 1.3);
  if(skip) return vec2(max(edge, p.y - 0.3), 0.0);
  vec3 q = p - vec3(cc.x + (hash21(cid+1.3)-0.5)*0.14, 0.0, cc.y + (hash21(cid+2.9)-0.5)*0.14);
  float fs = 0.7 + 0.6*hash21(cid+8.8);
  float fh = (0.07 + 0.1*hash21(cid+5.5))*fs;
  float sway = sin(uTime*1.5 + cc.x*2.0)*0.015;
  float stem = sdCapsule(q, vec3(0.0), vec3(sway,fh,0.0), 0.007);
  vec3 fq = q - vec3(sway,fh,0.0);
  float ang = atan(fq.z, fq.x) + hash21(cid)*6.28;
  float pr = 0.045*fs*(0.65 + 0.35*abs(cos(ang*2.5)));
  float petals = max(length(fq.xz) - pr, abs(fq.y - length(fq.xz)*0.25) - 0.006);
  float center = length(fq - vec3(0.0,0.008,0.0)) - 0.014*fs;
  vec2 res = opU(vec2(stem, M_STEM), vec2(petals*0.8, M_FLOWER));
  res = opU(res, vec2(center, M_STEM+0.5));
  res.x = min(res.x, max(edge, 0.0) + 0.2);   // never step past the cell border by much
  return res;
}

vec2 mapScene(vec3 p){
  vec2 res = vec2(p.y - groundH(p.xz), M_GROUND);
  res = opU(res, mapTrees(p));
  res = opU(res, mapProps(p));
  res = opU(res, mapFlowers(p));
  res = opU(res, mapDino(p));
  res = opU(res, mapDragon(p));
  res = opU(res, mapEgg(p));
  return res;
}
float mapD(vec3 p){ return mapScene(p).x; }
float mapShadow(vec3 p){
  float d = p.y - groundH(p.xz);
  d = min(d, mapTrees(p).x);
  d = min(d, mapProps(p).x);
  d = min(d, mapDino(p).x);
  d = min(d, mapDragon(p).x);
  d = min(d, mapEgg(p).x);
  return d;
}

vec3 calcNormal(vec3 p, float t){
  float e = 0.0005*max(1.0, t*0.5);
  vec2 k = vec2(1.0,-1.0);
  return normalize(k.xyy*mapD(p+k.xyy*e) + k.yyx*mapD(p+k.yyx*e) + k.yxy*mapD(p+k.yxy*e) + k.xxx*mapD(p+k.xxx*e));
}

vec2 march(vec3 ro, vec3 rd){
  float t = 0.05; float m = -1.0;
  for(int i=0;i<200;i++){
    vec3 p = ro + rd*t;
    vec2 h = mapScene(p);
    if(abs(h.x) < 0.0006*t){ m = h.y; break; }
    t += h.x*0.8;
    if(t > 45.0) break;
  }
  if(t > 45.0) m = -1.0;
  return vec2(t, m);
}

float softShadow(vec3 ro, vec3 rd, float k){
  float res = 1.0; float t = 0.02;
  for(int i=0;i<40;i++){
    float h = mapShadow(ro + rd*t);
    res = min(res, k*h/t);
    t += clamp(h, 0.02, 0.35);
    if(res < 0.005 || t > 10.0) break;
  }
  return clamp(res, 0.0, 1.0);
}
float calcAO(vec3 p, vec3 n){
  float occ = 0.0, sca = 1.0;
  for(int i=0;i<5;i++){
    float h = 0.015 + 0.09*float(i);
    float d = mapShadow(p + n*h);
    occ += (h-d)*sca; sca *= 0.85;
  }
  return clamp(1.0 - 2.2*occ, 0.0, 1.0);
}

// ---------------------------------------------------------------- lighting
const vec3 SUN_DIR = normalize(vec3(-0.55, 0.62, 0.65));
const vec3 SUN_COL = vec3(1.55, 1.25, 0.95);
const vec3 KEY_DIR = normalize(vec3(0.3, 0.5, -0.8));
const vec3 KEY_COL = vec3(1.45, 1.28, 1.08);

vec3 skyColor(vec3 rd){
  float y = rd.y;
  vec3 top = vec3(0.28, 0.55, 0.95);
  vec3 hor = vec3(0.98, 0.86, 0.72);
  vec3 c = mix(hor, top, pow(clamp(y*1.2+0.05, 0.0, 1.0), 0.6));
  float sd = max(dot(rd, SUN_DIR), 0.0);
  c += vec3(1.0,0.75,0.45)*pow(sd, 8.0)*0.6 + vec3(1.0,0.9,0.7)*pow(sd, 200.0)*3.0;
  // soft clouds
  vec2 cuv = rd.xz/(rd.y+0.15)*1.5 + vec2(uTime*0.02, 0.0);
  float cl = smoothstep(0.5, 0.8, fbm2(cuv*1.3));
  c = mix(c, vec3(1.0,0.97,0.95), cl*0.6*smoothstep(0.0,0.25,y));
  return c;
}

vec3 eggLightPos(){ return uEPos + vec3(0.0, 0.32, 0.0); }

vec3 eyeColor(vec3 h, vec3 c, float r, float side, vec2 look, vec3 iris, float pupilScale){
  vec3 q = h - c;
  vec3 n = normalize(q);
  vec3 f = normalize(vec3(1.0, 0.0, side*0.62));
  vec3 a = normalize(cross(vec3(0,1,0), f));
  vec3 u = cross(f, a);
  vec3 ld = normalize(f + a*look.x*side*0.0 + vec3(0.0,0.0,1.0)*look.x*0.6 + u*look.y*0.6 - f*0.0);
  float dd = dot(n, ld);
  vec3 col = vec3(0.97,0.97,0.98);
  float irisR = 0.72, pupR = mix(0.9, 0.84, pupilScale);
  float t1 = smoothstep(irisR-0.015, irisR+0.015, dd);
  col = mix(col, iris*mix(0.6,1.2,smoothstep(irisR, 0.95, dd)), t1);
  col = mix(col, vec3(0.02,0.015,0.03), smoothstep(pupR-0.01, pupR+0.01, dd));
  return col;
}

struct Mat { vec3 alb; float spec; float rough; vec3 emi; float sss; };

Mat getMat(vec3 p, vec3 n, float m){
  Mat mt; mt.alb = vec3(0.5); mt.spec = 0.1; mt.rough = 0.6; mt.emi = vec3(0.0); mt.sss = 0.0;
  if(m == M_GROUND){
    float g = fbm2(p.xz*2.0);
    vec3 c1 = vec3(0.30,0.62,0.16), c2 = vec3(0.52,0.78,0.22);
    mt.alb = mix(c1, c2, g);
    mt.alb = mix(mt.alb, vec3(0.20,0.45,0.18), smoothstep(0.55,0.8,fbm2(p.xz*0.7+3.0))*0.6);
    float blades = noise2(vec2(p.x*90.0, p.z*25.0))*noise2(vec2(p.x*30.0+3.0, p.z*80.0));
    mt.alb *= 0.8 + 0.45*blades;
    // tiny painted flowers
    vec2 fc = floor(p.xz*9.0);
    float fh = hash21(fc);
    vec2 fl = fract(p.xz*9.0)-0.5;
    if(fh > 0.86 && length(fl) < 0.18){
      float k = hash21(fc+4.0);
      mt.alb = k<0.33 ? vec3(1.0,0.95,0.9) : (k<0.66 ? vec3(1.0,0.75,0.2) : vec3(0.95,0.5,0.8));
    }
    // dirt path in the clearing
    float path = smoothstep(0.55, 0.25, abs(p.z - 0.05 + 0.12*sin(p.x*1.3)));
    mt.alb = mix(mt.alb, vec3(0.62,0.5,0.32)*(0.85+0.3*noise2(p.xz*8.0)), path*0.55);
    mt.rough = 0.9; mt.spec = 0.02;
  } else if(m == M_TRUNK){
    mt.alb = vec3(0.45,0.29,0.17)*(0.8+0.4*noise2(vec2(p.y*12.0, atan(p.x,p.z)*3.0)));
  } else if(m == M_CANOPY){
    vec2 cid = floor(p.xz/2.4);
    // the canopy may overhang into the neighbour cell; use a stable palette lookup
    float best = 1e5; float hh = 0.0;
    for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
      vec2 c = cid + vec2(float(i),float(j));
      vec2 tp = (c+0.5)*2.4 + (vec2(hash21(c+7.1), hash21(c+3.7))-0.5)*2.4*0.45;
      float dd = length(p.xz - tp);
      if(dd < best){ best = dd; hh = hash21(c*3.1+1.7); }
    }
    vec3 pal[6] = vec3[6](vec3(0.25,0.62,0.18), vec3(0.45,0.75,0.15), vec3(0.15,0.6,0.45),
                          vec3(0.95,0.55,0.70), vec3(1.0,0.62,0.15), vec3(0.6,0.45,0.85));
    int idx = int(hh*5.99);
    mt.alb = pal[idx]*(0.8 + 0.35*noise3(p*4.0));
    mt.sss = 0.5; mt.rough = 0.8;
  } else if(m == M_MUSHCAP){
    mt.alb = vec3(0.92,0.16,0.14);
    vec3 dq = p*9.0;
    vec3 cell = floor(dq); vec3 fr = fract(dq)-0.5;
    vec3 o = hash33(cell)-0.5;
    if(length(fr - o*0.4) < 0.22) mt.alb = vec3(1.0,0.97,0.9);
    mt.spec = 0.35; mt.rough = 0.35; mt.sss = 0.3;
  } else if(m == M_GMUSH){
    mt.alb = vec3(0.25,0.55,1.0);
    mt.emi = vec3(0.15,0.45,1.0)*(0.6+0.25*sin(uTime*2.0 + p.x*5.0));
    mt.spec = 0.4; mt.rough = 0.3; mt.sss = 0.5;
  } else if(m == M_MUSHSTEM){
    mt.alb = vec3(0.98,0.92,0.82); mt.sss = 0.4;
  } else if(m == M_FLOWER){
    vec2 cid = floor(p.xz/0.42);
    float k = hash21(cid+9.1);
    vec3 cols[5] = vec3[5](vec3(1.0,0.35,0.55), vec3(1.0,0.85,0.2), vec3(0.6,0.4,1.0), vec3(1.0,1.0,1.0), vec3(1.0,0.55,0.2));
    mt.alb = cols[int(k*4.99)];
    mt.sss = 0.6; mt.spec = 0.2;
  } else if(m == M_STEM+0.5){
    mt.alb = vec3(1.0,0.8,0.15); mt.sss = 0.3;
  } else if(m == M_STEM){
    mt.alb = vec3(0.2,0.55,0.15);
  } else if(m == M_ROCK){
    mt.alb = vec3(0.55,0.55,0.6)*(0.8+0.3*noise3(p*6.0));
    mt.alb = mix(mt.alb, vec3(0.3,0.6,0.2), smoothstep(0.3,0.9,n.y)*0.6);
  } else if(m == M_DSKIN || m == M_DLID){
    float sc; vec3 q = toDino(p, sc);
    vec3 h = dinoHeadLocal(q);
    vec3 base = vec3(0.30,0.80,0.42);
    vec3 belly = vec3(1.0,0.96,0.74);
    // belly: front/bottom of body and under the snout
    float bm = smoothstep(0.05, 0.2, q.x + 0.12 - abs(q.z)*0.9) * smoothstep(0.75, 0.55, q.y) * smoothstep(0.05,0.2,q.y);
    float jaw = smoothstep(0.17, 0.08, h.y) * smoothstep(0.05, 0.25, h.x);
    float bel = max(bm, jaw);
    mt.alb = mix(base, belly, bel);
    // back spots
    vec3 sp = q*7.0; vec3 cell = floor(sp); vec3 fr = fract(sp)-0.5; vec3 o = hash33(cell)-0.5;
    float spot = smoothstep(0.26, 0.2, length(fr - o*0.35)) * smoothstep(0.1, -0.2, q.x - q.y*0.3 + 0.2) * (1.0-bel);
    mt.alb = mix(mt.alb, vec3(0.16,0.58,0.36), spot*0.8);
    // cheeks
    for(int i=0;i<2;i++){ float s = i==0?-1.0:1.0;
      float ck = smoothstep(0.09, 0.03, length(h - vec3(0.28,0.25,s*0.22)));
      mt.alb = mix(mt.alb, vec3(1.0,0.5,0.55), ck*0.65); }
    // nostrils
    for(int i=0;i<2;i++){ float s = i==0?-1.0:1.0;
      float ns = smoothstep(0.022, 0.012, length(h - vec3(0.5,0.27,s*0.06)));
      mt.alb = mix(mt.alb, vec3(0.1,0.3,0.15), ns); }
    // smile line when mouth closed
    if(uDFace.z < 0.05){
      float sm = abs(h.y - (0.13 + 1.5*h.z*h.z)) ;
      float line = smoothstep(0.009, 0.004, sm) * smoothstep(0.3, 0.4, h.x) * step(abs(h.z), 0.13);
      mt.alb = mix(mt.alb, vec3(0.08,0.25,0.12), line);
    }
    if(m == M_DLID){
      // lash line along the lid edge
      for(int i=0;i<2;i++){ float s = i==0?-1.0:1.0;
        float er = 0.098*uDFace.w; vec3 eq = h - vec3(0.28,0.41,s*0.135);
        if(length(eq) < er*1.2){
          vec3 f = normalize(vec3(1.0,0.0,s*0.62)); vec3 a = normalize(cross(vec3(0,1,0), f));
          float zn = dot(eq,a)/er; float arc = er*(0.28 - 0.75*zn*zn);
          float topB = mix(er*mix(-0.08,1.25,uDFace.x), arc, uDFace.y);
          float botB = mix(-er*mix(0.0,1.25,uDFace.x), arc-0.01*er, uDFace.y);
          float dl = min(abs(eq.y - topB), abs(eq.y - botB));
          mt.alb = mix(mt.alb, vec3(0.05,0.12,0.06), smoothstep(0.016, 0.008, dl)*step(dot(eq,f), er*1.2));
        }
      }
    }
    mt.sss = 0.6; mt.spec = 0.18; mt.rough = 0.5;
  } else if(m == M_DSPIKE){
    mt.alb = vec3(1.0,0.55,0.25); mt.sss = 0.5; mt.spec = 0.3; mt.rough = 0.4;
  } else if(m == M_DEYE){
    float sc; vec3 q = toDino(p, sc); vec3 h = dinoHeadLocal(q);
    float s = h.z > 0.0 ? 1.0 : -1.0;
    mt.alb = eyeColor(h, vec3(0.28,0.41,s*0.135), 0.098*uDFace.w, s, uDLook, vec3(0.45,0.28,0.12), clamp(uDFace.w-1.0,0.0,1.0)*3.0);
    mt.spec = 1.0; mt.rough = 0.05;
  } else if(m == M_DMOUTH){
    float sc; vec3 q = toDino(p, sc); vec3 h = dinoHeadLocal(q);
    mt.alb = mix(vec3(0.45,0.06,0.1), vec3(1.0,0.45,0.5), smoothstep(0.08, 0.05, h.y));
    mt.spec = 0.2;
  } else if(m == M_GSKIN || m == M_GLID){
    float sc; vec3 q = toDrag(p, sc); vec3 h = dragHeadLocal(q);
    vec3 base = vec3(1.0,0.38,0.12);
    vec3 belly = vec3(1.0,0.85,0.35);
    float bm = smoothstep(0.04, 0.17, q.x + 0.1 - abs(q.z)*0.9) * smoothstep(0.62, 0.48, q.y) * smoothstep(0.03,0.15,q.y);
    float jaw = smoothstep(0.17, 0.08, h.y) * smoothstep(0.05, 0.25, h.x);
    float bel = max(bm, jaw);
    // belly stripes
    float stripes = smoothstep(0.3, 0.5, abs(fract(q.y*14.0)-0.5)*2.0);
    mt.alb = mix(base, belly*mix(0.88,1.0,stripes), bel);
    for(int i=0;i<2;i++){ float s = i==0?-1.0:1.0;
      float ck = smoothstep(0.09, 0.03, length(h - vec3(0.26,0.25,s*0.23)));
      mt.alb = mix(mt.alb, vec3(1.0,0.35,0.45), ck*0.6); }
    if(uGFace.z < 0.05){
      float sm = abs(h.y - (0.13 + 1.6*h.z*h.z));
      float line = smoothstep(0.009, 0.004, sm) * smoothstep(0.28, 0.38, h.x) * step(abs(h.z), 0.12);
      mt.alb = mix(mt.alb, vec3(0.35,0.08,0.03), line);
    }
    if(m == M_GLID){
      for(int i=0;i<2;i++){ float s = i==0?-1.0:1.0;
        float er = 0.11*uGFace.w; vec3 eq = h - vec3(0.25,0.42,s*0.155);
        if(length(eq) < er*1.2){
          vec3 f = normalize(vec3(1.0,0.0,s*0.62)); vec3 a = normalize(cross(vec3(0,1,0), f));
          float zn = dot(eq,a)/er; float arc = er*(0.28 - 0.75*zn*zn);
          float topB = mix(er*mix(-0.08,1.25,uGFace.x), arc, uGFace.y);
          float botB = mix(-er*mix(0.0,1.25,uGFace.x), arc-0.01*er, uGFace.y);
          float dl = min(abs(eq.y - topB), abs(eq.y - botB));
          mt.alb = mix(mt.alb, vec3(0.3,0.05,0.02), smoothstep(0.016, 0.008, dl)*step(dot(eq,f), er*1.2));
        }
      }
    }
    mt.sss = 0.65; mt.spec = 0.3; mt.rough = 0.4;
  } else if(m == M_GHORN){
    mt.alb = vec3(1.0,0.93,0.75); mt.spec = 0.3; mt.rough = 0.35; mt.sss = 0.3;
  } else if(m == M_GWING){
    mt.alb = vec3(0.75,0.4,0.95); mt.sss = 1.0; mt.spec = 0.2; mt.rough = 0.5;
  } else if(m == M_GEYE){
    float sc; vec3 q = toDrag(p, sc); vec3 h = dragHeadLocal(q);
    float s = h.z > 0.0 ? 1.0 : -1.0;
    mt.alb = eyeColor(h, vec3(0.25,0.42,s*0.155), 0.11*uGFace.w, s, uGLook, vec3(0.95,0.7,0.1), clamp(uGFace.w-1.0,0.0,1.0)*3.0);
    mt.spec = 1.0; mt.rough = 0.05;
  } else if(m == M_GMOUTH){
    float sc; vec3 q = toDrag(p, sc); vec3 h = dragHeadLocal(q);
    mt.alb = mix(vec3(0.45,0.05,0.08), vec3(1.0,0.45,0.5), smoothstep(0.08, 0.05, h.y));
  } else if(m == M_EGG || m == M_EGGIN){
    vec3 q = toEgg(p);
    bool isCap = false;
    if(uECrack.y > 0.5){
      vec3 c = toCap(p);
      float dc = abs(max(max(eggShape(c), -(eggShape(c)+0.022)), (crackY(atan(c.z,c.x)) - c.y)*0.7));
      float ang = atan(q.z,q.x);
      float db = abs(max(max(eggShape(q), -(eggShape(q)+0.022)), (q.y - crackY(ang))*0.7));
      if(dc < db){ q = c; isCap = true; }
    }
    vec3 base = mix(vec3(0.82,0.74,1.0), vec3(1.0,0.93,0.8), 0.5+0.5*q.y/EH);
    // iridescent shimmer
    float fr = 1.0 - abs(dot(n, normalize(uCamPos - p)));
    base += 0.15*vec3(sin(fr*6.0+uTime), sin(fr*6.0+2.0+uTime), sin(fr*6.0+4.0+uTime))*fr;
    // spots
    vec3 sp = q*vec3(9.0,7.0,9.0);
    vec3 cell = floor(sp); vec3 frc = fract(sp)-0.5; vec3 o = hash33(cell)-0.5;
    float sd = length(frc - o*0.4);
    float spot = smoothstep(0.27, 0.2, sd);
    float k = hash11(dot(cell, vec3(1.0,57.0,113.0)));
    vec3 scol = k<0.33 ? vec3(1.0,0.45,0.75) : (k<0.66 ? vec3(0.3,0.75,1.0) : vec3(1.0,0.8,0.25));
    mt.alb = mix(base, scol, spot);
    float glow = uEWob.w;
    mt.emi = scol*spot*glow*2.2 + vec3(1.0,0.8,0.95)*glow*0.18;
    // crack lines (before opening)
    if(uECrack.y < 0.5 && uECrack.x > 0.0){
      float ang = atan(q.z, q.x);
      float prog = (ang + PI)/(2.0*PI);
      float cd = abs(q.y - crackY(ang));
      float vis = step(abs(prog-0.5)*2.0, uECrack.x*1.05);
      float br = 0.0;
      // small side branches
      for(int b=0;b<4;b++){
        float ba = -2.2 + float(b)*1.4;
        float bx = ang - ba;
        float by = q.y - crackY(ba);
        float bl = smoothstep(0.012, 0.0, abs(bx*0.25 - by*0.6 + sin(by*40.0)*0.01)) * step(0.0, by) * step(by, 0.09*uECrack.x);
        br = max(br, bl);
      }
      float cl = max(smoothstep(0.012, 0.003, cd)*vis, br*step(0.4, uECrack.x));
      mt.alb = mix(mt.alb, vec3(1.0,0.9,0.5), cl);
      mt.emi += vec3(1.0,0.8,0.35)*cl*6.0;
    }
    if(m == M_EGGIN || (uECrack.y > 0.5 && dot(n, normalize(q)) < -0.2)){
      mt.alb = vec3(1.0,0.85,0.55);
      mt.emi = vec3(1.0,0.75,0.35)*uECrack.z*1.5;
    }
    // jagged rim glow just after opening
    if(uECrack.y > 0.5){
      float rim = abs(q.y - crackY(atan(q.z,q.x)));
      mt.emi += vec3(1.0,0.8,0.4)*smoothstep(0.02, 0.0, rim)*uECrack.z*3.0;
    }
    mt.spec = 0.6; mt.rough = 0.2; mt.sss = 0.6;
  }
  return mt;
}

vec3 pointLight(vec3 p, vec3 n, vec3 lp, vec3 col, float I){
  vec3 l = lp - p; float d2 = dot(l,l); l *= inversesqrt(d2);
  return col*I*max(dot(n,l)*0.75+0.25, 0.0)/(1.0 + d2*5.0);
}

vec3 shade(vec3 ro, vec3 rd, float t, float m){
  vec3 p = ro + rd*t;
  vec3 n = calcNormal(p, t);
  Mat mt = getMat(p, n, m);
  vec3 v = -rd;
  float ao = calcAO(p, n);
  float sh = softShadow(p + n*0.004, SUN_DIR, 10.0);
  // sun (wrap lighting for soft cartoon look)
  float w = mt.sss*0.5;
  float ndl = dot(n, SUN_DIR);
  float dif = clamp((ndl + w)/(1.0 + w), 0.0, 1.0);
  vec3 col = vec3(0.0);
  vec3 sssTint = mix(vec3(1.0), vec3(1.0,0.55,0.4), mt.sss*smoothstep(0.4,0.0,abs(ndl)));
  col += mt.alb*SUN_COL*dif*sh*sssTint;
  // key/fill from the camera side (soft, no shadow)
  float kd = clamp((dot(n, KEY_DIR) + 0.3)/1.3, 0.0, 1.0);
  col += mt.alb*KEY_COL*kd*0.75*(0.5+0.5*ao);
  // sky dome
  float skyAmt = 0.5 + 0.5*n.y;
  col += mt.alb*vec3(0.5,0.65,0.95)*skyAmt*0.6*(0.3+0.7*ao);
  // ground bounce
  col += mt.alb*vec3(0.55,0.6,0.3)*clamp(-n.y*0.5+0.5,0.0,1.0)*0.35*ao;
  // translucency for thin things (leaves, wings)
  if(mt.sss > 0.9){
    float tr = pow(clamp(dot(rd, SUN_DIR), 0.0, 1.0), 2.0);
    col += mt.alb*SUN_COL*tr*0.8;
  }
  // specular
  vec3 hv = normalize(SUN_DIR + v);
  float shin = mix(8.0, 180.0, 1.0 - mt.rough);
  float spe = pow(max(dot(n,hv),0.0), shin) * mt.spec * (shin+8.0)/40.0;
  col += SUN_COL*spe*sh;
  vec3 hk = normalize(KEY_DIR + v);
  col += KEY_COL*pow(max(dot(n,hk),0.0), shin)*mt.spec*(shin+8.0)/160.0;
  // rim light
  float fre = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);
  col += mix(vec3(0.7,0.85,1.0), vec3(1.0,0.85,0.6), sh)*mt.alb*fre*0.6*ao*(m >= 10.0 ? 1.0 : 0.3);
  // magical point lights
  float eggI = uEWob.w*0.6 + uECrack.z*0.8 + uECrack.w*4.0;
  col += mt.alb*pointLight(p, n, eggLightPos(), vec3(1.0,0.78,0.5), eggI);
  col += mt.alb*pointLight(p, n, uFB.xyz, vec3(1.0,0.5,0.15), uFBp.x*3.0);
  col *= mix(1.0, ao, 0.5);
  col += mt.emi;
  return col;
}

// glow from a point along a ray segment
float glowPoint(vec3 ro, vec3 rd, float tmax, vec3 c, float r){
  vec3 oc = c - ro;
  float tc = clamp(dot(oc, rd), 0.0, tmax);
  float d = length(oc - rd*tc);
  return r*r/(d*d + r*r*0.15) * step(0.0, dot(oc,rd));
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*uRes)/uRes.y;
  vec3 ro = uCamPos;
  vec3 fw = normalize(uCamTar - ro);
  vec3 up0 = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 ri = normalize(cross(up0, fw));
  vec3 up = cross(fw, ri);
  float fl = 1.0/tan(radians(uFov)*0.5);
  vec3 rd = normalize(uv.x*ri + uv.y*up + fl*0.5*fw);

  vec2 hit = march(ro, rd);
  float t = hit.x;
  vec3 col;
  vec3 sky = skyColor(rd);
  if(hit.y < 0.0){
    col = sky;
    t = 60.0;
  } else {
    col = shade(ro, rd, t, hit.y);
    // atmospheric perspective
    float fog = 1.0 - exp(-max(t-4.0, 0.0)*0.05);
    vec3 fogc = mix(vec3(0.62,0.78,0.85), vec3(1.0,0.86,0.62), pow(max(dot(rd,SUN_DIR),0.0),3.0));
    col = mix(col, fogc, fog);
  }
  // light shafts / sun haze
  col += vec3(1.0,0.8,0.5)*pow(max(dot(rd,SUN_DIR),0.0), 4.0)*0.12;

  float tmax = t;
  // egg glow
  float eggI = uEWob.w*0.25 + uECrack.z*0.4 + uECrack.w*2.5;
  col += vec3(1.0,0.8,0.5)*glowPoint(ro, rd, tmax, eggLightPos(), 0.2)*eggI*0.35;
  // fireball
  if(uFBp.x > 0.0){
    for(int i=0;i<6;i++){
      float k = float(i)/5.0;
      vec3 c = uFB.xyz - uFBVel*k*0.09;
      float r = uFB.w*(1.0 - k*0.6);
      float g = glowPoint(ro, rd, tmax, c, r);
      vec3 fc = mix(vec3(1.0,0.95,0.6), vec3(1.0,0.35,0.05), k);
      col += fc*g*uFBp.x*(1.0-k*0.7)*0.55;
    }
    // core
    vec3 oc = uFB.xyz - ro; float tc = dot(oc, rd); float d = length(oc - rd*tc);
    if(tc > 0.0 && tc < tmax){
      float n = noise3(vec3(rd.xy*60.0, uTime*12.0));
      float core = smoothstep(uFB.w*(0.9+0.3*n), uFB.w*0.2, d);
      col = mix(col, vec3(4.0,3.0,1.2), core*uFBp.x);
    }
  }
  // smoke puff
  if(uFBp.y > 0.0){
    for(int i=0;i<7;i++){
      vec3 o = (hash33(vec3(float(i)*3.1, 1.0, 2.0)) - 0.5)*vec3(0.35,0.25,0.35)*(0.5+uFBp.y);
      vec3 c = uSmokePos + o + vec3(0.0, uFBp.y*0.25, 0.0);
      vec3 oc = c - ro; float tc = dot(oc, rd);
      if(tc <= 0.0 || tc > tmax) continue;
      float d = length(oc - rd*tc);
      float r = 0.11 + 0.07*hash11(float(i)) + uFBp.y*0.12;
      float a = smoothstep(r, r*0.25, d)*clamp(1.5 - uFBp.y*1.5, 0.0, 1.0)*0.92;
      vec3 sc = mix(vec3(0.42,0.4,0.42), vec3(0.92,0.9,0.88), clamp(0.5+(c.y - uSmokePos.y)*3.0 - d/r*0.3, 0.0, 1.0));
      col = mix(col, sc, a);
    }
  }
  // sparkles / fireflies
  for(int i=0;i<36;i++){
    float fi = float(i);
    vec3 hr = hash33(vec3(fi, fi*1.7, 3.3));
    vec3 c;
    float tw = 0.5+0.5*sin(uTime*(2.0+hr.x*3.0) + fi);
    float bright;
    vec3 sc;
    if(i < 20){
      // ambient fireflies drifting through the clearing
      c = vec3(-2.0 + hr.x*4.0, 0.3 + hr.y*1.6, -0.8 + hr.z*3.0);
      c += 0.25*vec3(sin(uTime*0.5+fi), sin(uTime*0.7+fi*2.0), cos(uTime*0.4+fi));
      bright = 0.35*tw; sc = vec3(1.0,0.9,0.5);
    } else {
      // magic burst from the egg
      float b = uECrack.w + uFBp.w;
      if(b <= 0.001) continue;
      vec3 dir = normalize(hr - 0.5 + vec3(0.0,0.35,0.0));
      float age = uFBp.z;
      c = eggLightPos() + dir*(0.2 + age*1.1) + vec3(0.0, -age*age*0.4, 0.0);
      bright = b*1.2*tw; sc = mix(vec3(1.0,0.6,0.9), vec3(0.5,0.9,1.0), hr.x);
    }
    col += sc*glowPoint(ro, rd, tmax, c, 0.012)*bright;
  }
  // flash
  col += vec3(1.0,0.9,0.7)*uECrack.w*0.25;

  fragColor = vec4(col, t);
}
