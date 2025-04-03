import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Game Settings ---
const fallSpeed = 0.025;
const spawnRate = 0.02;
const bottomLimit = -7;
const numberOfLanes = 5;
const gameAreaWidth = 8;
const spawnHeight = 6;

// --- Basic Setup ---
let scene, camera, renderer;
let score = 0;
let baseBreadModel = null;
const fallingBreads = [];
let laneWidth;

const container = document.getElementById('container');
const scoreElement = document.getElementById('score');

// --- Raycasting Setup ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function init() {
    // Scene
    scene = new THREE.Scene();
    // --- ADDED THIS LINE to set background color ---
    scene.background = new THREE.Color(0xe6f2f0); // Pastel mint color (or choose another pastel)

    // Calculate lane width
    laneWidth = gameAreaWidth / numberOfLanes;

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;
    camera.position.y = 1.5;
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Load the base Model
    loadBaseBread();

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    container.addEventListener('pointerdown', onPointerDown);

    // Initial Score Update
    updateScore();

    // Start Animation Loop
    animate();
}

function loadBaseBread() {
    const loader = new GLTFLoader();
    loader.load(
        'bread.glb', // <<< YOUR BREAD MODEL FILE HERE
        function (gltf) {
            baseBreadModel = gltf.scene;
            baseBreadModel.scale.set(3, 3, 3);
            console.log("Base bread model loaded!");
        },
        undefined,
        function (error) {
            console.error('Error loading base bread model:', error);
            displayError('Error loading bread.glb! Make sure the file exists and the web server is running.');
        }
    );
}

function getLaneXPosition(laneIndex) {
    const firstLaneX = -gameAreaWidth / 2 + laneWidth / 2;
    return firstLaneX + laneIndex * laneWidth;
}

function spawnBread() {
    if (!baseBreadModel) return;

    const newBread = baseBreadModel.clone();
    const randomLane = Math.floor(Math.random() * numberOfLanes);
    newBread.position.x = getLaneXPosition(randomLane);
    newBread.position.y = spawnHeight;
    newBread.position.z = 0;
    newBread.rotation.x = Math.random() * 0.5 - 0.25;
    newBread.rotation.y = Math.random() * Math.PI * 0.5 - Math.PI * 0.25;
    newBread.rotation.z = Math.random() * 0.5 - 0.25;

    scene.add(newBread);
    fallingBreads.push(newBread);
}

function removeBread(breadObject, index) {
    if (breadObject && breadObject.parent) {
       scene.remove(breadObject);
    }
    if (index >= 0 && index < fallingBreads.length && fallingBreads[index] === breadObject) {
       fallingBreads.splice(index, 1);
    } else {
        const actualIndex = fallingBreads.indexOf(breadObject);
        if (actualIndex > -1) {
            fallingBreads.splice(actualIndex, 1);
        }
    }
}

function updateScore() {
    scoreElement.innerText = `Score: ${score}`;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Interaction Logic ---

function updatePointerPosition(event) {
     const touch = event.changedTouches ? event.changedTouches[0] : event;
     const rect = container.getBoundingClientRect();
     pointer.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
     pointer.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
}

function onPointerDown(event) {
    updatePointerPosition(event);
    castRayAndHitBread();
}

function castRayAndHitBread() {
    if (fallingBreads.length === 0) return;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(fallingBreads, true);

    if (intersects.length > 0) {
        const intersectedObject3D = intersects[0].object;
        let hitBread = null;
        let hitBreadIndex = -1;

        let current = intersectedObject3D;
        while (current) {
            const index = fallingBreads.indexOf(current);
            if (index !== -1) {
                hitBread = current;
                hitBreadIndex = index;
                break;
            }
            if (current === scene) break;
            current = current.parent;
        }

        if (hitBread && hitBreadIndex > -1) {
            if (fallingBreads[hitBreadIndex] === hitBread) {
                removeBread(hitBread, hitBreadIndex);
                score++;
                updateScore();
            }
        }
    }
}


// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    if (baseBreadModel && Math.random() < spawnRate) {
        spawnBread();
    }

    for (let i = fallingBreads.length - 1; i >= 0; i--) {
        const bread = fallingBreads[i];
        if (!bread || !bread.parent) continue;

        bread.position.y -= fallSpeed;
        bread.rotation.z += 0.005;

        if (bread.position.y < bottomLimit) {
            removeBread(bread, i);
        }
    }

    renderer.render(scene, camera);
}

// --- Utility Functions (Error Display) ---
function displayError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translate(-50%, -50%)';
    errorDiv.style.color = 'red';
    errorDiv.style.backgroundColor = 'white';
    errorDiv.style.padding = '20px';
    errorDiv.style.border = '2px solid red';
    errorDiv.innerText = message;
    document.body.appendChild(errorDiv);
}


// --- Start Everything ---
init();