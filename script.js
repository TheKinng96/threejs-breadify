import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Game Settings ---
const fallSpeed = 0.025; // Slightly faster maybe? Adjust as needed.
const spawnRate = 0.02;  // Slightly more frequent spawns? Adjust.
const bottomLimit = -7;  // Adjust based on camera view
const numberOfLanes = 5;
// Define the total horizontal space the lanes occupy in world units
const gameAreaWidth = 8; // Increase this for wider spacing
const spawnHeight = 6;   // Adjust Y spawn position based on camera view

// --- Basic Setup ---
let scene, camera, renderer;
let score = 0;
let baseBreadModel = null;
const fallingBreads = [];
let laneWidth; // Will be calculated

const container = document.getElementById('container');
const scoreElement = document.getElementById('score');

// --- Raycasting Setup ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function init() {
    // Scene
    scene = new THREE.Scene();

    // Calculate lane width based on total area and number of lanes
    laneWidth = gameAreaWidth / numberOfLanes;

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Adjust camera Z position to ensure 'gameAreaWidth' is roughly visible.
    // This might require tweaking based on your bread size and desired feel.
    // Pulling back further makes the lanes appear narrower relative to the screen.
    camera.position.z = 10; // Further back to see the wider game area
    camera.position.y = 1.5; // Slightly higher view maybe
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

            // --- MAKE BREAD LARGER ---
            // Increase scale significantly to make tapping easier
            baseBreadModel.scale.set(3,3,3); // Adjust as needed

            console.log("Base bread model loaded!");
        },
        undefined,
        function (error) {
            console.error('Error loading base bread model:', error);
            displayError('Error loading bread.glb! Make sure the file exists and the web server is running.');
        }
    );
}

// Helper function to get the center X coordinate for a given lane index (0 to N-1)
function getLaneXPosition(laneIndex) {
    const firstLaneX = -gameAreaWidth / 2 + laneWidth / 2;
    return firstLaneX + laneIndex * laneWidth;
}

function spawnBread() {
    if (!baseBreadModel) return;

    const newBread = baseBreadModel.clone();

    // Choose a random lane index (0, 1, 2, 3, 4)
    const randomLane = Math.floor(Math.random() * numberOfLanes);

    // Set position based on the chosen lane
    newBread.position.x = getLaneXPosition(randomLane);
    newBread.position.y = spawnHeight;
    // Keep Z variation minimal or zero for a flatter feel if desired
    newBread.position.z = 0; // Math.random() * 0.5 - 0.25;

    // Randomize initial rotation slightly
    newBread.rotation.x = Math.random() * 0.5 - 0.25; // Less extreme rotation?
    newBread.rotation.y = Math.random() * Math.PI * 0.5 - Math.PI * 0.25; // Allow some Y rotation
    newBread.rotation.z = Math.random() * 0.5 - 0.25;

    scene.add(newBread);
    fallingBreads.push(newBread);
}

function removeBread(breadObject, index) {
    // Make sure breadObject is valid before trying to remove
    if (breadObject && breadObject.parent) {
       scene.remove(breadObject);
    } else {
        console.warn("Attempted to remove bread that was already removed or invalid:", breadObject);
    }
    // Safely remove from array even if object was already removed from scene elsewhere
    if (index >= 0 && index < fallingBreads.length && fallingBreads[index] === breadObject) {
       fallingBreads.splice(index, 1);
    } else {
        // Fallback: find the object again if index was wrong (shouldn't happen often)
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
    // Re-calculating camera Z based on aspect might be needed for perfect consistency,
    // but often just updating aspect/renderer size is good enough for this type of game.
}

// --- Interaction Logic (largely unchanged, but benefits from larger bread) ---

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

        // Find the top-level bread that was hit
        let current = intersectedObject3D;
        while (current) {
            const index = fallingBreads.indexOf(current);
            if (index !== -1) {
                hitBread = current;
                hitBreadIndex = index;
                break;
            }
            // Check if current is the scene itself to prevent infinite loop
            if (current === scene) break;
            current = current.parent;
        }

        if (hitBread && hitBreadIndex > -1) {
             // Check if this bread is still actually in the array at this index
             // (Could have been removed by falling off screen in the same frame)
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

    // --- Spawning ---
    if (baseBreadModel && Math.random() < spawnRate) {
        spawnBread();
    }

    // --- Falling Logic ---
    for (let i = fallingBreads.length - 1; i >= 0; i--) {
        const bread = fallingBreads[i];
        // Ensure bread still exists (might have been removed by click)
        if (!bread || !bread.parent) continue;

        bread.position.y -= fallSpeed;

        // Optional: Rotation while falling
        bread.rotation.z += 0.005; // Slower rotation maybe
        // bread.rotation.x += 0.005;

        // Remove if it falls below the screen
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