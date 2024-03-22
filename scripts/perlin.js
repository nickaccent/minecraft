import './noise/simplex';
import perlin from './noise/perlin';

export const noise = (function () {
  class PerlinWrapper {
    constructor() {}

    noise2D(x, y) {
      return perlin(x, y) * 2.0 - 1.0;
    }
  }

  class NoiseGenerator {
    constructor(params) {
      this.params = params;
      this.Init();
    }

    Init() {
      this.noise = {
        simplex: new SimplexNoise(this.params.seed),
        perlin: new PerlinWrapper(),
      };
    }

    Get(x, y) {
      const xs = x / this.params.scale;
      const ys = y / this.params.scale;
      const noiseFunc = this.noise[this.params.noiseType];
      let amplitude = 1.0;
      let frequency = 1.0;
      let normalization = 0;
      let total = 0;
      for (let o = 0; o < this.params.octaves; o++) {
        const noiseValue = noiseFunc.noise2D(xs * frequency, ys * frequency) * 0.5 + 0.5;
        total += noiseValue * amplitude;
        normalization += amplitude;
        amplitude *= this.params.persistence;
        frequency *= this.params.lacunarity;
      }
      total /= normalization;
      return Math.pow(total, this.params.exponentiation) * this.params.height;
    }

    GetSimplex3d(x, y, z) {
      const xs = x / this.params.scale;
      const ys = y / this.params.scale;
      const zs = z / this.params.scale;
      const noiseFunc = this.noise['simplex'];
      let amplitude = 1.0;
      let frequency = 1.0;
      let normalization = 0;
      let total = 0;
      for (let o = 0; o < this.params.octaves; o++) {
        const noiseValue =
          noiseFunc.noise3D(xs * frequency, ys * frequency, zs * frequency) * 0.5 + 0.5;
        total += noiseValue * amplitude;
        normalization += amplitude;
        amplitude *= this.params.persistence;
        frequency *= this.params.lacunarity;
      }
      total /= normalization;
      return Math.pow(total, this.params.exponentiation) * this.params.height;
    }
  }

  return {
    Noise: NoiseGenerator,
  };
})();
