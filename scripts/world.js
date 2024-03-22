import * as THREE from 'three';
import { WorldChunk } from './worldChunk';
import { DataStore } from './dataStore';
import waterVertexShader from '../shaders/water/vertex.glsl';
import waterFragmentShader from '../shaders/water/fragment.glsl';


export class World extends THREE.Group{
  asyncLoading = true;
  drawDistance = 1;
  chunkSize = { width: 24, height: 32 }
  waveColors = {
    depthColor: '#186697',
    surfaceColor: '#9bd8ff',
  };
  params = {
    terrain: {
      scale: 10,
      magnitude: 8,
      offset: 2,
      waterOffset: 5,
      seed: 0,
      perlin: true,
      octaves: 10,
      persistence: 0.5,
      lacunarity: 1.3,
      exponentiation: 3.9,
    },
    water: {
      geometry: new THREE.PlaneGeometry(1, 1, 256, 256),
      material: new THREE.ShaderMaterial({
        vertexShader: waterVertexShader,
        fragmentShader: waterFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        // wireframe: true,
        uniforms: {
          uTime: { value: 0 },
          uWaveSpeed: { value: 0.5 },
          uWaveElevation: { value: 0.05 },
          uWaveFrequency: { value: new THREE.Vector2(2, 1.5) },
          uDepthColor: { value: new THREE.Color(this.waveColors.depthColor) },
          uSurfaceColor: { value: new THREE.Color(this.waveColors.surfaceColor) },          
        }
      })
    },
    trees: {
      trunk: {
        minHeight: 3,
        maxHeight: 8,
      }, 
      canopy: {
        minRadius: 2,
        maxRadius: 4,
        density: 0.6 ,
      }, 
      frequency: 0.008,
    },
    clouds: {
      scale: 15,
      density: 0.5,
    },
  };

  dataStore = new DataStore();

  constructor(seed = 0) {
    super();
    this.seed = seed;
  }

  /**
   * Generate the world
   */
  generate() {
    this.dataStore.clear();
    this.disposeChunks();
    for(let x = -this.drawDistance; x <=this.drawDistance; x++){
      for(let z = -this.drawDistance; z <=this.drawDistance; z++){
        const chunk = new WorldChunk(this.chunkSize, this.params, this.dataStore);
        chunk.position.set(x * this.chunkSize.width, 0, z * this.chunkSize.width);
        
        chunk.generate();
        
        chunk.userData = {x, z};
        this.add(chunk);
      }
    }
  }

  /**
   * Updates the visible portions of the world based on the
   * current player position
   * @param {Player} player 
   */
  update(player, elapsedTime) {
    const visibleChunks = this.getVisibleChunks(player);
    const chunksToAdd = this.getChunksToAdd(visibleChunks);
    this.removeUnusedChunks(visibleChunks);
    
    for (const chunk of chunksToAdd) {
      this.generateChunk(chunk.x, chunk.z);
    }
    this.params.water.material.uniforms.uTime.value = elapsedTime;
  }

  /**
   * Returns an array containing the coordinates of the chunks that 
   * are current visible to the player
   * @param {Player} player 
   * @returns {{ x: number, z: number}[]}
   */
  getVisibleChunks(player) {
    const coords = this.worldToChunkCoords(player.position.x, 0, player.position.z);
    const {chunkX, chunkZ} = coords.chunk;
    const visibleChunks = [];
    for (let x = coords.chunk.x - this.drawDistance; x <= coords.chunk.x + this.drawDistance; x++) {
      for (let z = coords.chunk.z - this.drawDistance; z <= coords.chunk.z + this.drawDistance; z++) {
        visibleChunks.push({ x, z });
      }
    }
    return visibleChunks;
  }

  /**
   * Returns an array containing the coordinates of the chunks that 
   * are not yet loaded and need to be added to the scene
   * @param {{ x: number, z: number}[]} visibleChunks 
   * @returns {{ x: number, z: number}[]}
   */
  getChunksToAdd(visibleChunks) {
    // Filter down visible chunks, removing ones that already exist
    return visibleChunks.filter((chunkToAdd) => {
      const chunkExists = this.children
        .map((obj) => obj.userData)
        .find(({ x, z }) => {
          return chunkToAdd.x === x && chunkToAdd.z === z;
        });

      return !chunkExists;
    })
  }

  /**
   * Removes current loaded chunks that are no longer visible to the player
   * @param {{ x: number, z: number}[]} visibleChunks 
   */
  removeUnusedChunks(visibleChunks) {
    // Filter current chunks, getting ones that don't exist in visible chunks
    const chunksToRemove = this.children.filter((obj) => {
      const { x, z } = obj.userData;
      const chunkExists = visibleChunks.find((visibleChunk) => {
          return visibleChunk.x === x && visibleChunk.z === z;
        });

      return !chunkExists;
    })

    for (const chunk of chunksToRemove) {
      chunk.disposeInstances();
      this.remove(chunk);
      // console.log(`Removed chunk at X: ${chunk.userData.x} Z: ${chunk.userData.z}`);
    }
  }

  /**
   * Generates the chunk at the (x,z) coordinates
   * @param {number} x 
   * @param {number} z
   */
  generateChunk(x, z) {
    const chunk = new WorldChunk(this.chunkSize, this.params, this.dataStore);
    chunk.position.set(x * this.chunkSize.width, 0, z * this.chunkSize.width);
    chunk.userData = { x, z };

    if (this.asyncLoading) {
      requestIdleCallback(chunk.generate.bind(chunk), { timeout: 1000 });
    } else {
      chunk.generate();
    }

    this.add(chunk);
    // console.log(`Creating chunk at X: ${x} Z: ${z}`);
  }

  /**
   * Gets the block data at (x, y, z)
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @return {{id: number, instanceId: number} | null}
   */
  getBlock(x, y, z){
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if(chunk && chunk.isLoaded){
      return chunk.getBlock(coords.block.x, coords.block.y, coords.block.z);
    } else {
      return null;
    }
  }

  /**
   * Adds a new block at (x,y,z)
   * @param {number} x 
   * @param {number} y 
   * @param {number} z 
   * @param {number} blockId 
   */
  addBlock(x, y, z, blockId) {
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (chunk) {
      chunk.addBlock(coords.block.x, coords.block.y, coords.block.z, blockId);

      // Hide any blocks that may be totally obscured
      this.hideBlockIfNeeded(x - 1, y, z);
      this.hideBlockIfNeeded(x + 1, y, z);
      this.hideBlockIfNeeded(x, y - 1, z);
      this.hideBlockIfNeeded(x, y + 1, z);
      this.hideBlockIfNeeded(x, y, z - 1);
      this.hideBlockIfNeeded(x, y, z + 1);
    }
  }

  /**
   * Removes the block at (x, y, z) and sets it to empty
   * @param {number} x 
   * @param {number} y 
   * @param {number} z 
   */
  removeBlock(x, y, z) {
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);
  
    if (chunk) {
      chunk.removeBlock(coords.block.x, coords.block.y, coords.block.z);

      // Reveal any adjacent blocks that may have been exposed after the block at (x,y,z) was removed
      this.revealBlock(x - 1, y, z);
      this.revealBlock(x + 1, y, z);
      this.revealBlock(x, y - 1, z);
      this.revealBlock(x, y + 1, z);
      this.revealBlock(x, y, z - 1);
      this.revealBlock(x, y, z + 1);
    }
  }

  /**
   * Reveals the block at (x,y,z) by adding a new mesh instance
   * @param {number} x 
   * @param {number} y 
   * @param {number} z 
   */
  revealBlock(x, y, z) {
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (chunk) {
      chunk.addBlockInstance(coords.block.x, coords.block.y, coords.block.z);
    }
  }

  /**
   * Hides the block at (x,y,z) by removing the  new mesh instance
   * @param {number} x 
   * @param {number} y 
   * @param {number} z 
   */
  hideBlockIfNeeded(x, y, z) {
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);
    
    // Remove the block instance if it is totally obscured
    if (chunk && chunk.isBlockObscured(coords.block.x, coords.block.y, coords.block.z)) {
      chunk.deleteBlockInstance(coords.block.x, coords.block.y, coords.block.z);
    }
  }


  /**
   * Returns the chunk and world coordinates of the block at (x,y,z)\
   *  - `chunk` is the coordinates of the chunk containing the block
   *  - `block` is the world coordinates of the block
   * @param {number} x 
   * @param {number} y 
   * @param {number} z 
   * @returns {{
   *  chunk: { x: number, z: number},
   *  block: { x: number, y: number, z: number}
   * }}
   */
  worldToChunkCoords(x, y, z) {
    const chunkCoords = {
      x: Math.floor(x / this.chunkSize.width),
      z: Math.floor(z / this.chunkSize.width),
    };

    const blockCoords = {
      x: x - this.chunkSize.width * chunkCoords.x,
      y,
      z: z - this.chunkSize.width * chunkCoords.z
    }

    return {
      chunk: chunkCoords,
      block: blockCoords
    };
  }

  /**
   * Returns the WorldChunk object the contains the specified coordinates
   * @param {number} chunkX
   * @param {number} chunkZ
   * @returns {WorldChunk | null}
   */
  getChunk(chunkX, chunkZ) {
    return this.children.find((chunk) => {
      return chunk.userData.x === chunkX && 
            chunk.userData.z === chunkZ;
    });
  }

  disposeChunks() {
    this.traverse((chunk)=>{
      if(chunk.disposeInstances){
        chunk.disposeInstances();
      }
    });
    this.clear();
  }
}