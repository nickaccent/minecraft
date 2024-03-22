import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();

function loadTexture(path) {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

const textures = {
  dirt: loadTexture('/textures/dirt.png'),
  grass: loadTexture('/textures/grass.png'),
  grassSide: loadTexture('/textures/grass_side.png'),
  stone: loadTexture('/textures/stone.png'),
  coal: loadTexture('/textures/coal_ore.png'),
  iron: loadTexture('/textures/iron_ore.png'),
  leaves : loadTexture('/textures/leaves.png'),
  treeSide: loadTexture('/textures/tree_side.png'),
  treeTop: loadTexture('/textures/tree_top.png'),
  sand: loadTexture('/textures/sand.png'),
};

export const blocks = {
  empty: {
    id: 0,
    name: 'empty',
  },
  grass: {
    id: 1,
    name: 'grass',
    color: 0x559020,
    material: [
      new THREE.MeshLambertMaterial({ map: textures.grassSide }), // right,
      new THREE.MeshLambertMaterial({ map: textures.grassSide }), // left,
      new THREE.MeshLambertMaterial({ map: textures.grass }), // top,
      new THREE.MeshLambertMaterial({ map: textures.dirt }), // bottom,
      new THREE.MeshLambertMaterial({ map: textures.grassSide }), // front,
      new THREE.MeshLambertMaterial({ map: textures.grassSide }), // back,
    ],
  },
  dirt: {
    id: 2,
    name: 'dirt',
    color: 0x807020,
    material: new THREE.MeshLambertMaterial({ map: textures.dirt }),
  },
  stone: {
    id: 3,
    name: 'stone',
    color: 0x808080,
    scale: { x: 30, y: 30, z: 30 },
    scarcity: 0.5,
    material: new THREE.MeshLambertMaterial({ map: textures.stone }),
  },
  coal: {
    id: 4,
    name: 'coal',
    color: 0x202020,
    scale: { x: 20, y: 20, z: 20 },
    scarcity: 0.7,
    material: new THREE.MeshLambertMaterial({ map: textures.coal }),
  },
  iron: {
    id: 5,
    name: 'iron',
    color: 0x806060,
    scale: { x: 15, y: 15, z: 15 },
    scarcity: 0.7,
    material: new THREE.MeshLambertMaterial({ map: textures.iron }),
  },
  tree: {
    id: 6,
    name: 'tree',
    material: [
      new THREE.MeshLambertMaterial({map: textures.treeSide }),
      new THREE.MeshLambertMaterial({map: textures.treeSide }),
      new THREE.MeshLambertMaterial({map: textures.treeTop }),
      new THREE.MeshLambertMaterial({map: textures.treeTop }),
      new THREE.MeshLambertMaterial({map: textures.treeSide }),
      new THREE.MeshLambertMaterial({map: textures.treeSide }),
    ]
  },
  leaves: {
    id: 7,
    name: 'leaves',
    material: new THREE.MeshLambertMaterial({map: textures.leaves }),
  },
  sand: {
    id: 8,
    name: 'sand',
    material: new THREE.MeshLambertMaterial({map: textures.sand }),
  },
  cloud: {
    id: 9,
    name: 'cloud',
    material: new THREE.MeshBasicMaterial({color: 0xf0f0f0 }),
  }
};

export const resources = [blocks.stone, blocks.coal, blocks.iron];
