import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { World } from './world';
import { createUI } from './ui';
import { Player } from './player';
import { Physics } from './physics';
import {blocks} from './blocks';

const stats = new Stats();
document.body.append(stats.dom);

const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x80a0e0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

// Camera
const orbitCamera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000,
);
orbitCamera.position.set(-32, 16, -32);
orbitCamera.lookAt(0, 0, 0);
orbitCamera.layers.enable(1);

// Orbit Controls
const controls = new OrbitControls(orbitCamera, renderer.domElement);
controls.target.set(16, 0, 16);
controls.update();

// Scene Setup
const scene = new THREE.Scene();
const world = new World();
world.generate();
scene.add(world);
const player = new Player(scene);
const physics = new Physics(scene);

const sun = new THREE.DirectionalLight();
sun.intensity = 1.5;
sun.position.set(50, 50, 50);
sun.castShadow = true;

// Set the size of the sun's shadow box
sun.shadow.camera.left = -40;
sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40;
sun.shadow.camera.bottom = -40;
sun.shadow.camera.near = 0.1;
sun.shadow.camera.far = 200;
sun.shadow.bias = -0.0001;
sun.shadow.mapSize = new THREE.Vector2(2048, 2048);
scene.add(sun);
scene.add(sun.target);

const ambient = new THREE.AmbientLight();
ambient.intensity = 0.2;
scene.add(ambient);

scene.fog = new THREE.Fog(0x80a0e0, 50, 100);
let prevTime = performance.now();
let elapsedTime = 0;

function onMouseDown(event){
  
  if(player.controls.isLocked && player.selectedCoords){
    if(player.activeBlockId === blocks.empty.id){
      world.removeBlock(player.selectedCoords.x, player.selectedCoords.y, player.selectedCoords.z);
    } else {
      world.addBlock(player.selectedCoords.x, player.selectedCoords.y, player.selectedCoords.z, player.activeBlockId);
    }
  } 
}

document.addEventListener('mousedown', onMouseDown);

// Render Loop
function animate() {
  let currentTime = performance.now();
  let dt = (currentTime - prevTime) / 1000;
  requestAnimationFrame(animate);
    
  if(player.controls.isLocked){
    player.update(world);
    physics.update(dt, player, world);
    sun.position.copy(player.position);
    sun.position.sub(new THREE.Vector3(-50, -50, -50));
    sun.target.position.copy(player.position);
  }
  renderer.render(scene, player.controls.isLocked ? player.camera : orbitCamera);
  stats.update();

  world.update(player, elapsedTime);
  prevTime = currentTime;
  elapsedTime = elapsedTime+=dt;
}

window.addEventListener('resize', () => {
  orbitCamera.aspect = window.innerWidth / window.innerHeight;
  orbitCamera.updateProjectionMatrix();
  player.camera.aspect = window.innerWidth / window.innerHeight;
  player.camera.updateProjectionMatrix();
  controls.update();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

createUI(world, player, physics, scene);
animate();
