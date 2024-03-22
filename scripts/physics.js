import * as THREE from 'three';
import { Player } from './player';
import { World } from './world';
import { blocks } from './blocks';

const collisionMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  transparent: true,
  opacity: 0.2,
});
const collisionGeometry = new THREE.BoxGeometry(1.001, 1.001, 1.001);

const contactMaterial = new THREE.MeshBasicMaterial({
  wireframe: true,
  color: 0x00ff00,
});
const contactGeometry = new THREE.SphereGeometry(0.05, 6, 6);

export class Physics {
  gravity = 32;
  simulationRate = 200;
  timeStep = 1/this.simulationRate;
  accumulator = 0;

  constructor(scene) {
    this.helpers = new THREE.Group();
    this.helpers.visible = false;
    scene.add(this.helpers);
  }

  /**
   * Main Function for collision detections
   * @param {Player} player
   * @param {World} world
   */
  detectCollisions(player, world) {
    player.onGround = false;
    const candidates = this.broadPhase(player, world);
    const collisions = this.narrowPhase(candidates, player);

    if (collisions.length > 0) {
      this.resolveCollisions(collisions, player);
    }
  }

  /**
   * Find possible blocks that may be colliding
   * @param {Player} player
   * @param {World} world
   * @returns {[]}
   */
  broadPhase(player, world) {
    const candidates = [];

    const extents = {
      x: {
        min: Math.floor(player.position.x - player.radius),
        max: Math.ceil(player.position.x + player.radius),
      },
      y: {
        min: Math.floor(player.position.y - player.height),
        max: Math.ceil(player.position.y),
      },
      z: {
        min: Math.floor(player.position.z - player.radius),
        max: Math.ceil(player.position.z + player.radius),
      },
    };

    for (let x = extents.x.min; x <= extents.x.max; x++) {
      for (let y = extents.y.min; y <= extents.y.max; y++) {
        for (let z = extents.z.min; z <= extents.z.max; z++) {
          const block = world.getBlock(x, y, z);
          if (block && block.id !== blocks.empty.id) {
            const blockPos = { x, y, z };
            candidates.push(blockPos);
            this.addCollisionHelper(blockPos);
          }
        }
      }
    }
    return candidates;
  }

  /**
   * Narrow down the blocks found in broadphase and set the ones actually colliding
   * @param {*} candidates
   * @param {Player} player
   * @returns
   */
  narrowPhase(candidates, player) {
    const collisions = [];
    for (const block of candidates) {
      // get the point on block closest to player
      const closestPoint = this.getClosestPointToPlayer(block, player);
      // determine if point is inside players cylinder
      const dx = closestPoint.x - player.position.x;
      const dy = closestPoint.y - (player.position.y - (player.height / 2));
      const dz = closestPoint.z - player.position.z;
      const isInside = this.isInsidePlayerCylinder(closestPoint, player);
      // if true then calculate
      if(isInside){
        // overlap
        const overlapY = (player.height /2) - Math.abs(dy);
        const overlapXZ = player.radius - Math.sqrt(dx * dx + dz * dz);
        // collision normal
        let normal, overlap;
        if(overlapY < overlapXZ){
          normal = new THREE.Vector3(0, -Math.sign(dy), 0);
          overlap = overlapY;
          player.onGround = true;
        } else {
          normal = new THREE.Vector3(-dx, 0, -dz).normalize();
          overlap = overlapXZ;
        }

        collisions.push({
          block, 
          contactPoint: closestPoint,
          normal,
          overlap
        });
        this.addContactHelper(closestPoint);
      }
    }
    return collisions;
  }

  /**
   * Resolve collisions found in narrow phase
   * @param {object} collisions
   * @param {Player} player 
   */
  resolveCollisions(collisions, player) {
    // Sort in order of smallest to largest overlaps
    collisions.sort((a, b)=>{
      return a.overlap < b.overlap;
    });

    // Resolve the collision
    for(const collision of collisions){
      if(!this.isInsidePlayerCylinder(collision.contactPoint, player)) continue;
      // Adjust player poosition
      let deltaPosition = collision.normal.clone();
      deltaPosition.multiplyScalar(collision.overlap);
      player.position.add(deltaPosition);

      // Negate velocity along the collision normal
      let magnitude = player.worldVelocity.dot(collision.normal);
      let velocityAdjustment = collision.normal.clone().multiplyScalar(magnitude);
      player.applyWorldDeltaVelocity(velocityAdjustment.negate());
    }
  }

  /**
   * Get the closest point on a block to the player
   * @param {THREE.Object3D} block
   * @param {Player} player
   * @return {THREE.Vector3}
   */
  getClosestPointToPlayer(block, player) {
    const position = player.position;
    return {
      x: Math.max(block.x - 0.5, Math.min(position.x, block.x + 0.5)),
      y: Math.max(block.y - 0.5, Math.min(position.y - player.height / 2, block.y + 0.5)),
      z: Math.max(block.z - 0.5, Math.min(position.z, block.z + 0.5)),
    };
  }

  /**
   * Check if point is inside of players bounding cylinder
   * @param {{x, y, z}} point
   * @param {Player} player
   * @return {boolean}
   */
  isInsidePlayerCylinder(p, player) {
    const dx = p.x - player.position.x;
    const dy = p.y - (player.position.y - (player.height / 2));
    const dz = p.z - player.position.z;
    const r_sq = dx * dx + dz * dz;  
    return (Math.abs(dy) < player.height / 2) && (r_sq < player.radius * player.radius);
  }

  /**
   * Move the Physics simulation forward in time by dt
   * @param {number} dt
   * @param {Player} player
   * @param {World} world
   */
  update(dt, player, world) {
    this.accumulator += dt;
    while(this.accumulator >= this.timeStep){
      this.helpers.clear();
      player.velocity.y -= this.gravity * this.timeStep;
      player.applyInputs(this.timeStep);
      player.updateBoundsHelper();
      this.detectCollisions(player, world);
      this.accumulator -= this.timeStep;
    }
  }

  /**
   * Visualize the collision block
   * @param {THREE.Object3D} block
   */
  addCollisionHelper(block) {
    const blockMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
    blockMesh.position.copy(block);
    this.helpers.add(blockMesh);
  }

  /**
   * Visualize the contact point
   * @param {{x, y, z}} p
   */
  addContactHelper(p) {
    const contactMesh = new THREE.Mesh(contactGeometry, contactMaterial);
    contactMesh.position.copy(p);
    this.helpers.add(contactMesh);
  }
}
