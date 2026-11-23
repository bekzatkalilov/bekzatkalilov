#version 330
// Post: depth of field, bloom, tone mapping, grading, vignette.
out vec4 fragColor;
uniform sampler2D uTex;
uniform vec2 uRes;      // output resolution
uniform float uFocus;   // focus distance
uniform float uAperture;
uniform float uTime;

vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }

void main(){
  vec2 uv = gl_FragCoord.xy/uRes;
  vec2 texel = 1.0/vec2(textureSize(uTex, 0));
  vec4 c0 = texture(uTex, uv);
  float depth = c0.a;
  float coc = clamp(abs(depth - uFocus)/max(depth,0.1)*uAperture, 0.0, 14.0);
  vec3 col = c0.rgb;
  if(coc > 0.6){
    vec3 acc = vec3(0.0); float wsum = 0.0;
    float lod = max(log2(coc/3.0), 0.0);
    for(int i=0;i<16;i++){
      float a = float(i)*2.39996;
      float r = sqrt((float(i)+0.5)/16.0)*coc;
      vec2 o = vec2(cos(a), sin(a))*r*texel;
      vec4 s = textureLod(uTex, uv+o, lod);
      // avoid sharp foreground bleeding into blurred background
      float w = s.a < depth - 0.5 ? 0.3 : 1.0;
      acc += s.rgb*w; wsum += w;
    }
    col = acc/wsum;
  }
  // bloom from mip chain
  vec3 bl = vec3(0.0);
  bl += textureLod(uTex, uv, 3.0).rgb*0.25;
  bl += textureLod(uTex, uv, 4.5).rgb*0.3;
  bl += textureLod(uTex, uv, 6.0).rgb*0.45;
  col += max(bl - 0.85, 0.0)*0.55;

  col *= 1.05;
  col = aces(col);
  // gentle grade: lift saturation, warm highlights
  float l = dot(col, vec3(0.299,0.587,0.114));
  col = mix(vec3(l), col, 1.15);
  col = pow(col, vec3(1.0/1.05));
  col *= mix(vec3(0.97,0.98,1.03), vec3(1.03,1.0,0.96), l);
  // vignette
  vec2 q = uv - 0.5;
  col *= 1.0 - dot(q*vec2(1.1,0.85), q*vec2(1.1,0.85))*0.55;
  // fine grain
  float g = fract(sin(dot(gl_FragCoord.xy + uTime*61.0, vec2(12.9898,78.233)))*43758.5453);
  col += (g-0.5)/255.0*1.5;
  fragColor = vec4(clamp(col,0.0,1.0), 1.0);
}
