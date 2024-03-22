import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { blocks, resources } from './blocks';

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

export function createUI(world, player, physics, scene) {
  const gui = new GUI();

  const sceneFolder = gui.addFolder('Scene').close();
  sceneFolder.add(scene.fog, 'near', 0, 100, 1).name('Fog Near');
  sceneFolder.add(scene.fog, 'far', 0, 100, 1).name('Fog Far');

  const debugFolder = gui.addFolder('Debug').close();
  debugFolder.add(player.cameraHelper, 'visible').name('Camera Helper');
  debugFolder.add(player.boundsHelper, 'visible').name('Bounds Helper');
  debugFolder.add(physics.helpers, 'visible').name('Physics Helpers');

  const playerFolder = gui.addFolder('Player').close();;
  playerFolder.add(player, 'maxSpeed', 1, 20).name('Max Speed');

  gui.add(world, 'drawDistance', 1, 4, 1).name('Draw Distance');

  const terrainFolder = gui.addFolder('Terrain').close();
  terrainFolder.add(world, 'asyncLoading').name('Use Async Loading');
  const seed = terrainFolder.add(world.params.terrain, 'seed', 0, 999999).name('Seed');
  terrainFolder.add(world.params.terrain, 'perlin').name('Use Perlin');
  terrainFolder.add(world.params.terrain, 'scale', 10, 100).name('Scale');
  terrainFolder.add(world.params.terrain, 'magnitude', 0, 32, 1).name('Magnitude');
  terrainFolder.add(world.params.terrain, 'offset', 0, 32, 1).name('Offset');
  terrainFolder.add(world.params.terrain, 'octaves', 1, 20).name('Octaves');
  terrainFolder.add(world.params.terrain, 'persistence', 0, 1, 0.01).name('Persistence');
  terrainFolder.add(world.params.terrain, 'lacunarity', 0, 2, 0.1).name('Lacunarity');
  terrainFolder.add(world.params.terrain, 'exponentiation', 1, 20, 0.1).name('Exponentiation');


  const waterFolder = gui.addFolder('Water').close();
  waterFolder.add(world.params.terrain, 'waterOffset', 0, 32, 1).name('Water Offset');
  waterFolder.add(world.params.water.material.uniforms.uWaveElevation, 'value', 0, 1, 0.01).name('Wave Elevation');
  waterFolder.add(world.params.water.material.uniforms.uWaveFrequency.value, 'x', 0, 10, 0.01).name('Wave Frequency X');
  waterFolder.add(world.params.water.material.uniforms.uWaveFrequency.value, 'y', 0, 10, 0.01).name('Wave Frequency Y');
  waterFolder.add(world.params.water.material.uniforms.uWaveSpeed, 'value', 0, 10, 0.01).name('Wave Speed');
  waterFolder.addColor(world.waveColors, 'depthColor', 0, 10, 0.01).name('Depth Color').onChange(()=>{world.params.water.material.uniforms.uDepthColor.value.set(world.waveColors.depthColor)});
  waterFolder.addColor(world.waveColors, 'surfaceColor', 0, 10, 0.01).name('Surface Color').onChange(()=>{world.params.water.material.uniforms.uSurfaceColor.value.set(world.waveColors.surfaceColor)});;

  const resourcesFolder = terrainFolder.addFolder('Resources').close();
  resources.forEach((resource) => {
    const resourceFolder = resourcesFolder.addFolder(toTitleCase(resource.name)).close();
    resourceFolder.add(resource, 'scarcity', 0, 1).name('Scarcity');

    const scaleFolder = resourceFolder.addFolder('Scale').close();
    scaleFolder.add(resource.scale, 'x', 10, 100).name('X Scale');
    scaleFolder.add(resource.scale, 'y', 10, 100).name('Y Scale');
    scaleFolder.add(resource.scale, 'z', 10, 100).name('Z Scale');
  });

  const treesFolder = resourcesFolder.addFolder('Trees');
  treesFolder.add(world.params.trees, 'frequency', 0, 0.2).name('Frequency');
  treesFolder.add(world.params.trees.trunk, 'minHeight', 0, 10, 1).name('Trunk Min Height');
  treesFolder.add(world.params.trees.trunk, 'maxHeight', 0, 10, 1).name('Trunk Max Height');
  treesFolder.add(world.params.trees.canopy, 'minRadius', 0, 10, 1).name('Canopy Min Radius');
  treesFolder.add(world.params.trees.canopy, 'maxRadius', 0, 10, 1).name('Canopy Max Radius');
  treesFolder.add(world.params.trees.canopy, 'density', 0, 1).name('Canopy Density');

  const cloudsFolder = resourcesFolder.addFolder('Clouds');
  cloudsFolder.add(world.params.clouds, 'scale', 0, 100).name('Cloud Size');
  cloudsFolder.add(world.params.clouds, 'density', 0, 1).name('Cloud Cover');
  
  gui.onChange(() => {
    if (world.params.terrain.perlin == false) {
      seed.show();
    } else {
      seed.hide();
    }
    world.generate();
  });
}
