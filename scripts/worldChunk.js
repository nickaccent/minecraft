import * as THREE from 'three';
import { noise } from './perlin';
import { blocks, resources } from './blocks';

const geometry = new THREE.BoxGeometry();
// const material = new THREE.MeshLambertMaterial();

export class WorldChunk extends THREE.Group {
  /**
   * @type {{}
   *  id: number,
   *  instance_id: number
   * }[][][]}
   */
  data = [];

  constructor(size, params, dataStore) {
    super();
    this.isLoaded = false;
    this.size = size;
    this.params = params;
    this.dataStore = dataStore;
  }

  /**
   * Generates the world data and meshes
   */
  generate() {
    const start = performance.now();
    const perlinNoise = new noise.Noise({
      octaves: this.params.terrain.octaves,
      persistence: this.params.terrain.persistence,
      lacunarity: this.params.terrain.lacunarity,
      exponentiation: this.params.terrain.exponentiation,
      height: this.params.terrain.perlin ? 8 : 4,
      scale: 2.0,
      noiseType: this.params.terrain.perlin ? 'perlin' : 'simplex',
      seed: this.params.terrain.seed,
    });
    this.initializeTerrain();
    this.generateResources(perlinNoise);
    this.generateTerrain(perlinNoise);
    this.generateTrees(perlinNoise);
    this.generateClouds(perlinNoise);
    this.loadPlayerChanges();
    this.generateMeshes();
    this.isLoaded = true;
    // console.log(`World chunk generated in ${performance.now() - start}ms`);
  }

  /**
   * Initialize the world terrain data
   */
  initializeTerrain() {
    this.data = [];
    for (let x = 0; x < this.size.width; x++) {
      const slice = [];
      for (let y = 0; y < this.size.height; y++) {
        const row = [];
        for (let z = 0; z < this.size.width; z++) {
          row.push({
            id: blocks.empty.id,
            instanceId: null,
          });
        }
        slice.push(row);
      }
      this.data.push(slice);
    }
  }

  /**
   * Generates the resources
   * @param {noise.Noise} perlinNoise
   */
  generateResources(perlinNoise) {
    resources.forEach((resource) => {
      for (let x = 0; x < this.size.width; x++) {
        for (let y = 0; y < this.size.height; y++) {
          for (let z = 0; z < this.size.width; z++) {
            const value = perlinNoise.GetSimplex3d(
              (this.position.x + x) / resource.scale.x,
              (this.position.y + y) / resource.scale.y,
              (this.position.z + z) / resource.scale.z,
            );
            const scaledNoise = this.params.terrain.offset + this.params.terrain.magnitude * value;
            if (scaledNoise > resource.scarcity) {
              this.setBlockId(x, y, z, resource.id);
            }
          }
        }
      }
    });
  }

  /** 
   * Generate the Terrain 
   * @param {noise.Noise} perlinNoise
   */
  generateTerrain(perlinNoise) {
    for (let x = 0; x < this.size.width; x++) {
      for (let z = 0; z < this.size.width; z++) {
        const value = perlinNoise.Get((this.position.x + x) / this.params.terrain.scale, (this.position.z + z) / this.params.terrain.scale);

        const scaledNoise = this.params.terrain.offset + this.params.terrain.magnitude * value;
        let height = Math.floor(scaledNoise);
        height = Math.max(0, Math.min(height, this.size.height -1));
        for (let y = 0; y < this.size.height; y++) {
          if(y <= this.params.terrain.waterOffset && y <= height){
            this.setBlockId(x, y, z, blocks.sand.id);
          } else if (y == height) {
            this.setBlockId(x, y, z, blocks.grass.id);
          } else if (y < height && this.getBlock(x, y, z).id == blocks.empty.id) {
            this.setBlockId(x, y, z, blocks.dirt.id);
          } else if (y > height) {
            this.setBlockId(x, y, z, blocks.empty.id);
          }
        }
      }
    }
  }

  /**
   * Populate the world with trees
   * @param {noise.Noise} perlinNoise
   */
  generateTrees(perlin) {
    const generateTreeTrunk = (x, z) => {
      const minH = this.params.trees.trunk.minHeight;
      const maxH = this.params.trees.trunk.maxHeight;
      const h = Math.round(minH + (maxH - minH) * Math.random());

      for(let y = 0; y < this.size.height; y++){
        const block = this.getBlock(x, y, z);
        if(block && block.id === blocks.grass.id ){
          for(let treeY = y+1; treeY <= y+h; treeY++){
            this.setBlockId(x, treeY, z, blocks.tree.id);
          }
          generateTreeCanopy(x, y+h, z)
          break;
        }
      }

    }

    const generateTreeCanopy = (centerX, centerY, centerZ) => {
      const minR = this.params.trees.canopy.minRadius;
      const maxR = this.params.trees.canopy.maxRadius;
      const r = Math.round(minR + (maxR - minR) * Math.random());
      for(let x = -r; x <= r; x++){
        for(let y = -r; y <= r; y++){
          for(let z = -r; z <= r; z++){
            if(x*x + y*y + z*z > r*r) continue;
            const block = this.getBlock(centerX+x, centerY+y, centerZ+z);
            if(block && block.id !== blocks.empty.id) continue;
            if(Math.random() <= this.params.trees.canopy.density){
              this.setBlockId(centerX+x, centerY+y, centerZ+z, blocks.leaves.id);
            }        
          }
        }
      }
    }

    let offset = this.params.trees.canopy.maxRadius;
    for(let x = offset; x < this.size.width-offset; x++){
      for(let z = offset; z < this.size.width-offset; z++){
        if(Math.random() < this.params.trees.frequency){
          generateTreeTrunk(x, z);
        }
      }
    }
  }

  /**
   * Generate the clouds!
   * @param {noise.Noise} perlinNoise 
   */
  generateClouds(perlinNoise){
    for(let x = 0; x<this.size.width; x++){
      for(let z = 0; z<this.size.width; z++){
        const value = perlinNoise.Get((this.position.x + x) / this.params.clouds.scale, (this.position.z + z) / this.params.clouds.scale);
        if(value < this.params.clouds.density){
          this.setBlockId(x, this.size.height - 1, z, blocks.cloud.id);
        }
      }
    }
  }

  /**
   * Pulls any changes from the data store and applies them to the data model
   */
  loadPlayerChanges() {
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        for (let z = 0; z < this.size.width; z++) {
          // Overwrite with value in data store if it exists
          if (this.dataStore.contains(this.position.x, this.position.z, x, y, z)) {
            const blockId = this.dataStore.get(this.position.x, this.position.z, x, y, z);
            this.setBlockId(x, y, z, blockId);
          }
        }
      }
    }
  }

  generateWater() {
    const waterMesh = new THREE.Mesh(this.params.water.geometry, this.params.water.material);
    waterMesh.rotateX(-Math.PI/2);
    waterMesh.position.set(
      this.size.width /2,
      this.params.terrain.waterOffset +0.4,
      this.size.width /2,
    );
    waterMesh.scale.set(this.size.width, this.size.width, 1);
    waterMesh.layers.set(1);
    this.add(waterMesh);
  }

  /**
   * Generates the meshes from the world data
   */
  generateMeshes() {
    this.clear();

    this.generateWater();

    // create lookup table where key = block.id
    const maxCount = this.size.width * this.size.width * this.size.height;
    const meshes = {};
    Object.values(blocks)
      .filter((blockType) => blockType.id !== blocks.empty.id)
      .forEach((blockType) => {
        const mesh = new THREE.InstancedMesh(geometry, blockType.material, maxCount);
        mesh.name = blockType.id;
        mesh.count = 0;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        meshes[blockType.id] = mesh;
      });

    const matrix = new THREE.Matrix4();
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        for (let z = 0; z < this.size.width; z++) {
          const blockId = this.getBlock(x, y, z).id;
          if (blockId === blocks.empty.id) continue;

          const mesh = meshes[blockId];
          const instanceId = mesh.count;

          if (!this.isBlockObscured(x, y, z)) {
            matrix.setPosition(x, y, z);
            mesh.setMatrixAt(instanceId, matrix);
            this.setBlockInstanceId(x, y, z, instanceId);
            mesh.count++;
          }
        }
      }
    }
    this.add(...Object.values(meshes));
  }

  /**
   * Gets the block data at (x, y, z)
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @return {{id: number, instanceId: number}}
   */
  getBlock(x, y, z) {
    if (this.inBounds(x, y, z)) {
      return this.data[x][y][z];
    } else {
      return null;
    }
  }

  /**
   * Adds a new block at (x,y,z) of type `blockId`
   * @param {number} x 
   * @param {number} y 
   * @param {number} z 
   * @param {number} blockId 
   */
  addBlock(x, y, z, blockId) {
    // Safety check that we aren't adding a block for one that
    // already has an instance
    if (this.getBlock(x, y, z).id === blocks.empty.id) {
      this.setBlockId(x, y, z, blockId);
      this.addBlockInstance(x, y, z);
      this.dataStore.set(this.position.x, this.position.z, x, y, z, blockId);
    }
  }

  /**
   * Removes the block at (x, y, z)
   * @param {number} x 
   * @param {number} y 
   * @param {number} z 
   */
  removeBlock(x, y, z) {
    const block = this.getBlock(x, y, z);
    if (block && block.id !== blocks.empty.id) {
      // console.log(`Removing block at X:${x} Y:${y} Z:${z}`);
      this.deleteBlockInstance(x, y, z);
      this.setBlockId(x, y, z, blocks.empty.id);
      this.dataStore.set(this.position.x, this.position.z, x, y, z, blocks.empty.id);
    }
  }

  /**
   * Removes the mesh instance associated with `block` by swapping it
   * with the last instance and decrementing the instance count.
   * @param {number} x 
   * @param {number} y 
   * @param {number} z 
   * @param {{ id: number, instanceId: number }} block 
   */
  deleteBlockInstance(x, y, z) {
    const block = this.getBlock(x, y, z);

    if (block.id === blocks.empty.id || !block.instanceId) return;

    // Get the mesh and instance id of the block
    const mesh = this.children.find((instanceMesh) => instanceMesh.name === block.id);
    const instanceId = block.instanceId;

    // We can't remove an instance directly, so we swap it with the last instance
    // and decrease the count by 1. We need to do two things:
    //   1. Swap the matrix of the last instance with the matrix at `instanceId`
    //   2. Set the instanceId for the last instance to `instanceId`
    const lastMatrix = new THREE.Matrix4();
    mesh.getMatrixAt(mesh.count - 1, lastMatrix);

    // Also need to get the block coordinates of the instance
    // to update the instance id for that block
    const v = new THREE.Vector3();
    v.setFromMatrixPosition(lastMatrix);
    this.setBlockInstanceId(v.x, v.y, v.z, instanceId);

    // Swap the transformation matrices
    mesh.setMatrixAt(instanceId, lastMatrix);

    // Decrease the mesh count to "delete" the block
    mesh.count--;

    // Notify the instanced mesh we updated the instance matrix
    // Also re-compute the bounding sphere so raycasting works
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();

    this.setBlockInstanceId(x, y, z, undefined);
  }

  /**
   * Create a new instance for the block at (x,y,z)
   * @param {number} x 
   * @param {number} y 
   * @param {number} z 
   */
  addBlockInstance(x, y, z) {
    const block = this.getBlock(x, y, z);

    // If this block is non-empty and does not already have an instance, create a new one
    if (block && block.id !== blocks.empty.id && !block.instanceId) {
      // Append a new instance to the end of our InstancedMesh
      const mesh = this.children.find((instanceMesh) => instanceMesh.name === block.id);
      const instanceId = mesh.count++;
      this.setBlockInstanceId(x, y, z, instanceId);

      // Update the appropriate instanced mesh
      // Also re-compute the bounding sphere so raycasting works
      const matrix = new THREE.Matrix4();
      matrix.setPosition(x, y, z);
      mesh.setMatrixAt(instanceId, matrix);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }

  /**
   * Sets the block id for the block at (x, y, z)
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {number} id
   */
  setBlockId(x, y, z, id) {
    if (this.inBounds(x, y, z)) {
      this.data[x][y][z].id = id;
    }
  }

  /**
   * Sets the block instance id for the block at (x, y, z)
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {number} instanceId
   */
  setBlockInstanceId(x, y, z, instanceId) {
    if (this.inBounds(x, y, z)) {
      this.data[x][y][z].instanceId = instanceId;
    }
  }

  /**
   * Checks if the (x, y, z) coordinates are within bounds
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {boolean}
   */
  inBounds(x, y, z) {
    if (
      x >= 0 &&
      x < this.size.width &&
      y >= 0 &&
      y < this.size.height &&
      z >= 0 &&
      z < this.size.width
    ) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Returns true if this block is completely hidden by other blocks
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {boolean}
   */
  isBlockObscured(x, y, z) {
    const up = this.getBlock(x, y + 1, z)?.id ?? blocks.empty.id;
    const down = this.getBlock(x, y - 1, z)?.id ?? blocks.empty.id;
    const left = this.getBlock(x + 1, y, z)?.id ?? blocks.empty.id;
    const right = this.getBlock(x - 1, y, z)?.id ?? blocks.empty.id;
    const forward = this.getBlock(x, y, z + 1)?.id ?? blocks.empty.id;
    const back = this.getBlock(x, y, z - 1)?.id ?? blocks.empty.id;

    // If any of the block's sides is exposed, it is not obscured
    if (
      up === blocks.empty.id ||
      down === blocks.empty.id ||
      left === blocks.empty.id ||
      right === blocks.empty.id ||
      forward === blocks.empty.id ||
      back === blocks.empty.id
    ) {
      return false;
    } else {
      return true;
    }
  }

  disposeInstances() {
    this.traverse((obj) => {
      if (obj.dispose) obj.dispose();
    });
    this.clear();
  }
}
