uniform vec3 uDepthColor;
uniform vec3 uSurfaceColor;

varying float vElevation;

void main() {
  #include <colorspace_fragment>
  vec3 color = mix(uDepthColor, uSurfaceColor, vElevation * 1.5 + 0.5);
  gl_FragColor = vec4(color, 0.8);
}