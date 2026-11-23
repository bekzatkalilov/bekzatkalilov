#version 330
// EP02 "What If You Could Read Everyone's Mind?"
// Procedural SDF raymarcher. Tiko (baby dino) and Sparky (tiny dragon) are the EP01 models,
// extended with brows + mouth shapes for dialogue. New cast: Mama (dino variant),
// Professor Shellby (tortoise), Coco (parrot). Locations: clearing / pond / nest.
out vec4 fragColor;

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uCamPos;
uniform vec3 uCamTar;
uniform float uFov;
uniform float uCamRoll;

// lighting / environment
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uKeyDir;
uniform vec3 uKeyCol;
uniform vec3 uSkyTop;
uniform vec3 uSkyHor;
uniform vec3 uFogCol;
uniform vec3 uAmbCol;
uniform vec4 uEnv;        // night, fog density, cloud amount, location (0 clearing, 1 pond, 2 nest)
uniform vec4 uParty;      // props, lanterns lit, treehouse, confetti age (<0 off)
uniform vec4 uPL[6];      // point lights: pos, falloff
uniform vec4 uPLc[6];     // colour * intensity

// dinos: 0 = Tiko, 1 = Mama
uniform vec4 uDPosS[2];   // pos, scale (0 hidden)
uniform float uDYaw[2];
uniform vec3 uDSquash[2]; // y scale, xz scale, lean
uniform vec4 uDHead[2];   // pitch, roll, yaw, -
uniform vec4 uDFace[2];   // eyeOpen, laugh, mouth, eyeScale
uniform vec4 uDFace2[2];  // mouth width, brow raise, brow angle, smile
uniform vec4 uDMisc[2];   // tail phase, arm raise, walk phase, walk amount
uniform vec4 uDLook[2];   // look xy, eye glow, -

// dragon (Sparky)
uniform vec3 uGPos;
uniform float uGYaw;
uniform vec4 uGSquash;    // y scale, xz scale, lean, overall scale
uniform vec4 uGHead;
uniform vec4 uGFace;
uniform vec4 uGFace2;
uniform vec4 uGMisc;      // wing flap, tail phase, arm raise, nose scrunch
uniform vec4 uGLook;

// tortoise (Professor Shellby)
uniform vec4 uTPosS;
uniform float uTYaw;
uniform vec4 uTHead;      // pitch, roll, yaw, neck extension
uniform vec4 uTFace;
uniform vec4 uTFace2;
uniform vec4 uTMisc;      // walk phase, walk amount, glasses (0 on head .. 1 on nose), body bob
uniform vec4 uTLook;

// parrot (Coco)
uniform vec4 uPPosS;
uniform float uPYaw;
uniform vec4 uPHead;
uniform vec4 uPFace;
uniform vec4 uPFace2;
uniform vec4 uPMisc;      // wing flap, wing spread, tail, lean
uniform vec4 uPLook;      // look xy, eye glow

// the Thinking Star
uniform vec4 uStar;       // pos, size (0 hidden)
uniform vec4 uStarP;      // glow, crack, red, spin
uniform vec4 uStarTrail;  // velocity, trail amount

// effects
uniform vec4 uFB;         // fireball pos, size
uniform vec4 uFBp;        // intensity, smoke age, -, -
uniform vec3 uFBVel;
uniform vec3 uSmokePos;
uniform vec4 uFW[3];      // firework bursts: pos, age (<0 off)
uniform vec4 uFWc[3];     // colour, intensity
uniform vec4 uRing[3];    // thought ripples: pos, intensity
uniform vec4 uDust;       // crash dust: pos, age (<0 off)
uniform vec4 uFeath;      // feather puff: pos, age (<0 off)

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
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0); }
float sdTorus(vec3 p, vec2 t){ vec2 q = vec2(length(p.xz)-t.x, p.y); return length(q)-t.y; }
float sdTorusX(vec3 p, vec2 t){ vec2 q = vec2(length(p.yz)-t.x, p.x); return length(q)-t.y; }
float sdOcta(vec3 p, float s){ p = abs(p); return (p.x+p.y+p.z-s)*0.57735027; }

// material ids (dino ids + 50 for Mama)
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
#define M_DBROW 11.0
#define M_DSPIKE 12.0
#define M_DEYE 13.0
#define M_DMOUTH 14.0
#define M_DLID 15.0
#define M_GSKIN 20.0
#define M_GBROW 21.0
#define M_GHORN 22.0
#define M_GEYE 23.0
#define M_GWING 24.0
#define M_GMOUTH 25.0
#define M_GLID 26.0
#define M_EGG 30.0
#define M_EGGIN 31.0
#define M_TSKIN 32.0
#define M_TSHELL 33.0
#define M_TEYE 34.0
#define M_TLID 35.0
#define M_TMOUTH 36.0
#define M_TBROW 37.0
#define M_TGLASS 38.0
#define M_PBODY 40.0
#define M_PBEAK 41.0
#define M_PEYE 42.0
#define M_PLID 43.0
#define M_PCREST 44.0
#define M_PWING 45.0
#define M_PMOUTH 46.0
#define M_STAR 47.0
#define M_WATER 48.0
#define M_LILY 49.0
#define M_NEST 50.0
#define M_BUSH 51.0
#define M_WOOD 52.0
#define M_CAKE 53.0
#define M_FROST 54.0
#define M_CANDLE 55.0
#define M_LANTERN 56.0
#define M_FLAG 57.0
#define M_GIFT 58.0
#define M_ROOF 59.0
#define M_STRING 66.0

vec2 opU(vec2 a, vec2 b){ return a.x<b.x ? a : b; }

// ---------------------------------------------------------------- eyes + brows
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
// brow over an eye: raise moves it up, ang > 0 lifts the inner end (worried), < 0 lowers it (angry)
float browSDF(vec3 h, vec3 c, float r, float side, float raise, float ang){
  float y = c.y + r*(1.2 + 0.4*raise);
  vec3 inner = vec3(c.x + r*0.25, y + ang*r*0.38, side*(abs(c.z) - r*0.62));
  vec3 outer = vec3(c.x - r*0.2, y - ang*r*0.30 - r*0.08, side*(abs(c.z) + r*0.72));
  return sdCapsule(h, inner, outer, r*0.16);
}

// ---------------------------------------------------------------- dinos (EP01 model)
vec3 toDinoI(vec3 p, int i, out float sc){
  vec3 q = p - uDPosS[i].xyz;
  float c = cos(uDYaw[i]), s = sin(uDYaw[i]);
  q = vec3(q.x*c + q.z*s, q.y, -q.x*s + q.z*c);
  q /= uDPosS[i].w;
  q.xy = rot(q.xy, uDSquash[i].z);
  q.y /= uDSquash[i].x; q.xz /= uDSquash[i].y;
  sc = min(uDSquash[i].x, uDSquash[i].y)*uDPosS[i].w;
  return q;
}
vec3 dinoHeadLocalI(vec3 q, int i){
  vec3 h = q - vec3(0.17, 0.70, 0.0);
  h.xz = rot(h.xz, -uDHead[i].z);
  h.xy = rot(h.xy, -uDHead[i].x);
  h.zy = rot(h.zy, uDHead[i].y);
  return h;
}
vec2 mapDinoI(vec3 p, int i){
  if(uDPosS[i].w < 0.01) return vec2(1e5, 0.0);
  float S = uDPosS[i].w;
  float bdw = length(p - uDPosS[i].xyz - vec3(0.0, 0.6*S, 0.0)) - 1.3*S;
  if(bdw > 0.3) return vec2(bdw, 0.0);
  float sc; vec3 q = toDinoI(p, i, sc);
  float mo_ = (i==1) ? 50.0 : 0.0;
  float walk = uDMisc[i].z, wa = uDMisc[i].w;
  float d = sdEllipsoid(q - vec3(0.0,0.44,0.0), vec3(0.37,0.37,0.33));
  float wag = sin(uDMisc[i].x);
  for(int k=0;k<6;k++){
    float t = float(k)/5.0;
    vec3 c = vec3(-0.28 - t*0.62, 0.36 - t*0.26 + t*t*0.16, wag*0.28*t*t);
    d = smin(d, length(q-c) - 0.19*(1.0-0.78*t), 0.09);
  }
  for(int k=0;k<2;k++){
    float s = k==0 ? -1.0 : 1.0;
    float ph = walk + (k==0 ? 0.0 : PI);
    float lift = max(sin(ph),0.0)*0.09*wa;
    float sw = cos(ph)*0.08*wa;
    vec3 foot = vec3(0.06+sw, 0.07+lift, s*0.17);
    d = smin(d, sdCapsule(q, foot, vec3(0.02,0.32,s*0.16), 0.115), 0.06);
    d = smin(d, sdEllipsoid(q - foot - vec3(0.05,-0.02,0.0), vec3(0.15,0.07,0.11)), 0.04);
  }
  for(int k=0;k<2;k++){
    float s = k==0 ? -1.0 : 1.0;
    float ar = uDMisc[i].y;
    vec3 a0 = vec3(0.22,0.58,s*0.22);
    vec3 a1 = a0 + vec3(0.13 - ar*0.05, -0.1 + ar*0.32, s*(0.06 + ar*0.06));
    d = smin(d, sdCapsule(q, a0, a1, 0.055), 0.05);
  }
  vec3 h = dinoHeadLocalI(q, i);
  float dh = sdEllipsoid(h - vec3(0.10,0.30,0.0), vec3(0.31,0.28,0.28));
  dh = smin(dh, sdEllipsoid(h - vec3(0.33,0.20,0.0), vec3(0.20,0.155,0.185)), 0.12);
  float mo = uDFace[i].z;
  float mw = mix(0.75, 1.15, uDFace2[i].x);
  float dm = sdEllipsoid(h - vec3(0.47,0.11,0.0), vec3(0.13, 0.015+0.085*mo, 0.12*mw));
  if(mo > 0.02) dh = smax(dh, -dm, 0.025);
  d = smin(d, dh, 0.13);
  vec2 res = vec2(d, M_DSKIN + mo_);
  if(mo > 0.02 && abs(dm) < 0.012 && d < 0.02) res.y = M_DMOUTH + mo_;
  float ds = 1e5;
  for(int k=0;k<5;k++){
    float t = float(k)/4.0;
    vec3 base = vec3(0.05 - t*0.75, 0.80 - t*0.48, wag*0.28*t*t*0.6);
    vec3 dir = normalize(vec3(-0.35, 1.0, 0.0));
    float sz = 0.085*(1.0 - 0.45*t);
    ds = min(ds, sdRoundCone(q, base - dir*0.03, base + dir*sz*1.2, sz*0.75, 0.015));
  }
  ds = min(ds, sdRoundCone(h, vec3(-0.02,0.55,0.0), vec3(-0.08,0.66,0.0), 0.06, 0.015));
  ds = min(ds, sdRoundCone(h, vec3(-0.17,0.47,0.0), vec3(-0.25,0.56,0.0), 0.05, 0.012));
  if(i == 1){
    // Mama's flower behind the head spike
    ds = min(ds, length(h - vec3(-0.12, 0.6, 0.12)) - 0.055);
  }
  res = opU(res, vec2(ds, M_DSPIKE + mo_));
  float er = 0.098*uDFace[i].w;
  float db = 1e5;
  for(int k=0;k<2;k++){
    float s = k==0 ? -1.0 : 1.0;
    vec3 ec = vec3(0.28,0.41,s*0.135);
    res = opU(res, eyeSDF(h, ec, er, s, uDFace[i].x, uDFace[i].y, M_DEYE + mo_, M_DLID + mo_));
    db = min(db, browSDF(h, ec, 0.098, s, uDFace2[i].y, uDFace2[i].z));
    if(i == 1){
      // eyelashes
      for(int l=0;l<3;l++){
        float fl = float(l);
        vec3 b0 = ec + vec3(0.0, er*0.75, s*er*(0.35 + fl*0.28));
        db = min(db, sdCapsule(h, b0, b0 + vec3(-0.01, 0.045, s*0.03*(fl+0.5)), 0.008));
      }
    }
  }
  res = opU(res, vec2(db, M_DBROW + mo_));
  res.x *= sc;
  return res;
}
vec2 mapDinos(vec3 p){ return opU(mapDinoI(p, 0), mapDinoI(p, 1)); }

// ---------------------------------------------------------------- dragon (EP01 model)
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
  w.zy = rot(w.zy, 0.5 + uGMisc.x);
  w.xz = rot(w.xz, -0.35);
  return w;
}
vec2 mapDragon(vec3 p){
  if(uGSquash.w < 0.01) return vec2(1e5, 0.0);
  float bdw = length(p - uGPos - vec3(0.0, 0.3, 0.0)) - 0.75;
  if(bdw > 0.3) return vec2(bdw, 0.0);
  float sc; vec3 q = toDrag(p, sc);
  float d = sdEllipsoid(q - vec3(0.0,0.38,0.0), vec3(0.31,0.34,0.29));
  float tp = uGMisc.y;
  vec3 tipc = vec3(0.0);
  for(int i=0;i<6;i++){
    float t = float(i)/5.0;
    vec3 c = vec3(-0.25 - t*0.5, 0.2 - t*0.08 + t*t*0.3, sin(tp)*0.3*t*t);
    d = smin(d, length(q-c) - 0.13*(1.0-0.75*t), 0.07);
    tipc = c;
  }
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    vec3 foot = vec3(0.07, 0.06, s*0.15);
    d = smin(d, sdCapsule(q, foot, vec3(0.02,0.25,s*0.14), 0.095), 0.05);
    d = smin(d, sdEllipsoid(q - foot - vec3(0.05,-0.02,0.0), vec3(0.12,0.06,0.09)), 0.03);
  }
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    float ar = uGMisc.z;
    vec3 a0 = vec3(0.2,0.5,s*0.19);
    vec3 a1 = a0 + vec3(0.12 - ar*0.03, -0.08 + ar*0.3, s*(0.05+ar*0.08));
    d = smin(d, sdCapsule(q, a0, a1, 0.048), 0.04);
  }
  vec3 h = dragHeadLocal(q);
  float dh = sdEllipsoid(h - vec3(0.06,0.3,0.0), vec3(0.34,0.31,0.31));
  dh = smin(dh, sdEllipsoid(h - vec3(0.32,0.2,0.0), vec3(0.19,0.15,0.18)), 0.12);
  float ns = 1.0 + uGMisc.w*0.6;
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    dh = smax(dh, -(length(h - vec3(0.5,0.27,s*0.055)) - 0.022*ns), 0.015);
  }
  float mo = uGFace.z;
  float mw = mix(0.75, 1.15, uGFace2.x);
  float dm = sdEllipsoid(h - vec3(0.46,0.11,0.0), vec3(0.12, 0.015+0.08*mo, 0.11*mw));
  if(mo > 0.02) dh = smax(dh, -dm, 0.025);
  d = smin(d, dh, 0.12);
  vec2 res = vec2(d, M_GSKIN);
  if(mo > 0.02 && abs(dm) < 0.012 && d < 0.02) res.y = M_GMOUTH;
  vec3 tq = q - tipc - vec3(-0.07,0.05,0.0);
  float dsp = sdEllipsoid(tq, vec3(0.1,0.08,0.025));
  float dhorn = 1e5;
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    dhorn = min(dhorn, sdRoundCone(h, vec3(-0.02,0.52,s*0.15), vec3(-0.16,0.72,s*0.22), 0.06, 0.018));
    dhorn = min(dhorn, sdEllipsoid(h - vec3(-0.16,0.42,s*0.27), vec3(0.08,0.05,0.02)));
  }
  for(int i=0;i<4;i++){
    float t = float(i)/3.0;
    vec3 b = vec3(-0.06 - t*0.42, 0.68 - t*0.38, 0.0);
    dhorn = min(dhorn, sdRoundCone(q, b, b + vec3(-0.03,0.07,0.0)*(1.0-0.4*t), 0.04*(1.0-0.4*t), 0.01));
  }
  res = opU(res, vec2(min(dhorn, dsp), M_GHORN));
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
    wing = min(wing, sdCapsule(w, vec3(0.0), vec3(-0.12,0.0,0.36), 0.022));
    dw = min(dw, wing);
  }
  res = opU(res, vec2(dw, M_GWING));
  float er = 0.11*uGFace.w;
  float db = 1e5;
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    vec3 ec = vec3(0.25,0.42,s*0.155);
    res = opU(res, eyeSDF(h, ec, er, s, uGFace.x, uGFace.y, M_GEYE, M_GLID));
    db = min(db, browSDF(h, ec, 0.11, s, uGFace2.y, uGFace2.z));
  }
  res = opU(res, vec2(db, M_GBROW));
  res.x *= sc;
  return res;
}

// ---------------------------------------------------------------- tortoise (Professor Shellby)
vec3 toTort(vec3 p){
  vec3 q = p - uTPosS.xyz;
  float c = cos(uTYaw), s = sin(uTYaw);
  q = vec3(q.x*c + q.z*s, q.y, -q.x*s + q.z*c);
  q /= uTPosS.w;
  q.y -= uTMisc.w;
  return q;
}
vec3 tortNeckEnd(){ return vec3(0.52 + 0.1*uTHead.w, 0.44 + 0.06*uTHead.w, 0.0); }
vec3 tortHeadLocal(vec3 q){
  vec3 h = q - tortNeckEnd();
  h.xz = rot(h.xz, -uTHead.z);
  h.xy = rot(h.xy, -uTHead.x);
  h.zy = rot(h.zy, uTHead.y);
  return h;
}
vec3 glassC(float s){
  // lens centre in head space: on the nose (1) or pushed up on the head (0)
  vec3 onN = vec3(0.155, 0.075, s*0.075);
  vec3 onH = vec3(0.03, 0.2, s*0.075);
  return mix(onH, onN, uTMisc.z);
}
vec2 mapTort(vec3 p){
  if(uTPosS.w < 0.01) return vec2(1e5, 0.0);
  float bdw = length(p - uTPosS.xyz - vec3(0.1, 0.35, 0.0)*uTPosS.w) - 0.95*uTPosS.w;
  if(bdw > 0.3) return vec2(bdw, 0.0);
  vec3 q = toTort(p);
  // shell
  float sh = sdEllipsoid(q - vec3(-0.04,0.30,0.0), vec3(0.48,0.38,0.42));
  sh = smax(sh, -(q.y - 0.16), 0.03);
  float rim = sdEllipsoid(q - vec3(-0.04,0.17,0.0), vec3(0.52,0.06,0.46));
  sh = smin(sh, rim, 0.03);
  vec2 res = vec2(sh, M_TSHELL);
  // body under shell, legs, tail
  float b = sdEllipsoid(q - vec3(0.0,0.15,0.0), vec3(0.42,0.09,0.36));
  float wp = uTMisc.x, wa = uTMisc.y;
  for(int i=0;i<4;i++){
    float sx = (i<2) ? 1.0 : -1.0;
    float sz = (i==0 || i==2) ? 1.0 : -1.0;
    float ph = wp + ((i==0||i==3) ? 0.0 : PI);
    float lift = max(sin(ph), 0.0)*0.05*wa;
    vec3 f = vec3(sx*0.27 + cos(ph)*0.05*wa, 0.0 + lift, sz*0.26);
    b = smin(b, sdCapsule(q, f + vec3(0.0,0.04,0.0), vec3(sx*0.24, 0.16, sz*0.22), 0.075), 0.04);
  }
  b = smin(b, sdRoundCone(q, vec3(-0.4,0.14,0.0), vec3(-0.55,0.1,0.0), 0.05, 0.015), 0.03);
  // neck + head
  vec3 ne = tortNeckEnd();
  b = smin(b, sdCapsule(q, vec3(0.3,0.22,0.0), ne, 0.085), 0.05);
  vec3 h = tortHeadLocal(q);
  float dh = sdEllipsoid(h - vec3(0.06,0.04,0.0), vec3(0.17,0.14,0.145));
  dh = smin(dh, sdEllipsoid(h - vec3(0.17,0.0,0.0), vec3(0.08,0.075,0.09)), 0.06);
  float mo = uTFace.z;
  float mw = mix(0.75, 1.15, uTFace2.x);
  float dm = sdEllipsoid(h - vec3(0.22,-0.05,0.0), vec3(0.06, 0.01+0.045*mo, 0.075*mw));
  if(mo > 0.02) dh = smax(dh, -dm, 0.015);
  b = smin(b, dh, 0.06);
  vec2 skin = vec2(b, M_TSKIN);
  if(mo > 0.02 && abs(dm) < 0.008 && b < 0.015) skin.y = M_TMOUTH;
  res = opU(res, skin);
  // eyes, bushy white brows, beard
  float er = 0.05*uTFace.w;
  float db = 1e5;
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    vec3 ec = vec3(0.13,0.075,s*0.075);
    res = opU(res, eyeSDF(h, ec, er, s, uTFace.x, uTFace.y, M_TEYE, M_TLID));
    vec3 bc = ec + vec3(0.0, 0.065 + 0.02*uTFace2.y, s*0.012);
    float tilt = uTFace2.z;
    db = min(db, sdEllipsoid(h - bc - vec3(0.0, 0.0, 0.0), vec3(0.035, 0.022, 0.05)) );
    db = min(db, sdEllipsoid(h - bc - vec3(-0.005, -tilt*0.018 - 0.006, s*0.04), vec3(0.03, 0.02, 0.035)));
  }
  db = min(db, sdEllipsoid(h - vec3(0.13,-0.12,0.0), vec3(0.05,0.06,0.05)));
  res = opU(res, vec2(db, M_TBROW));
  // round glasses
  float dg = 1e5;
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    vec3 gc = glassC(s);
    vec3 gq = h - gc;
    gq.xy = rot(gq.xy, mix(-1.2, 0.0, uTMisc.z));
    dg = min(dg, sdTorusX(gq, vec2(0.05, 0.007)));
  }
  dg = min(dg, sdCapsule(h, glassC(-1.0) + vec3(0.0,0.0,0.045), glassC(1.0) - vec3(0.0,0.0,0.045), 0.006));
  res = opU(res, vec2(dg, M_TGLASS));
  res.x *= uTPosS.w;
  return res;
}

// ---------------------------------------------------------------- parrot (Coco)
vec3 toParrot(vec3 p){
  vec3 q = p - uPPosS.xyz;
  float c = cos(uPYaw), s = sin(uPYaw);
  q = vec3(q.x*c + q.z*s, q.y, -q.x*s + q.z*c);
  q /= uPPosS.w;
  q.xy = rot(q.xy, uPMisc.w);
  return q;
}
vec3 parrotHeadLocal(vec3 q){
  vec3 h = q - vec3(0.04, 0.6, 0.0);
  h.xz = rot(h.xz, -uPHead.z);
  h.xy = rot(h.xy, -uPHead.x);
  h.zy = rot(h.zy, uPHead.y);
  return h;
}
vec3 pWingLocal(vec3 q, float s){
  vec3 w = q - vec3(-0.02, 0.48, s*0.13);
  w.z *= s;
  w.zy = rot(w.zy, -0.25 + uPMisc.y*1.3 + uPMisc.x);
  return w;
}
vec2 mapParrot(vec3 p){
  if(uPPosS.w < 0.01) return vec2(1e5, 0.0);
  float bdw = length(p - uPPosS.xyz - vec3(0.0, 0.4, 0.0)*uPPosS.w) - 0.8*uPPosS.w;
  if(bdw > 0.3) return vec2(bdw, 0.0);
  vec3 q = toParrot(p);
  float d = sdEllipsoid(q - vec3(-0.02,0.32,0.0), vec3(0.15,0.24,0.145));
  // tail
  float tw = uPMisc.z;
  d = smin(d, sdEllipsoid(q - vec3(-0.17,0.06,tw*0.03), vec3(0.06,0.2,0.05)), 0.05);
  // feet on the perch
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    d = smin(d, sdCapsule(q, vec3(0.02,0.1,s*0.05), vec3(0.06,0.0,s*0.055), 0.022), 0.03);
  }
  vec3 h = parrotHeadLocal(q);
  float dh = length(h - vec3(0.0,0.05,0.0)) - 0.135;
  d = smin(d, dh, 0.07);
  vec2 res = vec2(d, M_PBODY);
  // beak: hooked upper + hinged lower
  float mo = uPFace.z;
  float bu = sdRoundCone(h, vec3(0.1,0.04,0.0), vec3(0.2,0.0,0.0), 0.05, 0.02);
  bu = smin(bu, sdRoundCone(h, vec3(0.19,0.0,0.0), vec3(0.205,-0.05,0.0), 0.02, 0.008), 0.02);
  vec3 lb = h - vec3(0.09,0.0,0.0);
  lb.xy = rot(lb.xy, -mo*0.55);
  float bl = sdRoundCone(lb, vec3(0.0,-0.02,0.0), vec3(0.09,-0.04,0.0), 0.035, 0.012);
  float dbk = min(bu, bl);
  res = opU(res, vec2(dbk, M_PBEAK));
  if(mo > 0.05){
    float inside = sdEllipsoid(h - vec3(0.11,-0.025,0.0), vec3(0.04, 0.01 + 0.03*mo, 0.025));
    res = opU(res, vec2(inside, M_PMOUTH));
  }
  // crest
  float dc = 1e5;
  for(int i=0;i<3;i++){
    float fi = float(i);
    vec3 c0 = vec3(-0.02 - fi*0.04, 0.16 - fi*0.02, 0.0);
    dc = min(dc, sdRoundCone(h, c0, c0 + vec3(-0.07 - fi*0.02, 0.1 - fi*0.025, 0.0), 0.03, 0.01));
  }
  res = opU(res, vec2(dc, M_PCREST));
  // wings
  float dw = 1e5;
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    vec3 w = pWingLocal(q, s);
    dw = min(dw, sdEllipsoid(w - vec3(-0.05,-0.12,0.0), vec3(0.11,0.2,0.035)));
  }
  res = opU(res, vec2(dw, M_PWING));
  // eyes with lashes
  float er = 0.042*uPFace.w;
  float db = 1e5;
  for(int i=0;i<2;i++){
    float s = i==0 ? -1.0 : 1.0;
    vec3 ec = vec3(0.075,0.09,s*0.085);
    res = opU(res, eyeSDF(h, ec, er, s, uPFace.x, uPFace.y, M_PEYE, M_PLID));
    for(int l=0;l<2;l++){
      vec3 b0 = ec + vec3(-0.01, er*0.8, s*er*(0.2 + float(l)*0.45));
      db = min(db, sdCapsule(h, b0, b0 + vec3(-0.012, 0.03, s*0.018), 0.005));
    }
  }
  res = opU(res, vec2(db, M_TBROW + 100.0));
  res.x *= uPPosS.w;
  return res;
}

// ---------------------------------------------------------------- the Thinking Star
vec3 toStar(vec3 p){
  vec3 q = p - uStar.xyz;
  q.xz = rot(q.xz, uStarP.w);
  q.xy = rot(q.xy, 0.35);
  return q/uStar.w;
}
float starShape(vec3 q){
  // five-pointed star with thickness
  float a = atan(q.y, q.x) + PI*0.5;
  float seg = 2.0*PI/5.0;
  a = mod(a + seg*0.5, seg) - seg*0.5;
  vec2 pp = length(q.xy)*vec2(cos(a), abs(sin(a)));
  vec2 k1 = vec2(0.0, 1.0), k2 = normalize(vec2(1.0, 0.0) - vec2(0.38*cos(seg*0.5), 0.38*sin(seg*0.5)));
  float r = 1.0;
  vec2 tip = vec2(r, 0.0), inner = vec2(0.42*cos(seg*0.5), 0.42*sin(seg*0.5));
  vec2 e = inner - tip; vec2 w = pp - tip;
  vec2 bq = w - e*clamp(dot(w,e)/dot(e,e), 0.0, 1.0);
  float s2 = sign(e.x*w.y - e.y*w.x);
  float d2 = length(bq)*(-s2);
  float thick = 0.22*(1.0 - 0.6*length(q.xy));
  return max(d2, abs(q.z) - max(thick, 0.04));
}
vec2 mapStar(vec3 p){
  if(uStar.w < 0.001) return vec2(1e5, 0.0);
  float bd = length(p - uStar.xyz) - uStar.w*1.2;
  if(bd > 0.2) return vec2(bd, 0.0);
  vec3 q = toStar(p);
  return vec2(starShape(q)*uStar.w*0.8, M_STAR);
}

// ---------------------------------------------------------------- egg shell (EP01 callback)
const float EH = 0.34;
const vec3 EGGP = vec3(1.35, 0.0, 1.25);
float crackY(float ang){ float z = ang*7.0/PI; return 0.07 + 0.045*(abs(fract(z)-0.5)*4.0 - 1.0); }
float eggShape(vec3 q){
  vec3 e = q;
  e.xz /= (1.0 - 0.17*clamp(e.y/EH, -1.0, 1.0));
  return sdEllipsoid(e, vec3(0.255, EH, 0.255))*0.85;
}
vec2 mapEgg(vec3 p){
  vec3 q = p - EGGP;
  if(length(q) > 1.2) return vec2(length(q) - 1.0, 0.0);
  q.y -= EH;
  float de = eggShape(q);
  float ang = atan(q.z, q.x);
  float shell = max(de, -(de + 0.022));
  float bot = max(shell, (q.y - crackY(ang))*0.7);
  vec2 res = vec2(bot, M_EGG);
  // cap lying on its side
  vec3 c = p - (EGGP + vec3(0.55, 0.0, 0.3));
  c.xy = rot(c.xy, 2.6);
  c.y -= EH - 0.1;
  float dc = eggShape(c + vec3(0.0, -0.1, 0.0));
  float capd = max(max(dc, -(dc + 0.022)), (crackY(atan(c.z,c.x)) - c.y - 0.1)*0.7);
  res = opU(res, vec2(capd, M_EGG));
  return res;
}

// ---------------------------------------------------------------- environment
vec2 locC(){ float l = uEnv.w; return l < 0.5 ? vec2(0.0) : (l < 1.5 ? vec2(14.0, 0.0) : vec2(-14.0, 0.0)); }
const vec3 POND = vec3(14.4, 0.0, 2.3);
float pondD(vec2 xz){ vec2 d = (xz - POND.xz)/vec2(1.9, 1.05); return (length(d) - 1.0)*1.0; }

float groundH(vec2 xz){
  float h = 0.02*sin(xz.x*1.7)*sin(xz.y*1.3);
  float far = smoothstep(2.5, 9.0, xz.y);
  h += far*(0.6*fbm2(xz*0.25) - 0.15);
  if(uEnv.w > 0.5 && uEnv.w < 1.5){
    float pd = pondD(xz);
    h -= 0.16*smoothstep(0.15, -0.25, pd);
  }
  return h;
}

bool treeFree(vec2 tp){
  if(tp.y < -2.5 && tp.y > -7.6) return true;
  if(tp.y < 1.9 && (abs(tp.x) < 3.2 || abs(tp.x - 14.0) < 3.6 || abs(tp.x + 14.0) < 3.2)) return true;
  if(length(tp - vec2(-0.6, 3.6)) < 1.6) return true;   // treehouse tree
  if(length(tp - vec2(16.5, 2.0)) < 1.6) return true;   // Coco's tree
  if(length(tp - POND.xz) < 2.3) return true;
  return false;
}

vec2 mapTrees(vec3 p){
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
    if(treeFree(tp)) continue;
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

// a big hero tree (trunk + canopy) used for the treehouse and Coco's tree
vec2 bigTree(vec3 q, float th, float cr, float seed){
  vec2 res = vec2(1e5, 0.0);
  float trunk = sdCapsule(q + vec3(sin(q.y*1.1+seed)*0.06,0.0,0.0), vec3(0.0,-0.2,0.0), vec3(0.0,th,0.0), 0.24 - q.y*0.025);
  res = opU(res, vec2(trunk, M_TRUNK));
  vec3 cq = q - vec3(0.0, th + cr*0.35, 0.0);
  float can = sdEllipsoid(cq, vec3(cr, cr*0.8, cr));
  can = smin(can, length(cq - vec3(cr*0.6, -cr*0.25, 0.25)) - cr*0.6, 0.3);
  can = smin(can, length(cq - vec3(-cr*0.6, -cr*0.2, -0.2)) - cr*0.62, 0.3);
  can += 0.05*sin(cq.x*9.0)*sin(cq.y*8.0)*sin(cq.z*9.0);
  res = opU(res, vec2(can*0.8, M_CANOPY));
  return res;
}

const int NMUSH = 5;
vec4 mushData(int i){
  if(i==0) return vec4(-1.35, 0.75, 1.0, 0.0);
  if(i==1) return vec4(-1.05, 0.95, 0.6, 0.0);
  if(i==2) return vec4(1.95, 0.85, 0.8, 1.0);
  if(i==3) return vec4(2.2, 0.45, 0.5, 1.0);
  return vec4(-0.95, -1.05, 0.45, 1.0);
}
vec2 mushroom(vec3 p, vec4 m){
  vec3 q = (p - vec3(m.x, 0.0, m.y))/m.z;
  if(length(q - vec3(0.0,0.3,0.0)) > 1.2) return vec2((length(q - vec3(0.0,0.3,0.0))-0.6)*m.z, 0.0);
  float stem = sdCapsule(q, vec3(0.0,0.0,0.0), vec3(0.03,0.32,0.0), 0.07 - q.y*0.05);
  vec3 cq = q - vec3(0.03,0.36,0.0);
  float cap = sdEllipsoid(cq, vec3(0.26,0.17,0.26));
  cap = smax(cap, -(cq.y + 0.02), 0.04);
  return opU(vec2(stem*m.z, M_MUSHSTEM), vec2(cap*m.z, m.w > 0.5 ? M_GMUSH : M_MUSHCAP));
}
float bush(vec3 p, vec3 c, float r){
  vec3 q = p - c;
  if(length(q) > r*2.2) return length(q) - r*1.8;
  float d = sdEllipsoid(q - vec3(0.0, r*0.5, 0.0), vec3(r*1.2, r*0.85, r));
  d = smin(d, length(q - vec3(r*0.7, r*0.4, 0.15)) - r*0.6, 0.15);
  d = smin(d, length(q - vec3(-r*0.7, r*0.35, -0.1)) - r*0.62, 0.15);
  d += 0.03*sin(q.x*14.0)*sin(q.y*13.0)*sin(q.z*15.0);
  return d*0.85;
}

// lantern string between two anchor points; returns distance to the string + nearest lantern
vec3 lanternAnchor(int i){
  if(i==0) return vec3(-2.3, 1.55, 1.6);
  if(i==1) return vec3(-0.5, 2.1, 3.2);
  if(i==2) return vec3(1.95, 1.0, 1.25);
  return vec3(2.6, 1.9, 2.8);
}
vec2 mapStrings(vec3 p, out float lanternId){
  vec2 res = vec2(1e5, 0.0);
  lanternId = -1.0;
  for(int s=0;s<3;s++){
    vec3 a = lanternAnchor(s), b = lanternAnchor(s+1);
    vec3 ab = b - a;
    float h = clamp(dot(p - a, ab)/dot(ab, ab), 0.0, 1.0);
    vec3 c = a + ab*h - vec3(0.0, 0.35*4.0*h*(1.0-h), 0.0);
    float ds = length(p - c) - 0.008;
    res = opU(res, vec2(ds, M_STRING));
    // 6 lanterns along each string
    float k = floor(h*6.0) + 0.5;
    for(int n=-1;n<=1;n++){
      float kk = clamp(k + float(n), 0.5, 5.5)/6.0;
      vec3 lc = a + ab*kk - vec3(0.0, 0.35*4.0*kk*(1.0-kk) + 0.1, 0.0);
      float dl = sdEllipsoid(p - lc, vec3(0.07, 0.085, 0.07));
      if(dl < res.x){ res = vec2(dl, M_LANTERN); lanternId = float(s)*6.0 + kk*6.0; }
    }
  }
  return res;
}

vec2 mapParty(vec3 p){
  vec2 res = vec2(1e5, 0.0);
  if(uParty.x < 0.5) return res;
  // table stump + cake
  vec3 tq = p - vec3(1.45, 0.0, 0.25);
  if(length(tq) < 1.5){
    float stump = sdCylY(tq - vec3(0.0,0.2,0.0), 0.32, 0.2) - 0.02;
    res = opU(res, vec2(stump, M_WOOD));
    float c1 = sdCylY(tq - vec3(0.0,0.5,0.0), 0.24, 0.1) - 0.015;
    float c2 = sdCylY(tq - vec3(0.0,0.68,0.0), 0.16, 0.08) - 0.015;
    float cake = min(c1, c2);
    res = opU(res, vec2(cake, M_CAKE));
    float fr = min(sdTorus(tq - vec3(0.0,0.6,0.0), vec2(0.24, 0.025)), sdTorus(tq - vec3(0.0,0.76,0.0), vec2(0.16, 0.022)));
    res = opU(res, vec2(fr, M_FROST));
    float cd = 1e5;
    for(int i=0;i<5;i++){
      float a = float(i)*1.2566;
      vec3 cp = vec3(cos(a)*0.09, 0.84, sin(a)*0.09);
      cd = min(cd, sdCapsule(tq, cp - vec3(0.0,0.06,0.0), cp + vec3(0.0,0.03,0.0), 0.012));
    }
    res = opU(res, vec2(cd, M_CANDLE));
  }
  // posts holding the lantern strings
  float post = sdCapsule(p, vec3(-2.3,0.0,1.6), vec3(-2.3,1.55,1.6), 0.04);
  post = min(post, sdCapsule(p, vec3(1.95,0.0,1.25), vec3(1.95,0.98,1.25), 0.045));
  res = opU(res, vec2(post, M_WOOD));
  if(length(p.xz - vec2(0.0, 2.2)) < 3.6 && p.y > 0.4 && p.y < 2.5){
    float lid;
    res = opU(res, mapStrings(p, lid));
  }
  // presents
  float g1 = sdBox(p - vec3(-1.95, 0.12, 1.15), vec3(0.12)) - 0.01;
  float g2 = sdBox(p - vec3(-1.7, 0.09, 1.35), vec3(0.09)) - 0.01;
  res = opU(res, vec2(min(g1, g2), M_GIFT));
  return res;
}

vec2 mapTreehouse(vec3 p){
  vec3 q = p - vec3(-0.6, 0.0, 3.6);
  if(length(q - vec3(0.0, 2.2, 0.0)) > 3.2) return vec2(length(q - vec3(0.0,2.2,0.0)) - 3.0, 0.0);
  vec2 res = bigTree(q, 3.1, 1.25, 1.3);
  if(uParty.z > 0.5){
    vec3 h = q - vec3(0.0, 2.15, -0.45);
    float plat = sdCylY(h, 0.75, 0.04);
    float wall = max(sdCylY(h - vec3(0.0, 0.28, 0.0), 0.48, 0.26), -sdCylY(h - vec3(0.0,0.28,0.0), 0.44, 0.3));
    wall = max(wall, -sdBox(h - vec3(0.0, 0.25, -0.45), vec3(0.13, 0.17, 0.2)));   // door
    float rail = sdTorus(h - vec3(0.0,0.2,0.0), vec2(0.73, 0.018));
    res = opU(res, vec2(min(min(plat, wall), rail), M_WOOD));
    float roof = sdRoundCone(h, vec3(0.0,0.55,0.0), vec3(0.0,1.0,0.0), 0.62, 0.02);
    roof = max(roof, -(h.y - 0.52));
    res = opU(res, vec2(roof, M_ROOF));
    float lad = 1e5;
    for(int i=0;i<2;i++){ float s = i==0?-1.0:1.0;
      lad = min(lad, sdCapsule(q, vec3(s*0.13, 0.0, -1.0), vec3(s*0.13, 2.15, -1.15), 0.02)); }
    for(int i=0;i<7;i++){ float y = 0.25 + float(i)*0.28;
      lad = min(lad, sdCapsule(q, vec3(-0.13, y, -1.0 - y*0.07), vec3(0.13, y, -1.0 - y*0.07), 0.015)); }
    res = opU(res, vec2(lad, M_WOOD));
  }
  return res;
}

vec2 mapClearing(vec3 p){
  vec2 res = vec2(1e5, 0.0);
  for(int i=0;i<NMUSH;i++) res = opU(res, mushroom(p, mushData(i)));
  float r1 = sdEllipsoid(p - vec3(-1.6, 0.0, 0.0), vec3(0.28,0.18,0.22));
  float r2 = sdEllipsoid(p - vec3(2.3, 0.0, 1.3), vec3(0.35,0.22,0.3));
  res = opU(res, vec2(min(r1,r2), M_ROCK));
  res = opU(res, mapEgg(p));
  res = opU(res, mapTreehouse(p));
  res = opU(res, mapParty(p));
  return res;
}

vec2 mapPond(vec3 p){
  vec2 res = vec2(1e5, 0.0);
  // water surface
  float pd = pondD(p.xz);
  float w = max(p.y + 0.06, pd*0.9);
  res = opU(res, vec2(w, M_WATER));
  // lily pads
  for(int i=0;i<4;i++){
    vec2 lc = POND.xz + vec2(-1.1 + float(i)*0.7, sin(float(i)*2.3)*0.5);
    float lp = max(length(p.xz - lc) - (0.13 + 0.03*float(i&1)), abs(p.y + 0.055) - 0.006);
    lp = max(lp, -max(abs(rot(p.xz - lc, float(i)).y) - 0.015, -rot(p.xz - lc, float(i)).x));
    res = opU(res, vec2(lp, M_LILY));
  }
  // reeds
  for(int i=0;i<7;i++){
    float a = 2.6 + float(i)*0.22;
    vec2 rc = POND.xz + vec2(cos(a)*1.95, sin(a)*1.1 + 0.1);
    float hh = 0.5 + 0.25*hash11(float(i));
    float sway = sin(uTime*1.2 + float(i))*0.03;
    float rd = sdCapsule(p, vec3(rc.x, -0.05, rc.y), vec3(rc.x + sway, hh, rc.y), 0.012);
    rd = min(rd, sdCapsule(p, vec3(rc.x + sway, hh - 0.12, rc.y), vec3(rc.x + sway*1.2, hh + 0.02, rc.y), 0.028));
    res = opU(res, vec2(rd, M_STEM));
  }
  // rocks to sit on, a log
  float rk = sdEllipsoid(p - vec3(13.25, 0.0, -0.95), vec3(0.32,0.2,0.26));
  rk = min(rk, sdEllipsoid(p - vec3(16.4, 0.0, 0.2), vec3(0.4,0.25,0.3)));
  rk = min(rk, sdEllipsoid(p - vec3(12.2, 0.0, 1.2), vec3(0.3,0.18,0.25)));
  res = opU(res, vec2(rk, M_ROCK));
  float lg = sdCapsule(p, vec3(11.4, 0.1, 0.9), vec3(12.4, 0.12, 1.9), 0.12);
  res = opU(res, vec2(lg, M_TRUNK));
  // Coco's tree with a perch branch
  vec3 cq = p - vec3(16.5, 0.0, 2.0);
  res = opU(res, bigTree(cq, 2.6, 1.15, 4.0));
  float br = sdCapsule(p, vec3(16.3, 1.15, 1.85), vec3(15.2, 1.22, 1.45), 0.05);
  res = opU(res, vec2(br, M_TRUNK));
  // bushes (one hides a party present)
  res = opU(res, vec2(bush(p, vec3(15.45, 0.0, 2.7), 0.38), M_BUSH));
  res = opU(res, vec2(bush(p, vec3(11.6, 0.0, 2.6), 0.42), M_BUSH));
  float gift = sdBox(p - vec3(15.1, 0.18, 2.45), vec3(0.11)) - 0.01;
  res = opU(res, vec2(gift, M_GIFT));
  for(int i=0;i<3;i++) res = opU(res, mushroom(p, vec4(10.75 + float(i)*0.3, 0.45 + float(i)*0.12, 0.5 + 0.15*float(i), float(i&1))));
  return res;
}

vec2 mapNest(vec3 p){
  vec2 res = vec2(1e5, 0.0);
  vec3 nq = p - vec3(-11.5, 0.0, 1.6);
  float n = sdTorus(nq - vec3(0.0,0.18,0.0), vec2(0.8, 0.24));
  n = smin(n, sdCylY(nq - vec3(0.0,0.06,0.0), 0.8, 0.05), 0.1);
  n += 0.02*sin(atan(nq.z, nq.x)*40.0 + nq.y*30.0)*sin(nq.y*55.0);
  vec3 lq = p - vec3(-13.3, 0.0, 1.9);
  float ln = sdTorus(lq - vec3(0.0,0.1,0.0), vec2(0.38, 0.12));
  ln = smin(ln, sdCylY(lq - vec3(0.0,0.03,0.0), 0.38, 0.03), 0.05);
  ln += 0.012*sin(atan(lq.z, lq.x)*30.0 + lq.y*40.0)*sin(lq.y*60.0);
  res = opU(res, vec2(min(n, ln)*0.8, M_NEST));
  res = opU(res, vec2(bush(p, vec3(-16.3, 0.0, 1.0), 0.45), M_BUSH));
  res = opU(res, vec2(bush(p, vec3(-10.6, 0.0, -0.3), 0.35), M_BUSH));
  res = opU(res, vec2(bush(p, vec3(-15.2, 0.0, 2.6), 0.4), M_BUSH));
  res = opU(res, mushroom(p, vec4(-12.6, -0.9, 0.7, 0.0)));
  res = opU(res, mushroom(p, vec4(-15.9, -0.3, 0.55, 1.0)));
  float rk = sdEllipsoid(p - vec3(-14.4, 0.0, 1.5), vec3(0.3,0.2,0.24));
  res = opU(res, vec2(rk, M_ROCK));
  float lg = sdCapsule(p, vec3(-16.8, 0.1, -0.2), vec3(-15.9, 0.12, -0.9), 0.11);
  res = opU(res, vec2(lg, M_TRUNK));
  return res;
}

vec2 mapFlowers(vec3 p){
  if(p.y > 0.35) return vec2(p.y - 0.3, 0.0);
  float cs = 0.42;
  vec2 cid = floor(p.xz/cs);
  vec2 cc = (cid + 0.5)*cs;
  vec2 fr = p.xz - cid*cs;
  float edge = min(min(fr.x, cs-fr.x), min(fr.y, cs-fr.y)) + 0.01;
  float h = hash21(cid*1.37);
  vec2 lc = locC();
  vec2 rel = cc - lc;
  bool skip = h < 0.5 || rel.y > 4.0 || rel.y < -3.5 || (abs(rel.y - 0.05) < 0.6 && abs(rel.x) < 1.6) || abs(rel.x) > 7.0;
  if(uEnv.w > 0.5 && uEnv.w < 1.5 && pondD(cc) < 0.2) skip = true;
  if(skip) return vec2(max(edge, p.y - 0.3), 0.0);
  vec3 q = p - vec3(cc.x + (hash21(cid+1.3)-0.5)*0.14, groundH(cc), cc.y + (hash21(cid+2.9)-0.5)*0.14);
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
  res.x = min(res.x, max(edge, 0.0) + 0.2);
  return res;
}

vec2 mapLoc(vec3 p){
  float l = uEnv.w;
  if(l < 0.5) return mapClearing(p);
  if(l < 1.5) return mapPond(p);
  return mapNest(p);
}
vec2 mapChars(vec3 p){
  vec2 res = mapDinos(p);
  res = opU(res, mapDragon(p));
  res = opU(res, mapTort(p));
  res = opU(res, mapParrot(p));
  res = opU(res, mapStar(p));
  return res;
}
vec2 mapScene(vec3 p){
  vec2 res = vec2(p.y - groundH(p.xz), M_GROUND);
  res = opU(res, mapTrees(p));
  res = opU(res, mapLoc(p));
  res = opU(res, mapFlowers(p));
  res = opU(res, mapChars(p));
  return res;
}
float mapD(vec3 p){ return mapScene(p).x; }
float mapShadow(vec3 p){
  float d = p.y - groundH(p.xz);
  d = min(d, mapTrees(p).x);
  d = min(d, mapLoc(p).x);
  d = min(d, mapChars(p).x);
  return d;
}

vec3 calcNormal(vec3 p, float t){
  float e = 0.0005*max(1.0, t*0.5);
  vec2 k = vec2(1.0,-1.0);
  return normalize(k.xyy*mapD(p+k.xyy*e) + k.yyx*mapD(p+k.yyx*e) + k.yxy*mapD(p+k.yxy*e) + k.xxx*mapD(p+k.xxx*e));
}

vec2 march(vec3 ro, vec3 rd){
  float t = 0.05; float m = -1.0;
  for(int i=0;i<180;i++){
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
  for(int i=0;i<32;i++){
    float h = mapShadow(ro + rd*t);
    res = min(res, k*h/t);
    t += clamp(h, 0.025, 0.4);
    if(res < 0.005 || t > 9.0) break;
  }
  return clamp(res, 0.0, 1.0);
}
float calcAO(vec3 p, vec3 n){
  float occ = 0.0, sca = 1.0;
  for(int i=0;i<4;i++){
    float h = 0.015 + 0.11*float(i);
    float d = mapShadow(p + n*h);
    occ += (h-d)*sca; sca *= 0.85;
  }
  return clamp(1.0 - 2.2*occ, 0.0, 1.0);
}

// ---------------------------------------------------------------- lighting
vec3 skyColor(vec3 rd){
  float y = rd.y;
  vec3 c = mix(uSkyHor, uSkyTop, pow(clamp(y*1.2+0.05, 0.0, 1.0), 0.6));
  float sd = max(dot(rd, uSunDir), 0.0);
  float night = uEnv.x;
  c += uSunCol*(vec3(1.0,0.75,0.45)*pow(sd, 8.0)*0.35 + vec3(1.0,0.9,0.7)*pow(sd, 200.0)*1.8)*(1.0 - night*0.7);
  vec2 cuv = rd.xz/(rd.y+0.15)*1.5 + vec2(uTime*0.02, 0.0);
  float cl = smoothstep(0.5, 0.8, fbm2(cuv*1.3))*uEnv.z;
  vec3 cloudC = mix(vec3(1.0,0.97,0.95), uSkyHor*1.1, 0.35);
  cloudC = mix(cloudC, vec3(0.2,0.22,0.35), night);
  c = mix(c, cloudC, cl*0.6*smoothstep(0.0,0.25,y));
  if(night > 0.01){
    vec3 sp = rd*180.0;
    vec3 cell = floor(sp); vec3 f = fract(sp) - 0.5;
    float h = hash11(dot(cell, vec3(1.0, 57.0, 113.0)));
    float star = smoothstep(0.12, 0.0, length(f))*step(0.985, h)*smoothstep(0.0, 0.2, y);
    c += vec3(0.9,0.95,1.0)*star*night*(0.6 + 0.4*sin(uTime*3.0 + h*50.0));
    float md = dot(rd, uSunDir);
    c += vec3(0.85,0.9,1.0)*smoothstep(0.9993, 0.9996, md)*night*1.5;
    c += vec3(0.4,0.5,0.8)*pow(max(md,0.0), 60.0)*night*0.4;
  }
  return c;
}

vec3 eyeColor(vec3 h, vec3 c, float r, float side, vec2 look, vec3 iris, float pupilScale){
  vec3 q = h - c;
  vec3 n = normalize(q);
  vec3 f = normalize(vec3(1.0, 0.0, side*0.62));
  vec3 a = normalize(cross(vec3(0,1,0), f));
  vec3 u = cross(f, a);
  vec3 ld = normalize(f + vec3(0.0,0.0,1.0)*look.x*0.6 + u*look.y*0.6);
  float dd = dot(n, ld);
  vec3 col = vec3(0.97,0.97,0.98);
  float irisR = 0.72, pupR = mix(0.9, 0.84, pupilScale);
  float t1 = smoothstep(irisR-0.015, irisR+0.015, dd);
  col = mix(col, iris*mix(0.6,1.2,smoothstep(irisR, 0.95, dd)), t1);
  col = mix(col, vec3(0.02,0.015,0.03), smoothstep(pupR-0.01, pupR+0.01, dd));
  return col;
}
float irisMask(vec3 h, vec3 c, float side, vec2 look){
  vec3 n = normalize(h - c);
  vec3 f = normalize(vec3(1.0, 0.0, side*0.62));
  vec3 a = normalize(cross(vec3(0,1,0), f));
  vec3 u = cross(f, a);
  vec3 ld = normalize(f + vec3(0.0,0.0,1.0)*look.x*0.6 + u*look.y*0.6);
  float dd = dot(n, ld);
  return smoothstep(0.7, 0.74, dd)*(1.0 - smoothstep(0.86, 0.9, dd));
}

struct Mat { vec3 alb; float spec; float rough; vec3 emi; float sss; };

float lidLine(vec3 h, vec3 ec, float er, float side, float open, float laugh){
  vec3 eq = h - ec;
  if(length(eq) > er*1.2) return 0.0;
  vec3 f = normalize(vec3(1.0,0.0,side*0.62)); vec3 a = normalize(cross(vec3(0,1,0), f));
  float zn = dot(eq,a)/er; float arc = er*(0.28 - 0.75*zn*zn);
  float topB = mix(er*mix(-0.08,1.25,open), arc, laugh);
  float botB = mix(-er*mix(0.0,1.25,open), arc-0.01*er, laugh);
  float dl = min(abs(eq.y - topB), abs(eq.y - botB));
  return smoothstep(0.16*er, 0.08*er, dl)*step(dot(eq,f), er*1.2);
}

Mat getMat(vec3 p, vec3 n, float m){
  Mat mt; mt.alb = vec3(0.5); mt.spec = 0.1; mt.rough = 0.6; mt.emi = vec3(0.0); mt.sss = 0.0;
  int di = 0;
  if(m >= 60.0 && m < 66.0){ di = 1; m -= 50.0; }
  if(m == M_GROUND){
    float g = fbm2(p.xz*2.0);
    vec3 c1 = vec3(0.30,0.62,0.16), c2 = vec3(0.52,0.78,0.22);
    mt.alb = mix(c1, c2, g);
    mt.alb = mix(mt.alb, vec3(0.20,0.45,0.18), smoothstep(0.55,0.8,fbm2(p.xz*0.7+3.0))*0.6);
    float blades = noise2(vec2(p.x*90.0, p.z*25.0))*noise2(vec2(p.x*30.0+3.0, p.z*80.0));
    mt.alb *= 0.8 + 0.45*blades;
    vec2 fc = floor(p.xz*9.0);
    float fh = hash21(fc);
    vec2 fl = fract(p.xz*9.0)-0.5;
    if(fh > 0.86 && length(fl) < 0.18){
      float k = hash21(fc+4.0);
      mt.alb = k<0.33 ? vec3(1.0,0.95,0.9) : (k<0.66 ? vec3(1.0,0.75,0.2) : vec3(0.95,0.5,0.8));
    }
    vec2 lc = locC();
    float path = smoothstep(0.55, 0.25, abs(p.z - 0.05 + 0.12*sin(p.x*1.3)));
    mt.alb = mix(mt.alb, vec3(0.62,0.5,0.32)*(0.85+0.3*noise2(p.xz*8.0)), path*0.55);
    if(uEnv.w > 0.5 && uEnv.w < 1.5){
      float pd = pondD(p.xz);
      mt.alb = mix(mt.alb, vec3(0.35,0.3,0.2), smoothstep(0.25, 0.0, pd)*0.7);
    }
    mt.rough = 0.9; mt.spec = 0.02;
  } else if(m == M_TRUNK){
    mt.alb = vec3(0.45,0.29,0.17)*(0.8+0.4*noise2(vec2(p.y*12.0, atan(p.x,p.z)*3.0)));
  } else if(m == M_CANOPY){
    vec2 cid = floor(p.xz/2.4);
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
  } else if(m == M_BUSH){
    mt.alb = mix(vec3(0.18,0.5,0.2), vec3(0.35,0.68,0.22), noise3(p*6.0));
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
    mt.emi = vec3(0.15,0.45,1.0)*(0.6+0.25*sin(uTime*2.0 + p.x*5.0))*(0.6 + 1.2*uEnv.x);
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
  } else if(m == M_WATER){
    mt.alb = vec3(0.05,0.18,0.2); mt.spec = 1.0; mt.rough = 0.05;
  } else if(m == M_LILY){
    mt.alb = vec3(0.25,0.6,0.2)*(0.85+0.3*noise2(p.xz*30.0)); mt.sss = 0.4;
  } else if(m == M_NEST){
    float st = noise3(vec3(atan(p.z+1.6, p.x+11.5)*20.0, p.y*40.0, 0.0));
    mt.alb = mix(vec3(0.5,0.36,0.2), vec3(0.75,0.6,0.38), st);
  } else if(m == M_WOOD){
    mt.alb = vec3(0.6,0.42,0.25)*(0.8 + 0.3*noise2(vec2(p.y*20.0, p.x*3.0 + p.z*3.0)));
  } else if(m == M_ROOF){
    mt.alb = vec3(0.85,0.35,0.3)*(0.85 + 0.2*step(0.5, fract(p.y*14.0)));
  } else if(m == M_CAKE){
    mt.alb = vec3(1.0,0.75,0.82); mt.sss = 0.4; mt.spec = 0.2;
    float drip = step(fract(atan(p.z-0.25, p.x-1.45)*3.0), 0.5);
    mt.alb = mix(mt.alb, vec3(0.6,0.35,0.25), 0.0*drip);
  } else if(m == M_FROST){
    mt.alb = vec3(1.0,0.98,0.95); mt.spec = 0.4; mt.sss = 0.3;
  } else if(m == M_CANDLE){
    mt.alb = vec3(0.4,0.75,1.0)*(0.9 + 0.2*step(0.5, fract(p.y*40.0)));
  } else if(m == M_LANTERN){
    vec3 lp = p; float hh = hash21(floor(lp.xz*3.0) + floor(lp.y*5.0));
    vec3 cols[4] = vec3[4](vec3(1.0,0.45,0.3), vec3(1.0,0.8,0.3), vec3(0.95,0.5,0.85), vec3(0.5,0.85,1.0));
    vec3 lc = cols[int(hh*3.99)];
    mt.alb = lc*0.8; mt.sss = 0.8;
    mt.emi = lc*uParty.y*2.2*(0.9 + 0.1*sin(uTime*5.0 + hh*20.0));
  } else if(m == M_STRING){
    mt.alb = vec3(0.3,0.25,0.2);
  } else if(m == M_GIFT){
    vec3 lp = fract(p*1.0);
    mt.alb = vec3(0.95,0.3,0.55);
    vec3 ap = abs(p - vec3(floor(p.x*4.0+0.5)/4.0, 0.0, floor(p.z*4.0+0.5)/4.0));
    float rib = step(abs(fract(p.x*4.17) - 0.5), 0.06) + step(abs(fract(p.z*4.17) - 0.5), 0.06);
    mt.alb = mix(mt.alb, vec3(1.0,0.85,0.25), clamp(rib, 0.0, 1.0));
    mt.spec = 0.4;
  } else if(m == M_STAR){
    vec3 q = toStar(p);
    vec3 warm = vec3(0.55,0.95,1.0);
    vec3 red = vec3(1.0,0.25,0.2);
    vec3 base = mix(warm, red, uStarP.z);
    mt.alb = mix(vec3(0.7,0.9,1.0), base, 0.5);
    float fac = abs(sin(dot(n, vec3(5.0,3.0,4.0))))*0.3;
    mt.emi = base*(0.6 + 2.2*uStarP.x)*(0.8 + fac);
    if(uStarP.y > 0.0){
      float ck = abs(q.y - 0.18*sin(q.x*9.0) - 0.05*sin(q.x*31.0));
      float ck2 = abs(q.x + 0.3*q.y - 0.1*sin(q.y*17.0));
      float cl = max(smoothstep(0.04, 0.0, ck)*step(abs(q.x), uStarP.y), smoothstep(0.035, 0.0, ck2)*step(0.5, uStarP.y)*step(abs(q.y), 0.6));
      mt.emi = mix(mt.emi, vec3(0.05), cl*0.9);
      mt.alb = mix(mt.alb, vec3(0.05), cl);
    }
    mt.spec = 1.0; mt.rough = 0.1;
  } else if(m == M_DSKIN || m == M_DLID || m == M_DBROW){
    float sc; vec3 q = toDinoI(p, di, sc);
    vec3 h = dinoHeadLocalI(q, di);
    vec3 base = di == 0 ? vec3(0.30,0.80,0.42) : vec3(0.62,0.48,0.88);
    vec3 belly = di == 0 ? vec3(1.0,0.96,0.74) : vec3(1.0,0.9,0.86);
    vec3 spotC = di == 0 ? vec3(0.16,0.58,0.36) : vec3(0.47,0.33,0.74);
    float bm = smoothstep(0.05, 0.2, q.x + 0.12 - abs(q.z)*0.9) * smoothstep(0.75, 0.55, q.y) * smoothstep(0.05,0.2,q.y);
    float jaw = smoothstep(0.17, 0.08, h.y) * smoothstep(0.05, 0.25, h.x);
    float bel = max(bm, jaw);
    mt.alb = mix(base, belly, bel);
    vec3 sp = q*7.0; vec3 cell = floor(sp); vec3 fr = fract(sp)-0.5; vec3 o = hash33(cell)-0.5;
    float spot = smoothstep(0.26, 0.2, length(fr - o*0.35)) * smoothstep(0.1, -0.2, q.x - q.y*0.3 + 0.2) * (1.0-bel);
    mt.alb = mix(mt.alb, spotC, spot*0.8);
    for(int i=0;i<2;i++){ float s = i==0?-1.0:1.0;
      float ck = smoothstep(0.09, 0.03, length(h - vec3(0.28,0.25,s*0.22)));
      mt.alb = mix(mt.alb, vec3(1.0,0.5,0.55), ck*0.65); }
    for(int i=0;i<2;i++){ float s = i==0?-1.0:1.0;
      float ns = smoothstep(0.022, 0.012, length(h - vec3(0.5,0.27,s*0.06)));
      mt.alb = mix(mt.alb, base*0.3, ns); }
    if(uDFace[di].z < 0.05){
      float k = 1.5*uDFace2[di].w;
      float sm = abs(h.y - (0.13 + k*h.z*h.z));
      float line = smoothstep(0.009, 0.004, sm) * smoothstep(0.3, 0.4, h.x) * step(abs(h.z), 0.13);
      mt.alb = mix(mt.alb, base*0.25, line);
    }
    if(m == M_DLID){
      for(int i=0;i<2;i++){ float s = i==0?-1.0:1.0;
        mt.alb = mix(mt.alb, base*0.18, lidLine(h, vec3(0.28,0.41,s*0.135), 0.098*uDFace[di].w, s, uDFace[di].x, uDFace[di].y)); }
    }
    if(m == M_DBROW) mt.alb = di == 0 ? vec3(0.08,0.3,0.15) : vec3(0.18,0.1,0.3);
    mt.sss = 0.6; mt.spec = 0.18; mt.rough = 0.5;
  } else if(m == M_DSPIKE){
    if(di == 0) mt.alb = vec3(1.0,0.55,0.25);
    else {
      float sc; vec3 q = toDinoI(p, 1, sc); vec3 h = dinoHeadLocalI(q, 1);
      mt.alb = vec3(0.35,0.8,0.78);
      if(length(h - vec3(-0.12, 0.6, 0.12)) < 0.07){
        mt.alb = vec3(1.0,0.45,0.65);
        if(length(h - vec3(-0.12, 0.6, 0.12) - normalize(h - vec3(-0.12,0.6,0.12))*0.055) < 0.025) mt.alb = vec3(1.0,0.9,0.3);
      }
    }
    mt.sss = 0.5; mt.spec = 0.3; mt.rough = 0.4;
  } else if(m == M_DEYE){
    float sc; vec3 q = toDinoI(p, di, sc); vec3 h = dinoHeadLocalI(q, di);
    float s = h.z > 0.0 ? 1.0 : -1.0;
    vec3 iris = di == 0 ? vec3(0.45,0.28,0.12) : vec3(0.3,0.45,0.15);
    float glow = uDLook[di].z;
    iris = mix(iris, vec3(0.3,0.95,1.0), glow);
    vec3 ec = vec3(0.28,0.41,s*0.135);
    mt.alb = eyeColor(h, ec, 0.098*uDFace[di].w, s, uDLook[di].xy, iris, clamp(uDFace[di].w-1.0,0.0,1.0)*3.0);
    mt.emi = vec3(0.2,0.9,1.0)*glow*irisMask(h, ec, s, uDLook[di].xy)*1.6;
    mt.spec = 1.0; mt.rough = 0.05;
  } else if(m == M_DMOUTH){
    float sc; vec3 q = toDinoI(p, di, sc); vec3 h = dinoHeadLocalI(q, di);
    mt.alb = mix(vec3(0.45,0.06,0.1), vec3(1.0,0.45,0.5), smoothstep(0.08, 0.05, h.y));
    mt.spec = 0.2;
  } else if(m == M_GSKIN || m == M_GLID || m == M_GBROW){
    float sc; vec3 q = toDrag(p, sc); vec3 h = dragHeadLocal(q);
    vec3 base = vec3(1.0,0.38,0.12);
    vec3 belly = vec3(1.0,0.85,0.35);
    float bm = smoothstep(0.04, 0.17, q.x + 0.1 - abs(q.z)*0.9) * smoothstep(0.62, 0.48, q.y) * smoothstep(0.03,0.15,q.y);
    float jaw = smoothstep(0.17, 0.08, h.y) * smoothstep(0.05, 0.25, h.x);
    float bel = max(bm, jaw);
    float stripes = smoothstep(0.3, 0.5, abs(fract(q.y*14.0)-0.5)*2.0);
    mt.alb = mix(base, belly*mix(0.88,1.0,stripes), bel);
    for(int i=0;i<2;i++){ float s = i==0?-1.0:1.0;
      float ck = smoothstep(0.09, 0.03, length(h - vec3(0.26,0.25,s*0.23)));
      mt.alb = mix(mt.alb, vec3(1.0,0.35,0.45), ck*0.6); }
    if(uGFace.z < 0.05){
      float k = 1.6*uGFace2.w;
      float sm = abs(h.y - (0.13 + k*h.z*h.z));
      float line = smoothstep(0.009, 0.004, sm) * smoothstep(0.28, 0.38, h.x) * step(abs(h.z), 0.12);
      mt.alb = mix(mt.alb, vec3(0.35,0.08,0.03), line);
    }
    if(m == M_GLID){
      for(int i=0;i<2;i++){ float s = i==0?-1.0:1.0;
        mt.alb = mix(mt.alb, vec3(0.3,0.05,0.02), lidLine(h, vec3(0.25,0.42,s*0.155), 0.11*uGFace.w, s, uGFace.x, uGFace.y)); }
    }
    if(m == M_GBROW) mt.alb = vec3(0.45,0.1,0.04);
    mt.sss = 0.65; mt.spec = 0.3; mt.rough = 0.4;
  } else if(m == M_GHORN){
    mt.alb = vec3(1.0,0.93,0.75); mt.spec = 0.3; mt.rough = 0.35; mt.sss = 0.3;
  } else if(m == M_GWING){
    mt.alb = vec3(0.75,0.4,0.95); mt.sss = 1.0; mt.spec = 0.2; mt.rough = 0.5;
  } else if(m == M_GEYE){
    float sc; vec3 q = toDrag(p, sc); vec3 h = dragHeadLocal(q);
    float s = h.z > 0.0 ? 1.0 : -1.0;
    mt.alb = eyeColor(h, vec3(0.25,0.42,s*0.155), 0.11*uGFace.w, s, uGLook.xy, vec3(0.95,0.7,0.1), clamp(uGFace.w-1.0,0.0,1.0)*3.0);
    mt.spec = 1.0; mt.rough = 0.05;
  } else if(m == M_GMOUTH){
    float sc; vec3 q = toDrag(p, sc); vec3 h = dragHeadLocal(q);
    mt.alb = mix(vec3(0.45,0.05,0.08), vec3(1.0,0.45,0.5), smoothstep(0.08, 0.05, h.y));
  } else if(m == M_TSKIN || m == M_TLID){
    vec3 q = toTort(p); vec3 h = tortHeadLocal(q);
    vec3 base = vec3(0.56,0.7,0.44);
    float bel = smoothstep(0.0, -0.08, h.y)*step(0.0, h.x - 0.0)*step(length(h), 0.3);
    mt.alb = mix(base, vec3(0.85,0.85,0.62), bel*0.7);
    vec3 sp = q*11.0; vec3 cell = floor(sp); vec3 fr = fract(sp)-0.5; vec3 o = hash33(cell)-0.5;
    mt.alb *= 1.0 - 0.15*smoothstep(0.3, 0.2, length(fr - o*0.3));
    for(int i=0;i<2;i++){ float s = i==0?-1.0:1.0;
      float ck = smoothstep(0.05, 0.015, length(h - vec3(0.15,0.0,s*0.115)));
      mt.alb = mix(mt.alb, vec3(0.95,0.55,0.5), ck*0.5); }
    if(uTFace.z < 0.05 && length(h) < 0.35){
      float k = 2.0*uTFace2.w;
      float sm = abs(h.y - (-0.045 + k*h.z*h.z));
      float line = smoothstep(0.006, 0.003, sm)*smoothstep(0.17, 0.21, h.x)*step(abs(h.z), 0.07);
      mt.alb = mix(mt.alb, vec3(0.15,0.2,0.1), line);
    }
    if(m == M_TLID){
      for(int i=0;i<2;i++){ float s = i==0?-1.0:1.0;
        mt.alb = mix(mt.alb, vec3(0.15,0.2,0.1), lidLine(h, vec3(0.13,0.075,s*0.075), 0.05*uTFace.w, s, uTFace.x, uTFace.y)); }
    }
    mt.sss = 0.4; mt.spec = 0.15; mt.rough = 0.55;
  } else if(m == M_TSHELL){
    vec3 q = toTort(p);
    vec2 uvs = vec2(atan(q.z, q.x)*1.6, q.y*7.0 + length(q.xz)*2.0);
    vec2 g = uvs*vec2(1.0, 0.8);
    vec2 cell = floor(g); vec2 fr = fract(g);
    float md = 1e5; float md2 = 1e5;
    for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
      vec2 o = vec2(float(i), float(j));
      vec2 r = o + vec2(hash21(cell+o), hash21(cell+o+3.1))*0.6 + 0.2 - fr;
      float d = dot(r,r);
      if(d < md){ md2 = md; md = d; } else if(d < md2) md2 = d;
    }
    float edge = smoothstep(0.02, 0.12, sqrt(md2) - sqrt(md));
    vec3 c = mix(vec3(0.42,0.27,0.13), vec3(0.72,0.5,0.25), edge);
    float rimz = smoothstep(0.2, 0.17, q.y);
    mt.alb = mix(c, vec3(0.85,0.7,0.42), rimz);
    mt.spec = 0.35; mt.rough = 0.35;
  } else if(m == M_TEYE){
    vec3 q = toTort(p); vec3 h = tortHeadLocal(q);
    float s = h.z > 0.0 ? 1.0 : -1.0;
    mt.alb = eyeColor(h, vec3(0.13,0.075,s*0.075), 0.05*uTFace.w, s, uTLook.xy, vec3(0.25,0.4,0.6), clamp(uTFace.w-1.0,0.0,1.0)*3.0);
    mt.spec = 1.0; mt.rough = 0.05;
  } else if(m == M_TMOUTH){
    mt.alb = vec3(0.5,0.12,0.12);
  } else if(m == M_TBROW){
    mt.alb = vec3(0.97,0.96,0.93); mt.sss = 0.5; mt.rough = 0.8;
  } else if(m == M_TBROW + 100.0){
    mt.alb = vec3(0.05,0.05,0.08);
  } else if(m == M_TGLASS){
    mt.alb = vec3(0.85,0.65,0.25); mt.spec = 1.0; mt.rough = 0.15;
  } else if(m == M_PBODY || m == M_PLID){
    vec3 q = toParrot(p); vec3 h = parrotHeadLocal(q);
    vec3 base = vec3(0.1,0.5,0.95);
    float belly = smoothstep(0.0, 0.08, q.x - 0.02 + 0.0*q.y)*step(q.y, 0.5);
    mt.alb = mix(base, vec3(1.0,0.78,0.15), belly);
    float headM = smoothstep(0.17, 0.12, length(h - vec3(0.0,0.05,0.0)));
    mt.alb = mix(mt.alb, vec3(0.15,0.75,0.75), headM*0.8);
    float cheek = smoothstep(0.07, 0.04, length(vec2(h.x - 0.06, h.y - 0.06)))*step(0.09, abs(h.z));
    mt.alb = mix(mt.alb, vec3(1.0,1.0,1.0), cheek*0.9);
    if(q.y < 0.18 && q.x < -0.1) mt.alb = mix(vec3(0.95,0.25,0.25), vec3(0.1,0.4,0.9), smoothstep(-0.25, 0.1, q.y));
    if(m == M_PLID){
      for(int i=0;i<2;i++){ float s = i==0?-1.0:1.0;
        mt.alb = mix(mt.alb, vec3(0.05,0.1,0.2), lidLine(h, vec3(0.075,0.09,s*0.085), 0.042*uPFace.w, s, uPFace.x, uPFace.y)); }
    }
    mt.sss = 0.3; mt.spec = 0.3; mt.rough = 0.45;
  } else if(m == M_PWING){
    vec3 q = toParrot(p);
    mt.alb = mix(vec3(0.1,0.35,0.9), vec3(0.15,0.75,0.35), smoothstep(0.35, 0.1, q.y));
    mt.alb = mix(mt.alb, vec3(0.95,0.25,0.3), smoothstep(0.05, -0.1, q.y));
    mt.sss = 0.5; mt.spec = 0.25;
  } else if(m == M_PBEAK){
    mt.alb = vec3(0.98,0.9,0.75); mt.spec = 0.5; mt.rough = 0.3;
  } else if(m == M_PMOUTH){
    mt.alb = vec3(0.35,0.08,0.12);
  } else if(m == M_PCREST){
    mt.alb = vec3(1.0,0.3,0.2); mt.sss = 0.6;
  } else if(m == M_PEYE){
    vec3 q = toParrot(p); vec3 h = parrotHeadLocal(q);
    float s = h.z > 0.0 ? 1.0 : -1.0;
    vec3 ec = vec3(0.075,0.09,s*0.085);
    vec3 iris = mix(vec3(0.9,0.6,0.1), vec3(0.3,0.95,1.0), uPLook.z);
    mt.alb = eyeColor(h, ec, 0.042*uPFace.w, s, uPLook.xy, iris, clamp(uPFace.w-1.0,0.0,1.0)*3.0);
    mt.emi = vec3(0.2,0.9,1.0)*uPLook.z*irisMask(h, ec, s, uPLook.xy)*1.6;
    mt.spec = 1.0; mt.rough = 0.05;
  } else if(m == M_EGG){
    vec3 q = p - EGGP;
    vec3 base = mix(vec3(0.82,0.74,1.0), vec3(1.0,0.93,0.8), 0.5+0.5*clamp(q.y/(2.0*EH), 0.0, 1.0));
    vec3 sp = q*vec3(9.0,7.0,9.0);
    vec3 cell = floor(sp); vec3 frc = fract(sp)-0.5; vec3 o = hash33(cell)-0.5;
    float spot = smoothstep(0.27, 0.2, length(frc - o*0.4));
    float k = hash11(dot(cell, vec3(1.0,57.0,113.0)));
    vec3 scol = k<0.33 ? vec3(1.0,0.45,0.75) : (k<0.66 ? vec3(0.3,0.75,1.0) : vec3(1.0,0.8,0.25));
    mt.alb = mix(base, scol, spot);
    mt.emi = scol*spot*0.15;
    mt.spec = 0.6; mt.rough = 0.2; mt.sss = 0.6;
  }
  return mt;
}

vec3 pointLight(vec3 p, vec3 n, vec3 lp, vec3 col, float fall){
  vec3 l = lp - p; float d2 = dot(l,l); l *= inversesqrt(d2);
  return col*max(dot(n,l)*0.75+0.25, 0.0)/(1.0 + d2*fall);
}

vec3 shade(vec3 ro, vec3 rd, float t, float m){
  vec3 p = ro + rd*t;
  vec3 n = calcNormal(p, t);
  bool water = (m == M_WATER);
  if(water){
    // animated ripples on the pond
    float e = 0.02;
    vec2 xz = p.xz*7.0 + vec2(uTime*0.4, uTime*0.3);
    float h0 = noise2(xz) + 0.5*noise2(xz*2.3 - uTime*0.5);
    float hx = noise2(xz + vec2(e*7.0,0.0)) + 0.5*noise2((xz + vec2(e*7.0,0.0))*2.3 - uTime*0.5);
    float hz = noise2(xz + vec2(0.0,e*7.0)) + 0.5*noise2((xz + vec2(0.0,e*7.0))*2.3 - uTime*0.5);
    n = normalize(vec3(-(hx-h0)*0.25, 1.0, -(hz-h0)*0.25));
  }
  Mat mt = getMat(p, n, m);
  vec3 v = -rd;
  float ao = calcAO(p, n);
  float sh = softShadow(p + n*0.004, uSunDir, 10.0);
  float w = mt.sss*0.5;
  float ndl = dot(n, uSunDir);
  float dif = clamp((ndl + w)/(1.0 + w), 0.0, 1.0);
  vec3 col = vec3(0.0);
  vec3 sssTint = mix(vec3(1.0), vec3(1.0,0.55,0.4), mt.sss*smoothstep(0.4,0.0,abs(ndl)));
  col += mt.alb*uSunCol*dif*sh*sssTint;
  float kd = clamp((dot(n, uKeyDir) + 0.3)/1.3, 0.0, 1.0);
  col += mt.alb*uKeyCol*kd*0.75*(0.5+0.5*ao);
  float skyAmt = 0.5 + 0.5*n.y;
  col += mt.alb*uAmbCol*skyAmt*0.6*(0.3+0.7*ao);
  col += mt.alb*uAmbCol*vec3(0.9,0.85,0.45)*clamp(-n.y*0.5+0.5,0.0,1.0)*0.3*ao;
  if(mt.sss > 0.9){
    float tr = pow(clamp(dot(rd, uSunDir), 0.0, 1.0), 2.0);
    col += mt.alb*uSunCol*tr*0.8;
  }
  vec3 hv = normalize(uSunDir + v);
  float shin = mix(8.0, 180.0, 1.0 - mt.rough);
  float spe = pow(max(dot(n,hv),0.0), shin) * mt.spec * (shin+8.0)/40.0;
  col += uSunCol*spe*sh;
  vec3 hk = normalize(uKeyDir + v);
  col += uKeyCol*pow(max(dot(n,hk),0.0), shin)*mt.spec*(shin+8.0)/160.0;
  float fre = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);
  bool isChar = (m >= 10.0 && m < 47.0) || (m >= 60.0 && m < 66.0) || m == M_TBROW + 100.0;
  col += mix(uAmbCol*1.2, uSunCol*0.6, sh)*mt.alb*fre*0.6*ao*(isChar ? 1.0 : 0.3);
  for(int i=0;i<6;i++){
    if(uPLc[i].w <= 0.0) continue;
    col += mt.alb*pointLight(p, n, uPL[i].xyz, uPLc[i].rgb*uPLc[i].w, uPL[i].w);
  }
  col *= mix(1.0, ao, 0.5);
  col += mt.emi;
  if(water){
    vec3 r = reflect(rd, n);
    float fr = 0.04 + 0.96*pow(1.0 - max(dot(n, v), 0.0), 5.0);
    vec3 refl = skyColor(r);
    // fake reflection of the far tree line
    refl = mix(refl, uFogCol*vec3(0.35,0.55,0.35), smoothstep(0.25, 0.05, r.y)*0.7);
    col = mix(col, refl, clamp(fr*1.2 + 0.25, 0.0, 1.0));
    col += uSunCol*pow(max(dot(r, uSunDir), 0.0), 300.0)*3.0;
  }
  return col;
}

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
    float fog = 1.0 - exp(-max(t-4.0, 0.0)*uEnv.y);
    vec3 fogc = mix(uFogCol, uSunCol*0.6 + uFogCol*0.4, pow(max(dot(rd,uSunDir),0.0),3.0)*(1.0-uEnv.x));
    col = mix(col, fogc, fog);
  }
  col += uSunCol*vec3(1.0,0.8,0.5)*pow(max(dot(rd,uSunDir),0.0), 4.0)*0.08*(1.0-uEnv.x);

  float tmax = t;
  // star glow + falling trail
  if(uStar.w > 0.001){
    vec3 sc = mix(vec3(0.5,0.95,1.0), vec3(1.0,0.3,0.2), uStarP.z);
    col += sc*glowPoint(ro, rd, tmax, uStar.xyz, uStar.w*0.9)*uStarP.x*0.25;
    if(uStarTrail.w > 0.0){
      for(int i=1;i<10;i++){
        float k = float(i)/9.0;
        vec3 c = uStar.xyz - uStarTrail.xyz*k*0.25;
        col += mix(vec3(0.8,1.0,1.0), vec3(0.4,0.6,1.0), k)*glowPoint(ro, rd, tmax, c, uStar.w*(1.0 - k*0.7))*uStarTrail.w*(1.0-k)*0.45;
      }
    }
  }
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
    vec3 oc = uFB.xyz - ro; float tc = dot(oc, rd); float d = length(oc - rd*tc);
    if(tc > 0.0 && tc < tmax){
      float nn = noise3(vec3(rd.xy*60.0, uTime*12.0));
      float core = smoothstep(uFB.w*(0.9+0.3*nn), uFB.w*0.2, d);
      col = mix(col, vec3(4.0,3.0,1.2), core*uFBp.x);
    }
  }
  // smoke / dust puff
  if(uFBp.y > 0.0){
    for(int i=0;i<7;i++){
      vec3 o = (hash33(vec3(float(i)*3.1, 1.0, 2.0)) - 0.5)*vec3(0.35,0.25,0.35)*(0.5+uFBp.y);
      vec3 c = uSmokePos + o + vec3(0.0, uFBp.y*0.25, 0.0);
      vec3 oc = c - ro; float tc = dot(oc, rd);
      if(tc <= 0.0 || tc > tmax) continue;
      float d = length(oc - rd*tc);
      float r = 0.11 + 0.07*hash11(float(i)) + uFBp.y*0.12;
      float a = smoothstep(r, r*0.25, d)*clamp(1.5 - uFBp.y*1.5, 0.0, 1.0)*0.92;
      vec3 scc = mix(vec3(0.42,0.4,0.42), vec3(0.92,0.9,0.88), clamp(0.5+(c.y - uSmokePos.y)*3.0 - d/r*0.3, 0.0, 1.0));
      col = mix(col, scc*(0.4 + 0.6*(1.0-uEnv.x)), a);
    }
  }
  if(uDust.w >= 0.0 && uDust.w < 1.6){
    for(int i=0;i<10;i++){
      vec3 hr = hash33(vec3(float(i)*1.7, 4.0, 9.0)) - 0.5;
      vec3 c = uDust.xyz + vec3(hr.x*2.0, 0.1 + abs(hr.y)*0.6, hr.z*1.2)*(0.3 + uDust.w*0.6);
      vec3 oc = c - ro; float tc = dot(oc, rd);
      if(tc <= 0.0 || tc > tmax) continue;
      float d = length(oc - rd*tc);
      float r = 0.12 + uDust.w*0.18;
      float a = smoothstep(r, r*0.2, d)*clamp(1.0 - uDust.w/1.6, 0.0, 1.0)*0.6;
      col = mix(col, vec3(0.75,0.68,0.55), a);
    }
  }
  // feathers
  if(uFeath.w >= 0.0 && uFeath.w < 2.5){
    for(int i=0;i<10;i++){
      vec3 hr = hash33(vec3(float(i)*2.3, 7.0, 1.0)) - 0.5;
      float a = uFeath.w;
      vec3 c = uFeath.xyz + vec3(hr.x*0.9*sqrt(a) + sin(a*3.0 + float(i))*0.08, hr.y*0.3 + 0.2*sqrt(a) - a*a*0.12, hr.z*0.6*sqrt(a));
      vec3 oc = c - ro; float tc = dot(oc, rd);
      if(tc <= 0.0 || tc > tmax) continue;
      vec3 dv = oc - rd*tc;
      float d = length(dv*vec3(1.0, 2.2, 1.0));
      float al = smoothstep(0.035, 0.015, d)*clamp(2.5 - a, 0.0, 1.0);
      col = mix(col, i%3==0 ? vec3(1.0,0.8,0.2) : vec3(0.15,0.55,1.0), al);
    }
  }
  // thought ripples
  for(int k=0;k<3;k++){
    if(uRing[k].w <= 0.001) continue;
    vec3 oc = uRing[k].xyz - ro; float tc = dot(oc, rd);
    if(tc <= 0.0) continue;
    float d = length(oc - rd*tc);
    float occl = tc > tmax + 0.4 ? 0.25 : 1.0;
    for(int r=0;r<3;r++){
      float ph = fract(uTime*0.7 + float(r)/3.0 + float(k)*0.37);
      float rad = 0.12 + ph*0.55;
      float ring = smoothstep(0.03, 0.0, abs(d - rad))*(1.0 - ph)*(1.0 - ph);
      col += vec3(0.3,0.9,1.0)*ring*uRing[k].w*1.4*occl;
    }
    col += vec3(0.2,0.7,1.0)*glowPoint(ro, rd, tmax + 1.0, uRing[k].xyz, 0.07)*uRing[k].w*0.15;
  }
  // fireworks
  for(int k=0;k<3;k++){
    float age = uFW[k].w;
    if(age < 0.0 || age > 2.2) continue;
    float fade = clamp(1.0 - age/2.2, 0.0, 1.0);
    for(int i=0;i<28;i++){
      vec3 hr = hash33(vec3(float(i), float(k)*3.7, 5.1));
      float th = hr.x*6.2832, ph = acos(2.0*hr.y - 1.0);
      vec3 dir = vec3(sin(ph)*cos(th), cos(ph), sin(ph)*sin(th));
      float sp = 1.0 - exp(-age*3.0);
      vec3 c = uFW[k].xyz + dir*sp*1.7 - vec3(0.0, age*age*0.3, 0.0);
      float tw = 0.7 + 0.3*sin(uTime*30.0 + float(i));
      col += uFWc[k].rgb*glowPoint(ro, rd, tmax + 50.0, c, 0.055)*fade*fade*uFWc[k].w*tw;
    }
    col += uFWc[k].rgb*glowPoint(ro, rd, tmax + 50.0, uFW[k].xyz, 0.5)*exp(-age*6.0)*0.25*uFWc[k].w;
  }
  // confetti
  if(uParty.w >= 0.0 && uParty.w < 9.0){
    for(int i=0;i<40;i++){
      vec3 hr = hash33(vec3(float(i)*1.3, 2.0, 8.0));
      float a = uParty.w;
      vec3 c = vec3(-2.4 + hr.x*4.8, 2.6 - a*0.45 - hr.y*0.8 + hr.y*2.0, -0.8 + hr.z*2.4);
      c.x += sin(a*2.0 + float(i))*0.15;
      if(c.y < 0.0) continue;
      vec3 oc = c - ro; float tc = dot(oc, rd);
      if(tc <= 0.0 || tc > tmax) continue;
      vec3 dv = oc - rd*tc;
      float flip = abs(sin(a*6.0 + float(i)*2.0));
      float d = length(dv*vec3(1.0, 1.0/(0.3 + 0.7*flip), 1.0));
      vec3 cc = hr.z < 0.33 ? vec3(1.0,0.3,0.5) : (hr.z < 0.66 ? vec3(0.3,0.8,1.0) : vec3(1.0,0.85,0.2));
      col = mix(col, cc*(0.5 + uParty.y), smoothstep(0.02, 0.01, d)*clamp(9.0 - a, 0.0, 1.0));
    }
  }
  // fireflies / sparkles
  for(int i=0;i<18;i++){
    float fi = float(i);
    vec3 hr = hash33(vec3(fi, fi*1.7, 3.3));
    float tw = 0.5+0.5*sin(uTime*(2.0+hr.x*3.0) + fi);
    vec2 lc = locC();
    vec3 c = vec3(lc.x - 2.5 + hr.x*5.0, 0.3 + hr.y*1.6, -0.8 + hr.z*3.0);
    c += 0.25*vec3(sin(uTime*0.5+fi), sin(uTime*0.7+fi*2.0), cos(uTime*0.4+fi));
    float bright = (0.25 + 0.6*uEnv.x)*tw;
    col += vec3(1.0,0.9,0.5)*glowPoint(ro, rd, tmax, c, 0.012)*bright;
  }
  // candle flames + lantern glow halos
  if(uParty.y > 0.01 && uEnv.w < 0.5){
    for(int i=0;i<5;i++){
      float a = float(i)*1.2566;
      vec3 cp = vec3(1.45 + cos(a)*0.09, 0.92 + 0.01*sin(uTime*20.0 + float(i)), 0.25 + sin(a)*0.09);
      col += vec3(1.0,0.75,0.3)*glowPoint(ro, rd, tmax + 0.02, cp, 0.018)*uParty.y*0.9;
    }
  }
  fragColor = vec4(col, t);
}
