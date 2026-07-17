import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createFuturisticAirport } from "./world/Airport.js";
import { Renderer } from "./core/Renderer.js";
import { CameraManager } from "./managers/CameraManager.js";
import { UpdateManager } from "./managers/UpdateManager.js";
import {
    acceleratedRaycast,
    computeBoundsTree,
    disposeBoundsTree,
    MeshBVHHelper
} from "three-mesh-bvh";
/* ==========================================================
   AeroVerse V2
   simulator.js
   Part 1
   Engine Initialization
========================================================== */

/* ==========================================================
   ENGINE
========================================================== */
THREE.Mesh.prototype.raycast = acceleratedRaycast;

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
const terrainRay = new THREE.Raycaster();

const DOWN = new THREE.Vector3(0, -1, 0);
const THROTTLE_STEP = 5;
let noseWheel = null;
let leftWheel = null;
let rightWheel = null;

let rudder = null;
let elevatorLeft = null;
let elevatorRight = null;
let aileronLeft = null;
let aileronRight = null;
let onGround = true;
let engineOn = false;
let engineStarting = false;
let engineBlink = false;
let lastBlinkTime = 0;
const ENGINE_START_TIME = 2000; // 2 seconds
const cockpitOffset = new THREE.Vector3(
    -0.2,
    1.8,
    -5
);

const cockpitWorldPosition = new THREE.Vector3();
const cockpitQuaternion = new THREE.Quaternion();
const CAMERA_SETTINGS = {

    cockpit: {
        x: -0.18,
        y: 1.25,
        z: -5.01,
        fov: 75
    },

    chase: {
        x: 0,
        y: 5,
        z: 12
    },

    wingLeft: {
        x: -4,
        y: -1,
        z: 0
    },

    wingRight: {
        x: 4,
        y: -1,
        z: 0
    }

};
/* ==========================================================
   SCENE
========================================================== */

import { Engine } from "./core/Engine.js";

const engine = new Engine();
const scene = engine.getScene();


/* ==========================================================
   CAMERA
========================================================== */

const cameraManager = new CameraManager();
const camera = cameraManager.getCamera();

/* ==========================================================
   RENDERER
========================================================== */

const rendererSystem = new Renderer();
const renderer = rendererSystem.getRenderer();

/* ==========================================================
   MANAGER
========================================================== */
const updateManager = new UpdateManager();
/* ==========================================================
   ORBIT CONTROLS
========================================================== */

const controls = new OrbitControls(
    camera,
    renderer.domElement
);

controls.enableDamping = true;
controls.enablePan = false;
controls.enableRotate = false;
controls.enableZoom = false;


/* ==========================================================
   GLOBAL LOADERS
========================================================== */

const loader = new GLTFLoader();


/* ==========================================================
   GLOBAL GROUPS
========================================================== */

const aircraftRoot = new THREE.Group();
const yawPivot = new THREE.Group();
const pitchPivot = new THREE.Group();
const rollPivot = new THREE.Group();

scene.add(aircraftRoot);

aircraftRoot.add(yawPivot);
yawPivot.add(pitchPivot);
pitchPivot.add(rollPivot);


/* ==========================================================
   GLOBAL VARIABLES
========================================================== */
/* ==========================================================
   PART 13
   Landing Gear Physics
========================================================== */

let gearCompression = 0;
let wheelRotation = 0;
let wheelSteer = 0;

const MAX_GEAR_COMPRESSION = 0.35;
const SUSPENSION_SPEED = 0.12;
const WHEEL_RADIUS = 0.42;
let aircraft = null;
let aircraftMixer = null;
const aircraftAnimationActions = new Map();
const aircraftAnimationStates = new Map();

let throttle = 0;

// Actual physics speed
let trueSpeed = 0;

// HUD speed
let indicatedSpeed = 0;
let engineRPM = 0;      // 0–100%
let thrust = 0;
let speed = 0;     // 0-100%

// Speed limits
const MIN_SPEED = 0.0;
const MAX_SPEED = 8.0;

const SPEED_DISPLAY_SCALE = 250;
let yaw = Math.PI;
let pitch = 0;
let roll = 0;
let verticalSpeed = 0.25;
let aircraftDrowned = false;

const DROWN_THRESHOLD = 4;
const AIRCRAFT_ANIMATION_SPEED = 6;
const AIRCRAFT_ANIMATION_SPEEDS = {
    gear: 1.6,
    flaps: 1.4,
    ailerons: 1.2,
    airbrakes: 1.3,
    pushback: 1.5,
    doors: 3.4
};

let cameraMode = 2;


/* ==========================================================
   MOUSE INPUT
========================================================== */

const mouse = {
    x: 0,
    y: 0
};

const horizontalSensitivity = 1000;
const verticalSensitivity = 220;

window.addEventListener("mousemove", (event) => {

    mouse.x =
        (event.clientX - window.innerWidth / 2) /
        horizontalSensitivity;

    mouse.y =
        -(event.clientY - window.innerHeight / 2) /
        verticalSensitivity;

    mouse.x = THREE.MathUtils.clamp(mouse.x, -1, 1);
    mouse.y = THREE.MathUtils.clamp(mouse.y, -1, 1);

});


 /* ==========================================================
   KEYBOARD INPUT
========================================================== */

const keys = {};

window.addEventListener("keydown", (event) => {

    // Store all keys
    keys[event.code] = true;

    // Only E controls engine
    if (event.code !== "KeyE") return;

    // Don't allow another press while starting
    if (engineStarting) return;

    // ----------------------------
    // ENGINE RUNNING -> TURN OFF
    // ----------------------------
    if (engineOn) {

        engineOn = false;

        console.log("Engine Shutdown");

        return;
    }

    // ----------------------------
    // ENGINE OFF -> START
    // ----------------------------
    engineStarting = true;

    console.log("Engine Starting...");

    setTimeout(() => {

    console.log("1");

    engineStarting = false;

    console.log("2");

    engineOn = true;

    console.log("3");

    if (speed < 0.15)
        speed = 0.15;

    console.log("4");

}, ENGINE_START_TIME);

});

window.addEventListener("keyup", (event) => {

    keys[event.code] = false;

});


/* ==========================================================
   AIRCRAFT ANIMATION CONTROLS
========================================================== */

function triggerAircraftAnimation(actionName) {

    const action = aircraftAnimationActions.get(actionName);

    if (!action) return;

    const isReversed = aircraftAnimationStates.get(actionName) ?? false;
    const nextReverse = !isReversed;
    const direction = nextReverse ? -1 : 1;
    const clipDuration = action.getClip().duration;
    const speedOverride = AIRCRAFT_ANIMATION_SPEEDS[actionName] ?? AIRCRAFT_ANIMATION_SPEED;

    aircraftAnimationStates.set(actionName, nextReverse);

    action.stop();
    action.reset();
    action.time = nextReverse ? clipDuration : 0;
    action.timeScale = direction * speedOverride;
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.paused = false;
    action.play();

    console.log(
        "Aircraft action:",
        actionName,
        nextReverse ? "reverse" : "forward"
    );

}

/* ==========================================================
   CAMERA MODE KEYS
========================================================== */

window.addEventListener("keydown", (event) => {

    if (event.code === "Digit1") cameraMode = 1;
    if (event.code === "Digit2") cameraMode = 2;
    if (event.code === "Digit3") cameraMode = 3;
    if (event.code === "Digit4") cameraMode = 4;
    if (event.code === "Digit5") cameraMode = 5;
    if (event.code === "Digit6") cameraMode = 6;

    if (event.repeat) return;

    if (event.code === "KeyG") triggerAircraftAnimation("gear");
    if (event.code === "KeyF") triggerAircraftAnimation("flaps");
    if (event.code === "KeyA") triggerAircraftAnimation("ailerons");
    if (event.code === "KeyB") triggerAircraftAnimation("airbrakes");
    if (event.code === "KeyD") triggerAircraftAnimation("doors");
    if (event.code === "KeyP") triggerAircraftAnimation("pushback");

});


console.log("✔ AeroVerse Engine Initialized");
/* ==========================================================
   PART 2
   AeroVerse HUD
========================================================== */

const aeroHUD = document.createElement("div");

aeroHUD.innerHTML = `

<div id="topHUD">
<div id="bottomHUD">

    <div class="barGroup">

        <div class="barLabel">
            THROTTLE
        </div>

        <div class="bar">

            <div id="throttleBar"></div>

        </div>

    </div>

    <div class="barGroup">

        <div class="barLabel">
            SPEED
        </div>

        <div class="bar">

            <div id="speedBar"></div>

        </div>

    </div>

</div>
    <div class="hudBox">
        <div class="label">SPD</div>
        <div id="hudSpeed">0</div>
    </div>

    <div class="hudBox">
        <div class="label">ALT</div>
        <div id="hudAlt">0</div>
    </div>

    <div class="hudBox">
        <div class="label">HDG</div>
        <div id="hudHeading">000</div>
    </div>

    <div class="hudBox">
        <div class="label">VS</div>
        <div id="hudVS">0</div>
    </div>

    <div class="hudBox">
        <div class="label">THR</div>
        <div id="hudThrottle">0%</div>
    </div>

    <div class="hudBox">
        <div class="label">FPS</div>
        <div id="hudFPS">0</div>
    </div>
<div class="hudBox">
    <div class="label">ENG</div>
    <div id="hudEngine">OFF</div>
</div>
</div>

<div id="horizonContainer">

    <button id="toggleHorizon">−</button>

    <canvas id="horizonCanvas"></canvas>

</div>

<div id="miniMapContainer">

    <button id="toggleMiniMap">−</button>
    <div class="miniMapLabel">MAP</div>
    <canvas id="miniMapCanvas" width="220" height="220"></canvas>

</div>

`;

/* IMPORTANT
   Append BEFORE querying elements
*/
document.body.appendChild(aeroHUD);


/* ==========================================================
   HUD STYLE
========================================================== */

const style = document.createElement("style");

style.textContent = `

body{
    margin:0;
    overflow:hidden;
    font-family:Arial,Helvetica,sans-serif;
}

/* -------------------------- */
/* TOP HUD */
/* -------------------------- */

#topHUD{

    position:fixed;

    top:15px;

    left:50%;

    transform:translateX(-50%);

    display:flex;

    gap:18px;

    padding:14px 18px;

    background:rgba(15,20,30,.55);

    backdrop-filter:blur(14px);

    border-radius:18px;

    border:1px solid rgba(255,255,255,.12);

    color:white;

    z-index:1000;

}

.hudBox{

    min-width:80px;

    text-align:center;

}

.label{

    font-size:11px;

    opacity:.65;

    letter-spacing:1px;

}

.hudBox div:last-child{

    margin-top:4px;

    font-size:22px;

    color:#00ffff;

    font-weight:bold;

}


/* -------------------------- */
/* Artificial Horizon */
/* -------------------------- */

#horizonContainer{

    position:fixed;

    bottom:20px;

    right:20px;

    width:250px;

    height:250px;

    overflow:hidden;

    border-radius:20px;

    background:rgba(15,20,30,.55);

    backdrop-filter:blur(14px);

    border:1px solid rgba(255,255,255,.12);

    transition:.25s;

    z-index:1000;

}

#toggleHorizon{

    position:absolute;

    top:10px;

    right:10px;

    width:30px;

    height:30px;

    border:none;

    border-radius:8px;

    background:#111;

    color:white;

    cursor:pointer;

    z-index:20;

}

#toggleHorizon:hover{

    background:#222;

}

#horizonCanvas{

    width:100%;

    height:100%;

    display:block;

}

#miniMapContainer{

    position:fixed;

    left:100px;
    top:20px;          /* just below the top HUD */

    width:220px;
    height:220px;

    padding:10px;

    border-radius:14px;

    background:rgba(10,15,25,.72);

    border:1px solid rgba(255,255,255,.12);

    box-shadow:0 10px 30px rgba(0,0,0,.28);

    z-index:1300;

    transition:
        width .18s ease,
        height .18s ease,
        opacity .18s ease;

}
#miniMapContainer.minimized{

    width:42px;
    height:42px;

    overflow:hidden;

}
#miniMapContainer.minimized #miniMapCanvas,
#miniMapContainer.minimized .miniMapLabel{

    display:none;

}

#toggleMiniMap{

    position:absolute;

    top:8px;
    right:8px;

    width:24px;
    height:24px;

    border:none;

    border-radius:8px;

    background:#111;

    color:white;

    cursor:pointer;

    z-index:20;

}

#toggleMiniMap:hover{

    background:#222;

}

.miniMapLabel{

    position:absolute;

    top:8px;
    left:10px;

    font-size:11px;

    letter-spacing:1px;

    color:#7fdfff;

    opacity:.9;

}
#miniMapCanvas{

    width:100%;

    height:100%;

    display:block;

    border-radius:10px;

}

`;

document.head.appendChild(style);


/* ==========================================================
   ARTIFICIAL HORIZON
========================================================== */

const horizonCanvas = document.getElementById("horizonCanvas");

const hctx = horizonCanvas.getContext("2d");

/*
Use the internal drawing resolution.
CSS controls displayed size.
*/

horizonCanvas.width = 250;
horizonCanvas.height = 250;

let horizonVisible = true;


/* ==========================================================
   TOGGLE BUTTON
========================================================== */

document
.getElementById("toggleHorizon")
.addEventListener("click", () => {

    const container =
        document.getElementById("horizonContainer");

    horizonVisible = !horizonVisible;

    if(horizonVisible){

        container.style.width = "250px";
        container.style.height = "250px";

        document.getElementById("toggleHorizon").textContent = "−";

    }
    else{

        container.style.width = "40px";
        container.style.height = "40px";

        document.getElementById("toggleHorizon").textContent = "+";

    }

});

/* ==========================================================
   MINI MAP TOGGLE
========================================================== */

document
.getElementById("toggleMiniMap")
.addEventListener("click", () => {

    miniMapVisible = !miniMapVisible;

    if (miniMapVisible) {

        miniMapContainer.classList.remove("minimized");
        document.getElementById("toggleMiniMap").textContent = "−";

    }
    else {

        miniMapContainer.classList.add("minimized");
        document.getElementById("toggleMiniMap").textContent = "+";

    }

});


/* ==========================================================
   HUD REFERENCES
========================================================== */

const hudSpeed =
document.getElementById("hudSpeed");

const hudAlt =
document.getElementById("hudAlt");

const hudHeading =
document.getElementById("hudHeading");

const hudVS =
document.getElementById("hudVS");

const hudThrottle =
document.getElementById("hudThrottle");

const hudFPS =
document.getElementById("hudFPS");

const hudEngine =
document.getElementById("hudEngine");

const miniMapCanvas =
document.getElementById("miniMapCanvas");

const miniMapContainer =
document.getElementById("miniMapContainer");

const mctx = miniMapCanvas.getContext("2d");

let miniMapVisible = true;

console.log("✔ AeroVerse HUD Loaded");
/* ==========================================================
   PART 3
   Lighting + Terrain + Airport
========================================================== */


/* ==========================================================
   LIGHTING
========================================================== */

const ambientLight = new THREE.AmbientLight(
    0xffffff,
    1.5
);

scene.add(ambientLight);
 




const sun = new THREE.DirectionalLight(
    0xffffff,
    2.5
);

sun.position.set(
    200,
    300,
    100
);

sun.castShadow = true;

sun.shadow.mapSize.width = 4096;
sun.shadow.mapSize.height = 4096;

sun.shadow.camera.left = -500;
sun.shadow.camera.right = 500;
sun.shadow.camera.top = 500;
sun.shadow.camera.bottom = -500;

sun.shadow.camera.near = 1;
sun.shadow.camera.far = 1000;

scene.add(sun);


/* ==========================================================
   TERRAIN
========================================================== */

const terrainSize = 60000;
const terrainSegments = 500;
const SEA_LEVEL = 0;

const terrainGeometry = new THREE.PlaneGeometry(
    terrainSize,
    terrainSize,
    terrainSegments,
    terrainSegments
);

terrainGeometry.rotateX(-Math.PI / 2);

const oceanMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1b5ea8,
    emissive: 0x0a2442,
    emissiveIntensity: 0.45,
    metalness: 0.08,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.25,
    transmission: 0.12,
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide
});

const terrain = new THREE.Mesh(
    terrainGeometry,
    oceanMaterial
);

terrain.receiveShadow = true;
terrain.position.y = SEA_LEVEL;
scene.add(terrain);

/* ==========================================================
   ISLAND DATA
========================================================== */

const islands = [
    { x: -18000, z: -18000 },
    { x:  18000, z: -18000 },
    { x: -18000, z:  18000 },
    { x:  18000, z:  18000 },
    { x:      0, z:      0 }
];

/* ==========================================================
   GENERATE TERRAIN
========================================================== */

const vertices = terrainGeometry.attributes.position;

for (let i = 0; i < vertices.count; i++) {

    const x = vertices.getX(i);
    const z = vertices.getZ(i);

    let height = SEA_LEVEL;

    for (const island of islands) {

        const dx = x - island.x;
        const dz = z - island.z;

        const dist = Math.sqrt(dx * dx + dz * dz);

        const radius = 4500;

        if (dist < radius) {

            const h =
                Math.cos((dist / radius) * Math.PI / 2) * 250;

            if (h > height)
                height = h;
        }
    }

    vertices.setY(i, height);
}

vertices.needsUpdate = true;
terrainGeometry.computeVertexNormals();

/* ==========================================================
   TERRAIN HEIGHT FUNCTION
========================================================== */

function getTerrainHeight(x, z) {

    let height = SEA_LEVEL;

    for (const island of islands) {

        const dx = x - island.x;
        const dz = z - island.z;

        const dist = Math.sqrt(dx * dx + dz * dz);

        const radius = 4500;

        if (dist < radius) {

            const h =
                Math.cos((dist / radius) * Math.PI / 2) * 250;

            if (h > height)
                height = h;
        }
    }

    return height;
}

/* ==========================================================
   FUTURISTIC AIRPORT
========================================================== */

try {

    createFuturisticAirport(

        scene,

        THREE

    );

    console.log("✔ Airport Loaded");

}

catch (error) {

    console.warn(

        "Airport module not loaded.",

        error

    );

}


/* ==========================================================
   OPTIONAL GRID (Development)
========================================================== */

// Uncomment while debugging terrain

/*

const grid = new THREE.GridHelper(

    10000,

    200,

    0x444444,

    0x333333

);

scene.add(grid);

*/


/* ==========================================================
   WORLD SETTINGS
========================================================== */

scene.fog = new THREE.Fog(

    0x87ceeb,

    500,

    6000

);


/* ==========================================================
   WORLD READY
========================================================== */

console.log("✔ Terrain Generated");

console.log("✔ Lighting Ready");

console.log("✔ World Initialized");
/* ==========================================================
   PART 4
   Aircraft Loading System
========================================================== */


/* ==========================================================
   AIRCRAFT SPAWN
========================================================== */


let worldMap = null;

loader.load("/models/MAPS.glb",

    (gltf) => {

        worldMap = gltf.scene;

        worldMap.traverse((child) => {

            if (child.isMesh) {

                child.castShadow = true;
                child.receiveShadow = true;

            }

        });

        scene.add(worldMap);
        worldMap.traverse((child) => {

    if (child.isMesh) {

        child.geometry.computeBoundsTree();

        child.castShadow = true;
        child.receiveShadow = true;

    }

});
worldMap.position.set(0, 490, 0);
        console.log("✔ World Map Loaded");

    },
    

    undefined,

    (error) => {

        console.error("Map failed to load", error);

    }

);

/* ==========================================================
   LOAD AIRCRAFT
========================================================== */

loader.load(

    "/models/Airplane.glb",

    (gltf) => {

        aircraft = gltf.scene;

/* ==========================================================
   FIND LANDING GEAR
========================================================== */



aircraft.traverse((child) => {

    const name = child.name.toLowerCase();

    if (name.includes("nose"))
        noseWheel = child;

    if (name.includes("left"))
        leftWheel = child;

    if (name.includes("right"))
        rightWheel = child;

});

        aircraft.traverse((child) => {

            if (child.isMesh) {

                child.castShadow = true;
                child.receiveShadow = true;

            }

        });

        /* =====================================
           AUTO SCALE
        ===================================== */

        const box = new THREE.Box3().setFromObject(
            aircraft
        );

        const size = box.getSize(
            new THREE.Vector3()
        );

        const maxDimension = Math.max(

            size.x,
            size.y,
            size.z

        );

        const desiredSize = 15;

        const scale =
            desiredSize / maxDimension;

        aircraft.scale.setScalar(scale);


        /* =====================================
           CENTER MODEL
        ===================================== */

        const newBox =
            new THREE.Box3().setFromObject(
                aircraft
            );

        const center =
            newBox.getCenter(
                new THREE.Vector3()
            );

        aircraft.position.set(

            -center.x,

            -newBox.min.y,

            -center.z

        );


        /* =====================================
           FACE FORWARD
        ===================================== */

        aircraft.rotation.y = Math.PI;


        /* =====================================
           ATTACH TO FLIGHT HIERARCHY
        ===================================== */

        rollPivot.add(aircraft);

        /* ==========================================================
   Landing Gear References
========================================================== */


aircraft.traverse((child) => {

    console.log(
        child.name,
        child.type
    );

});

        /* =====================================
           ANIMATION MIXER
        ===================================== */

        if (gltf.animations?.length) {

            aircraftMixer = new THREE.AnimationMixer(aircraft);

            const baseClip = gltf.animations[0];

            const animationCategories = [
                {
                    name: "gear",
                    pattern: /landgear|gearcowl|frontlanding|backlandgear/
                },
                {
                    name: "doors",
                    pattern: /door|taildoor|backdoor/
                },
                {
                    name: "flaps",
                    pattern: /flaps/
                },
                {
                    name: "ailerons",
                    pattern: /aileron/
                },
                {
                    name: "airbrakes",
                    pattern: /airbreak/
                },
                {
                    name: "pushback",
                    pattern: /pushback|insidepushback/
                }
            ];

            for (const category of animationCategories) {

                const tracks = baseClip.tracks.filter((track) =>
                    category.pattern.test(track.name) &&
                    !/scale/i.test(track.name)
                );

                if (!tracks.length) continue;

                const clip = new THREE.AnimationClip(
                    category.name,
                    baseClip.duration,
                    tracks
                );

                const action = aircraftMixer.clipAction(clip);
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
                aircraftAnimationActions.set(category.name, action);

            }

            console.log(
                "✔ Aircraft Animations Mapped:",
                Array.from(aircraftAnimationActions.keys()).join(", ")
            );

        }

        console.log("✔ Aircraft Loaded");

aircraft.traverse((child)=>{

    console.log(child.name);

});

    },


    /* =====================================
       LOADING
    ===================================== */

    (xhr) => {

        const percent =

            (
                xhr.loaded /
                xhr.total
            ) * 100;

        console.log(
            "Aircraft:",
            percent.toFixed(0) + "%"
        );

    },


    /* =====================================
       ERROR
    ===================================== */

    (error) => {

        console.error(
            "Aircraft failed to load",
            error
        );

    }

);


/* ==========================================================
   FLIGHT SETTINGS
========================================================== */

const turnSpeed = 0.020;

const maxRoll = 0.80;

const maxPitch = 0.45;

const gravity = 0.002;

const liftStrength = 0.004;

/* ==========================================================
   GROUND PHYSICS
========================================================== */


let noseWheelAngle = 0;

let suspensionCompression = 0;

const MAX_NOSE_STEER = 0.55;

const TAXI_TURN_SPEED = 0.015;

const BRAKE_FORCE = 0.012;

const GROUND_FRICTION = 0.004;


/* ==========================================================
   RESET FUNCTION
========================================================== */

function resetAircraft(){

    aircraftRoot.position.set(

        0,

        80,

        0

    );

    yaw = Math.PI;

    pitch = 0;

    roll = 0;

    speed = 0.15;

    verticalSpeed *= 0.25;

}


/* ==========================================================
   RESET KEY
========================================================== */

window.addEventListener(

    "keydown",

    (event)=>{

        if(event.code==="KeyR"){

            resetAircraft();

        }

    }

);


console.log("✔ Aircraft System Ready");
/* ==========================================================
   PART 5
   Aircraft Loading
========================================================== */

/* ==========================================================
   LOAD AIRCRAFT MODEL
========================================================== */



/* ==========================================================
   INITIAL AIRCRAFT POSITION
========================================================== */



/* ==========================================================
   INITIAL FLIGHT VALUES
========================================================== */

speed = 0.15;

yaw = Math.PI;

pitch = 0;

roll = 0;

verticalSpeed *= 0.25;


/* ==========================================================
   AIRCRAFT READY
========================================================== */

console.log("✔ Aircraft System Initialized");
/* ==========================================================
   PART 6
   Flight Physics
========================================================== */

/* ==========================================================
   FLIGHT SETTINGS
========================================================== */




/* ==========================================================
   FLIGHT UPDATE
========================================================== */

function updateFlight() {
    updateLandingGear();
    
/* ==========================================================
   Landing Gear Update
========================================================== */
const groundHeight = getTerrainHeight(
    aircraftRoot.position.x,
    aircraftRoot.position.z
);
function updateLandingGear(){

    const ground =
        getTerrainHeight(
            aircraftRoot.position.x,
            aircraftRoot.position.z
        );


    //--------------------------------------------------
    // Suspension
    //--------------------------------------------------

    if(onGround){

        gearCompression = THREE.MathUtils.lerp(

            gearCompression,

            MAX_GEAR_COMPRESSION,

            SUSPENSION_SPEED

        );

    }
    else{

        gearCompression = THREE.MathUtils.lerp(

            gearCompression,

            0,

            SUSPENSION_SPEED

        );

    }

    //--------------------------------------------------
    // Compress Aircraft
    //--------------------------------------------------

    if(aircraft){

        aircraft.position.y =

            -gearCompression;

    }
 
    //--------------------------------------------------
    // Wheel Spin
    //--------------------------------------------------

    wheelRotation += speed / WHEEL_RADIUS;

    if(leftWheel)
        leftWheel.rotation.x = wheelRotation;

    if(rightWheel)
        rightWheel.rotation.x = wheelRotation;

    if(noseWheel)
        noseWheel.rotation.x = wheelRotation;

}
    /* --------------------------------------------------
       Mouse Flight Controls
    -------------------------------------------------- */

    yaw -= mouse.x * turnSpeed;

/* --------------------------------------------------
   Taxi Steering
-------------------------------------------------- */

if (onGround && speed < 0.9) {

    yaw -= mouse.x * TAXI_TURN_SPEED;

}

noseWheelAngle = THREE.MathUtils.lerp(

    noseWheelAngle,

    mouse.x * MAX_NOSE_STEER,

    0.08

);

    pitch = THREE.MathUtils.lerp(
        pitch,
        -mouse.y * maxPitch,
        0.08
    );

    roll = THREE.MathUtils.lerp(
        roll,
        -mouse.x * maxRoll,
        0.08
    );

    yawPivot.rotation.y = yaw;
    pitchPivot.rotation.x = pitch;
    rollPivot.rotation.z = roll;

    updateControlSurfaces();
    
    /* --------------------------------------------------
       Aircraft Direction
    -------------------------------------------------- */

    const direction = new THREE.Vector3(
        0,
        0,
        -1
    );

    const worldQuaternion =
        new THREE.Quaternion();

    rollPivot.getWorldQuaternion(
        worldQuaternion
    );

    direction.applyQuaternion(
        worldQuaternion
    );

    /* --------------------------------------------------
       Forward Movement
    -------------------------------------------------- */

    if (engineOn) {

    aircraftRoot.position.addScaledVector(
        direction,
        speed
    );


if (aircraftRoot.position.y < groundHeight + 2) {
    aircraftRoot.position.y = groundHeight + 2;
}
}

    /* --------------------------------------------------
   Lift
-------------------------------------------------- */

const lift = liftStrength * speed * speed;



if (!onGround && engineOn) {

    verticalSpeed +=
        Math.sin(pitch) *
        liftStrength *
        speed;

}
else if (
    onGround &&
    speed > 1.2 &&
    mouse.y > 0.2
) {

    pitch = THREE.MathUtils.lerp(
        pitch,
        0.16,
        0.02
    );

}
    /* --------------------------------------------------
   Stall Physics
-------------------------------------------------- */

const stallSpeed = 0.45;
const stallPitch = 0.35; // about 20°

const isStalling =
    speed < stallSpeed &&
    pitch > stallPitch;

if (isStalling) {

    // Lose lift
    verticalSpeed -= 0.02;

    // Lose airspeed
    speed -= 0.004;

    // Keep speed within limits
    speed = Math.max(speed, MIN_SPEED);

}
    
    /* --------------------------------------------------
       Gravity
    -------------------------------------------------- */

    verticalSpeed -= gravity;

    /* --------------------------------------------------
       Air Drag
    -------------------------------------------------- */

    verticalSpeed *= 0.98;

    aircraftRoot.position.y +=
        verticalSpeed;


const clearance = 2;

// True only if we're over an island
const overLand = groundHeight > 0;

if (overLand) {

    if (aircraftRoot.position.y <= groundHeight + clearance) {

        aircraftRoot.position.y = groundHeight + clearance;

        verticalSpeed *= 0.25;

        suspensionCompression = THREE.MathUtils.lerp(

    suspensionCompression,

    0.3,

    0.15

);

if (aircraft) {

    aircraft.position.y =

        -suspensionCompression;

}

        pitch = THREE.MathUtils.lerp(
    pitch,
    -0.03,
    0.08
);

roll *= 0.93;

        // Rolling friction
        if (speed > 0) {

         speed -= GROUND_FRICTION;

            if (speed < 0)
                speed = 0;

        }

    }

}
    /* --------------------------------------------------
       Crash Detection
    -------------------------------------------------- */

    // ------------------------------------------------
    // WATER COLLISION
    // ------------------------------------------------

    if (!overLand && aircraftRoot.position.y < SEA_LEVEL) {

        const submergeDepth = SEA_LEVEL - aircraftRoot.position.y;

        if (submergeDepth >= DROWN_THRESHOLD) {

            if (!aircraftDrowned) {

                aircraftDrowned = true;
                engineOn = false;
                engineStarting = false;
                speed = 0;
                verticalSpeed *= 0.25;

                console.log("Aircraft Drowned");

            }

            aircraftRoot.position.y -= 0.35;
            return;

        }

        console.log("SPLASH!");

        aircraftRoot.position.y = SEA_LEVEL;
        verticalSpeed *= 0.25;
        speed = Math.max(speed - 0.02, 0);

    }
/* --------------------------------------------------
   Throttle & Engine Physics
-------------------------------------------------- */

// Throttle only works if engine is running
if (engineOn) {

    if (keys["KeyW"])
        throttle += 0.01;

    if (keys["KeyS"])
        throttle -= 0.01;



throttle = THREE.MathUtils.clamp(throttle, 0, 1);

const targetSpeed = throttle * MAX_SPEED;

speed = THREE.MathUtils.lerp(
    speed,
    targetSpeed,
    0.01
);

} else {

    // Engine OFF glide physics

    // Base air drag
    speed -= 0.0015;

    if (pitch > 0) {

        // Nose up = lose speed quickly
        speed -= pitch * 0.02;

    } else {

        // Nose down = gravity increases speed
        speed += (-pitch) * 0.008;

    }

}

// Keep speed within limits
speed = THREE.MathUtils.clamp(
    speed,
    0,
    MAX_SPEED
);
    /* --------------------------------------------------
       Update Camera
       (Implemented in Part 7)
    -------------------------------------------------- */

    updateCamera(

        direction,

        worldQuaternion

    );

}


/* ==========================================================
   FLIGHT SYSTEM READY
========================================================== */

console.log("✔ Flight Physics Ready");

console.log("Controls");

console.log("Mouse  : Fly");

console.log("W / S  : Throttle");

console.log("1-6    : Camera Modes");
 

/* ==========================================================
   PART 7
   Camera System
========================================================== */

/* ==========================================================
   CAMERA SETTINGS
========================================================== */

const chaseOffset = new THREE.Vector3(
    0,
    3,
    12
);


/* ==========================================================
   WINDOW RESIZE
========================================================== */

window.addEventListener("resize", () => {

    camera.aspect =
        window.innerWidth /
        window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

});

if (!onGround && aircraft) {

    suspensionCompression = THREE.MathUtils.lerp(

        suspensionCompression,

        0,

        0.08

    );

    aircraft.position.y =

        -suspensionCompression;

}

/* ==========================================================
   CAMERA UPDATE
========================================================== */

function updateCamera(
    direction,
    worldQuaternion
) {

    switch (cameraMode) {

        /* =====================================
           1. FREE CAMERA
        ===================================== */

        case 1:

            controls.enabled = true;

            controls.target.lerp(

                aircraftRoot.position,

                0.08

            );

            controls.update();

            break;

        /* =====================================
           2. CHASE CAMERA
        ===================================== */
case 2: {

    controls.enabled = false;

    // Fixed camera distance
    const cameraOffset = new THREE.Vector3(
        0,
        5,
        12
    );

    // Follow the aircraft orientation
    const aircraftRotation = new THREE.Quaternion();
    yawPivot.getWorldQuaternion(aircraftRotation);

    cameraOffset.applyQuaternion(aircraftRotation);

    // Desired camera position
    const targetPosition = aircraftRoot.position
        .clone()
        .add(cameraOffset);

    // Fast smooth follow
    /*camera.position.lerp(
        targetPosition,
        0.40,
    );*/
    camera.position.copy(targetPosition);

    // Look slightly ahead of the aircraft
    const lookTarget = aircraftRoot.position
        .clone()
        .add(
            direction.clone().multiplyScalar(50)
        );

    camera.lookAt(lookTarget);

    break;
}
        /* =====================================
   3. COCKPIT CAMERA (FPV)
===================================== */
case 3: {

    controls.enabled = false;

    // Pilot seat position inside aircraft
    const cockpitOffset = new THREE.Vector3(
        -0.18,
        1.25,
        -4.98,
    );

    // Aircraft world transform
    const worldQuat = new THREE.Quaternion();
    const worldPos = new THREE.Vector3();

    rollPivot.getWorldQuaternion(worldQuat);
    rollPivot.getWorldPosition(worldPos);

    // Rotate the cockpit offset into world space
    cockpitOffset.applyQuaternion(worldQuat);

    // Final camera position
    camera.position.copy(worldPos).add(cockpitOffset);

    // Camera rotates exactly with aircraft
    camera.quaternion.copy(worldQuat);

    break;
}
        /* =====================================
           4. TOP CAMERA
        ===================================== */

        case 4:

            controls.enabled = false;

            camera.position.lerp(

                aircraftRoot.position
                    .clone()
                    .add(

                        new THREE.Vector3(
                            0,
                            40,
                            0
                        )

                    ),

                0.08

            );

            camera.lookAt(
                aircraftRoot.position
            );

            break;

        /* =====================================
           5. WING CAMERA
        ===================================== */

        case 5: {

            controls.enabled = false;

            const offset = new THREE.Vector3(
    CAMERA_SETTINGS.wingLeft.x,
    CAMERA_SETTINGS.wingLeft.y,
    CAMERA_SETTINGS.wingLeft.z
);

            offset.applyQuaternion(
                worldQuaternion
            );

            camera.position.copy(

                aircraftRoot.position
                    .clone()
                    .add(offset)

            );

            camera.lookAt(

                aircraftRoot.position
                    .clone()
                    .add(

                        direction
                            .clone()
                            .multiplyScalar(100)

                    )

            );

            break;

        }

    

       /* =====================================
   6. RIGHT WING CAMERA
===================================== */

case 6: {

    controls.enabled = false;

const offset = new THREE.Vector3(
    CAMERA_SETTINGS.wingRight.x,
    CAMERA_SETTINGS.wingRight.y,
    CAMERA_SETTINGS.wingRight.z
);

    offset.applyQuaternion(worldQuaternion);

    camera.position.copy(
        aircraftRoot.position
            .clone()
            .add(offset)
    );

    camera.lookAt(
        aircraftRoot.position
            .clone()
            .add(
                direction.clone().multiplyScalar(100)
            )
    );

    break;
}

    }
}


/* ==========================================================
   CAMERA SYSTEM READY
========================================================== */

console.log("✔ Camera System Ready");

console.log("1 : Free Camera");
console.log("2 : Chase Camera");
console.log("3 : Cockpit Camera");
console.log("4 : Top Camera");
console.log("5 : Left Wing Camera");
console.log("6 : Right Wing Camera");

/* ==========================================================
   PART 8A
   Dynamic Sky System
========================================================== */

/* ==========================================================
   TIME SYSTEM
========================================================== */

let timeOfDay = 0;

/*
   One complete day cycle
   ≈ 6 minutes
*/

const daySpeed = 0.00008;


/* ==========================================================
   SKY COLORS
========================================================== */

const dawnColor = new THREE.Color(
    0xffb36b
);

const noonColor = new THREE.Color(
    0x87ceeb
);

const sunsetColor = new THREE.Color(
    0xff7f50
);

const nightColor = new THREE.Color(
    0x07142a
);


/* ==========================================================
   FOG
========================================================== */

scene.fog = new THREE.Fog(

    0x87ceeb,

    500,

    6000

);


/* ==========================================================
   CLOUD SYSTEM
========================================================== */

const clouds = [];


/* ==========================================================
   CLOUD MATERIAL
========================================================== */

const cloudMaterial = new THREE.MeshStandardMaterial({

    color: 0xffffff,

    roughness: 1,

    metalness: 0

});


/* ==========================================================
   GENERATE CLOUDS
========================================================== */

for (let i = 0; i < 150; i++) {

    const cloud = new THREE.Group();

    const pieces =
        THREE.MathUtils.randInt(
            5,
            10
        );

    for (let j = 0; j < pieces; j++) {

        const cloudPart = new THREE.Mesh(

            new THREE.SphereGeometry(

                THREE.MathUtils.randFloat(
                    6,
                    16
                ),

                12,
                12

            ),

            cloudMaterial

        );

        cloudPart.position.set(

            THREE.MathUtils.randFloatSpread(35),

            THREE.MathUtils.randFloatSpread(12),

            THREE.MathUtils.randFloatSpread(35)

        );

        cloudPart.castShadow = true;
        cloudPart.receiveShadow = true;

        cloud.add(cloudPart);

    }

    cloud.position.set(

        THREE.MathUtils.randFloatSpread(7000),

        THREE.MathUtils.randFloat(
            120,
            600
        ),

        THREE.MathUtils.randFloatSpread(7000)

    );

    cloud.userData.speed =

        THREE.MathUtils.randFloat(

            0.05,

            0.25

        );

    scene.add(cloud);

    clouds.push(cloud);

}


/* ==========================================================
   SKY READY
========================================================== */

console.log(
    "✔ Dynamic Sky Initialized"
);

console.log(
    "✔ Clouds Generated:",
    clouds.length
);
/* ==========================================================
   PART 8B
   Dynamic Sky Updates
========================================================== */


/* ==========================================================
   SUN MOVEMENT
========================================================== */

function updateSky() {

    /* ------------------------------------
       Advance Time
    ------------------------------------ */

    timeOfDay += daySpeed;

    if (timeOfDay > 1)
        timeOfDay = 0;

    /* ------------------------------------
       Sun Rotation
    ------------------------------------ */

    const angle =
        timeOfDay *
        Math.PI *
        2;

    sun.position.x =
        Math.cos(angle) * 500;

    sun.position.y =
        Math.sin(angle) * 500;

    sun.position.z = 200;

    /* ------------------------------------
       Daylight Amount
    ------------------------------------ */

    const daylight = Math.max(

        Math.sin(angle),

        0

    );

    /* ------------------------------------
       Light Intensity
    ------------------------------------ */

    sun.intensity =

        0.2 +

        daylight * 2.5;

    ambientLight.intensity =

        0.4 +

        daylight;

    /* ------------------------------------
       Sky Color
    ------------------------------------ */

    let targetSky;

    if (daylight > 0.75) {

        targetSky = noonColor;

    }
    else if (daylight > 0.35) {

        targetSky = dawnColor;

    }
    else if (daylight > 0.05) {

        targetSky = sunsetColor;

    }
    else {

        targetSky = nightColor;

    }

    scene.background.lerp(
        targetSky,
        0.01
    );

    scene.fog.color.lerp(
        targetSky,
        0.01
    );

}


/* ==========================================================
   CLOUD MOVEMENT
========================================================== */

function updateClouds() {

    for (const cloud of clouds) {

        cloud.position.x +=
            cloud.userData.speed;

        if (cloud.position.x > 4000) {

            cloud.position.x = -4000;

        }

    }

}


/* ==========================================================
   ENVIRONMENT UPDATE
========================================================== */

function drawMiniMap() {

    if (!miniMapCanvas || !mctx) return;

    const width = miniMapCanvas.width;
    const height = miniMapCanvas.height;
    const scale = width / 60000;

    mctx.clearRect(0, 0, width, height);

    mctx.fillStyle = "rgba(6, 15, 28, 0.92)";
    mctx.fillRect(0, 0, width, height);

    mctx.strokeStyle = "rgba(255,255,255,0.12)";
    mctx.lineWidth = 1;

    for (let i = 1; i < 6; i++) {

        mctx.beginPath();
        mctx.moveTo(0, (height / 6) * i);
        mctx.lineTo(width, (height / 6) * i);
        mctx.stroke();

        mctx.beginPath();
        mctx.moveTo((width / 6) * i, 0);
        mctx.lineTo((width / 6) * i, height);
        mctx.stroke();

    }

    const mapCenterX = width / 2;
    const mapCenterY = height / 2;

    islands.forEach((island) => {

        const px = mapCenterX + island.x * scale;
        const py = mapCenterY + island.z * scale;

        const radius = 38;

        mctx.fillStyle = "#44d37a";
        mctx.beginPath();
        mctx.arc(px, py, radius, 0, Math.PI * 2);
        mctx.fill();

    });

    const planeX = mapCenterX + aircraftRoot.position.x * scale;
    const planeY = mapCenterY + aircraftRoot.position.z * scale;

    mctx.strokeStyle = "#00f0ff";
    mctx.lineWidth = 2.5;
    mctx.beginPath();
    mctx.arc(planeX, planeY, 6, 0, Math.PI * 2);
    mctx.stroke();

    mctx.fillStyle = "#00f0ff";
    mctx.beginPath();
    mctx.moveTo(planeX, planeY - 10);
    mctx.lineTo(planeX + 7, planeY + 8);
    mctx.lineTo(planeX - 7, planeY + 8);
    mctx.closePath();
    mctx.fill();

}

function updateEnvironment() {

    updateSky();

    updateClouds();

    drawMiniMap();

}


/* ==========================================================
   ENVIRONMENT READY
========================================================== */

console.log("✔ Dynamic Sky Ready");
console.log("✔ Day / Night Cycle Active");
console.log("✔ Cloud Animation Active");
/* ==========================================================
   PART 9
   Main Animation Loop
========================================================== */


/* ==========================================================
   FPS SYSTEM
========================================================== */

let lastTime = performance.now();

function updateTerrainCollision() {

    if (!worldMap) return;

    terrainRay.set(

        aircraftRoot.position.clone().add(new THREE.Vector3(0, 1000, 0)),
        DOWN

    );

    const hits = terrainRay.intersectObject(worldMap, true);

    if (hits.length === 0) return;

    const groundHeight = hits[0].point.y;

    const clearance = aircraftRoot.position.y - groundHeight;

    // Prevent aircraft going underground

    if (clearance < 0) {

        aircraftRoot.position.y = groundHeight;

    }

}

/* ==========================================================
   ANIMATION LOOP
========================================================== */

function animate() {

 
    requestAnimationFrame(
        animate
    );


    /* ------------------------------------
       FPS Calculation
    ------------------------------------ */

    const now =
        performance.now();


    const fps =
        1000 /
        (now - lastTime);

    const deltaSeconds =
        Math.min(
            (now - lastTime) / 1000,
            0.05
        );

    lastTime = now;



    if (hudFPS) {

        hudFPS.innerHTML =
            Math.round(fps);

    }



    /* ------------------------------------
       Flight Update
    ------------------------------------ */

    updateFlight();
if (noseWheel) {

    noseWheel.rotation.y = noseWheelAngle;

}
 
updateControlSurfaces();

    if (aircraftMixer) {

        aircraftMixer.update(deltaSeconds);

    }

    /* ------------------------------------
       Sky + Clouds
    ------------------------------------ */

    updateEnvironment();

/* ------------------------------------
   Engine Annunciator Blink
------------------------------------ */

if (engineStarting) {

    if (now - lastBlinkTime > 300) {

        engineBlink = !engineBlink;
        lastBlinkTime = now;

    }

} else {

    engineBlink = false;

}

    /* ------------------------------------
       HUD DATA
    ------------------------------------ */


    if (hudSpeed) {

     hudSpeed.innerHTML =
    Math.round(speed * SPEED_DISPLAY_SCALE);

    }


    if (hudAlt) {

        hudAlt.innerHTML =
            Math.round(
                aircraftRoot.position.y
            );

    }


    if (hudHeading) {

        hudHeading.innerHTML =

            Math.round(

                (
                    yaw *
                    180 /
                    Math.PI

                )
                %
                360

                + 360

            )
            %
            360;

    }


    if (hudVS) {

        hudVS.innerHTML =
            Math.round(
                verticalSpeed * 5000
            );

    }

 

  if (hudThrottle) {
hudThrottle.innerHTML =
Math.round(throttle * 100) + "%";

}

if (hudEngine) {

    if (engineStarting) {

        hudEngine.innerHTML =
            engineBlink ? "START" : "";

        hudEngine.style.color = "#ffcc00";

    }
    else if (engineOn) {

        hudEngine.innerHTML = "RUN";
        hudEngine.style.color = "#00ff66";

    }
    else {

        hudEngine.innerHTML = "OFF";
        hudEngine.style.color = "#ff3333";

    }

}
    /* ------------------------------------
       Artificial Horizon
    ------------------------------------ */

    if (horizonVisible) {


        const width = 250;

        const height = 250;


        hctx.clearRect(

            0,

            0,

            width,

            height

        );


        hctx.save();



        hctx.translate(

            width / 2,

            height / 2

        );


        /* Roll */

        hctx.rotate(
            roll
        );



        /* Pitch */

        const pitchOffset =
            pitch * 120;



        /* Sky */

        hctx.fillStyle =
            "#61b8ff";


        hctx.fillRect(

            -300,

            -300 + pitchOffset,

            600,

            300

        );



        /* Ground */

        hctx.fillStyle =
            "#7c5a34";


        hctx.fillRect(

            -300,

            pitchOffset,

            600,

            300

        );



        /* Horizon Line */

        hctx.strokeStyle =
            "white";


        hctx.lineWidth =
            3;



        hctx.beginPath();


        hctx.moveTo(

            -300,

            pitchOffset

        );


        hctx.lineTo(

            300,

            pitchOffset

        );


        hctx.stroke();



        hctx.restore();



        /* Aircraft Marker */

        hctx.strokeStyle =
            "white";


        hctx.lineWidth =
            4;


        hctx.beginPath();


        hctx.moveTo(

            100,

            125

        );


        hctx.lineTo(

            150,

            125

        );



        hctx.moveTo(

            125,

            100

        );


        hctx.lineTo(

            125,

            150

        );


        hctx.stroke();


    }

updateTerrainCollision();

    /* ------------------------------------
       Render Scene
    ------------------------------------ */

    renderer.render(

        scene,

        camera

    );


}


/* ==========================================================
   START LOOP
========================================================== */

animate();


console.log(
    "✔ Animation Loop Started"
);
/* ==========================================================
   PART 10
   AeroVerse Startup System
========================================================== */


/* ==========================================================
   STARTUP CHECKS
========================================================== */

function startupCheck() {


    console.log(
        "================================="
    );


    console.log(
        "✈ AeroVerse V2 Started"
    );


    console.log(
        "================================="
    );


    /* Engine */

    console.log(
        "✔ Three.js Engine Online"
    );


    /* World */

    console.log(
        "✔ Terrain System Online"
    );


    console.log(
        "✔ Airport System Online"
    );


    /* Aircraft */

    if (aircraft) {

        console.log(
            "✔ Aircraft Ready"
        );

    }
    else {

        console.log(
            "⌛ Waiting For Aircraft Model..."
        );

    }



    /* Flight */

    console.log(
        "✔ Flight Physics Online"
    );


    console.log(
        "✔ Camera System Online"
    );


    console.log(
        "✔ Sky System Online"
    );


    console.log(
        "✔ HUD System Online"
    );



    console.log(
        "================================="
    );


    console.log(
        "CONTROLS"
    );


    console.log(
        "Mouse  : Fly Aircraft"
    );


    console.log(
        "W      : Increase Throttle"
    );


    console.log(
        "S      : Decrease Throttle"
    );


    console.log(
        "1      : Free Camera"
    );


    console.log(
        "2      : Chase Camera"
    );


    console.log(
        "3      : Cockpit Camera"
    );


    console.log(
        "4      : Top Camera"
    );


    console.log(
        "5      : Wing Camera"
    );


    console.log(
        "================================="
    );


}


/* ==========================================================
   DEBUG INFORMATION
========================================================== */

const AeroVerse = {

    version: "V2",

    engine: "Three.js",

    terrain: true,

    airport: true,

    aircraft: true,

    skySystem: true,

    hud: true,

    flightPhysics: true,

    cameras: 5

};


console.log(
    "AeroVerse Status:",
    AeroVerse
);


/* ==========================================================
   FUTURE EXPANSION HOOKS
========================================================== */

/*

   Future Systems:

   - Weather Engine
   - Rain Effects
   - Wind Physics
   - Multiplayer
   - ATC System
   - Airport Traffic
   - Aircraft Damage
   - Fuel System
   - Navigation GPS
   - Landing Gear
   - Flaps
   - Engine Sounds
   - Missions

*/


/* ==========================================================
   RUN STARTUP
========================================================== */

startupCheck();


function findAircraftParts() {

    if (!aircraft) return;

    aircraft.traverse((child) => {

        const name = child.name.toLowerCase();

      
        if (
            name.includes("frontwheel") ||
            name.includes("nosewheel") ||
            name.includes("frontgear") ||
            name.includes("nosegear")
        ) {

            noseWheel = child;

        }

       
        if (
            name.includes("rudder")
        ) {

            rudder = child;

        }

        
        if (
            name.includes("elevator_l") ||
            name.includes("left_elevator")
        ) {

            elevatorLeft = child;

        }

        if (
            name.includes("elevator_r") ||
            name.includes("right_elevator")
        ) {

            elevatorRight = child;

        }

        if (
            name.includes("aileron_l") ||
            name.includes("left_aileron")
        ) {

            aileronLeft = child;

        }

        if (
            name.includes("aileron_r") ||
            name.includes("right_aileron")
        ) {

            aileronRight = child;

        }

    });

    console.log("✔ Control Surfaces Found");

}


function updateControlSurfaces() {


    if (rudder) {

        rudder.rotation.y = THREE.MathUtils.lerp(

            rudder.rotation.y,

            mouse.x * 0.45,

            0.12

        );

    }



    if (noseWheel && aircraftRoot.position.y < 5) {

        noseWheel.rotation.y = THREE.MathUtils.lerp(

            noseWheel.rotation.y,

            mouse.x * 0.55,

            0.18

        );

    }


   

    if (aileronLeft) {

        aileronLeft.rotation.z = THREE.MathUtils.lerp(

            aileronLeft.rotation.z,

            mouse.x * 0.45,

            0.15

        );

    }

    if (aileronRight) {

        aileronRight.rotation.z = THREE.MathUtils.lerp(

            aileronRight.rotation.z,

            -mouse.x * 0.45,

            0.15

        );

    }


  

    if (elevatorLeft) {

        elevatorLeft.rotation.z = THREE.MathUtils.lerp(

            elevatorLeft.rotation.z,

            mouse.y * 0.35,

            0.12

        );

    }

    if (elevatorRight) {

        elevatorRight.rotation.z = THREE.MathUtils.lerp(

            elevatorRight.rotation.z,

            mouse.y * 0.35,

            0.12

        );

    }

}