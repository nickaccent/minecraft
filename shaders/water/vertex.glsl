uniform float uTime;
uniform float uWaveSpeed;
uniform float uWaveElevation;
uniform vec2 uWaveFrequency;

varying float vElevation;

void main()
{
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);

  float elevation = sin(modelPosition.x * uWaveFrequency.x + uTime * uWaveSpeed) * 
                    sin(modelPosition.z * uWaveFrequency.y + uTime * uWaveSpeed / 2.0) * 
                    uWaveElevation;

  modelPosition.y += elevation;

  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;
  gl_Position = projectedPosition;

  vElevation = elevation;
}