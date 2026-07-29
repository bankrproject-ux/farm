import * as THREE from "three";
import "./style.css";

// ======================================================
// MINING TYCOON 3D
// Main Entry Point
// ======================================================

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App element not found.");
}

// ======================================================
// SCENE
// ======================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x080b10);
scene.fog = new THREE.Fog(0x080b10, 18, 55);

// ======================================================
// CAMERA
// ======================================================

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

camera.position.set(0, 1.7, 7);

// ======================================================
// RENDERER
// ======================================================

const renderer = new THREE.WebGLRenderer({
  antialias: true,
});

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);

renderer.shadowMap.enabled = true;

renderer.shadowMap.type =
  THREE.PCFSoftShadowMap;

renderer.outputColorSpace =
  THREE.SRGBColorSpace;

renderer.toneMapping =
  THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.15;

app.appendChild(renderer.domElement);

// ======================================================
// LIGHTING
// ======================================================

const ambientLight =
  new THREE.AmbientLight(
    0x8aa4c8,
    0.7
  );

scene.add(ambientLight);

const ceilingLight =
  new THREE.DirectionalLight(
    0xffffff,
    2.5
  );

ceilingLight.position.set(
  4,
  8,
  5
);

ceilingLight.castShadow = true;

ceilingLight.shadow.mapSize.set(
  2048,
  2048
);

scene.add(ceilingLight);

// Blue industrial light

const blueLight =
  new THREE.PointLight(
    0x2388ff,
    18,
    12
  );

blueLight.position.set(
  -4,
  3,
  -4
);

scene.add(blueLight);

// ======================================================
// FLOOR
// ======================================================

const floorGeometry =
  new THREE.PlaneGeometry(
    20,
    20
  );

const floorMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x242a32,
    roughness: 0.72,
    metalness: 0.18,
  });

const floor =
  new THREE.Mesh(
    floorGeometry,
    floorMaterial
  );

floor.rotation.x =
  -Math.PI / 2;

floor.receiveShadow = true;

scene.add(floor);

// ======================================================
// GRID
// ======================================================

const grid =
  new THREE.GridHelper(
    20,
    20,
    0x3f5269,
    0x303944
  );

grid.position.y = 0.003;

scene.add(grid);

// ======================================================
// WALL MATERIAL
// ======================================================

const wallMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x171c23,
    roughness: 0.82,
    metalness: 0.08,
  });

// ======================================================
// BACK WALL
// ======================================================

const backWall =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      20,
      5,
      0.3
    ),
    wallMaterial
  );

backWall.position.set(
  0,
  2.5,
  -10
);

backWall.receiveShadow = true;

scene.add(backWall);

// ======================================================
// LEFT WALL
// ======================================================

const leftWall =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.3,
      5,
      20
    ),
    wallMaterial
  );

leftWall.position.set(
  -10,
  2.5,
  0
);

leftWall.receiveShadow = true;

scene.add(leftWall);

// ======================================================
// RIGHT WALL
// ======================================================

const rightWall =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.3,
      5,
      20
    ),
    wallMaterial
  );

rightWall.position.set(
  10,
  2.5,
  0
);

rightWall.receiveShadow = true;

scene.add(rightWall);

// ======================================================
// CEILING STRIP LIGHTS
// ======================================================

function createCeilingLight(
  x: number,
  z: number
) {
  const fixture =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        3.5,
        0.08,
        0.22
      ),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xd9ecff,
        emissiveIntensity: 4,
      })
    );

  fixture.position.set(
    x,
    4.65,
    z
  );

  scene.add(fixture);

  const light =
    new THREE.PointLight(
      0xd9ecff,
      9,
      8
    );

  light.position.set(
    x,
    4.3,
    z
  );

  scene.add(light);
}

createCeilingLight(
  -4,
  -5
);

createCeilingLight(
  4,
  -5
);

createCeilingLight(
  -4,
  2
);

createCeilingLight(
  4,
  2
);

// ======================================================
// TEMPORARY SERVER RACK
// Just visual reference for now.
// Later this becomes a real purchasable rack.
// ======================================================

const rack =
  new THREE.Group();

const rackFrameMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x080a0d,
    roughness: 0.35,
    metalness: 0.85,
  });

const rackBody =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      1.6,
      3.2,
      1.1
    ),
    rackFrameMaterial
  );

rackBody.castShadow = true;
rackBody.receiveShadow = true;

rack.add(rackBody);

// Front server slots

const slotMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x151b21,
    roughness: 0.45,
    metalness: 0.7,
  });

for (
  let i = 0;
  i < 8;
  i++
) {
  const slot =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        1.35,
        0.27,
        0.08
      ),
      slotMaterial
    );

  slot.position.set(
    0,
    -1.15 + i * 0.33,
    0.565
  );

  rack.add(slot);

  // Tiny status LED

  const led =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.05,
        0.05,
        0.03
      ),
      new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 4,
      })
    );

  led.position.set(
    0.5,
    -1.15 + i * 0.33,
    0.62
  );

  rack.add(led);
}

rack.position.set(
  0,
  1.6,
  -6
);

scene.add(rack);

// ======================================================
// SIMPLE HUD
// Temporary until we build the real HUD system.
// ======================================================

const hud =
  document.createElement("div");

hud.className = "hud";

hud.innerHTML = `
  <div class="game-title">
    MINING TYCOON
    <span>FACILITY 01</span>
  </div>

  <div class="stats">
    <div class="stat">
      <span class="stat-label">BALANCE</span>
      <strong>$5,000</strong>
    </div>

    <div class="stat">
      <span class="stat-label">HASHRATE</span>
      <strong>0 H/s</strong>
    </div>

    <div class="stat">
      <span class="stat-label">POWER</span>
      <strong>0 W</strong>
    </div>
  </div>

  <div class="crosshair"></div>

  <div class="help">
    MINING FACILITY ONLINE
  </div>
`;

app.appendChild(hud);

// ======================================================
// TEMP CAMERA MOVEMENT
//
// WASD movement for testing.
// Mouse-look comes with PlayerController later.
// ======================================================

const keys: Record<string, boolean> =
  {};

window.addEventListener(
  "keydown",
  (event) => {
    keys[
      event.code
    ] = true;
  }
);

window.addEventListener(
  "keyup",
  (event) => {
    keys[
      event.code
    ] = false;
  }
);

const movementSpeed = 4;

const clock =
  new THREE.Clock();

// ======================================================
// RESIZE
// ======================================================

window.addEventListener(
  "resize",
  () => {
    camera.aspect =
      window.innerWidth /
      window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );
  }
);

// ======================================================
// GAME LOOP
// ======================================================

function animate() {
  requestAnimationFrame(
    animate
  );

  const delta =
    Math.min(
      clock.getDelta(),
      0.05
    );

  const direction =
    new THREE.Vector3();

  if (keys["KeyW"]) {
    direction.z -= 1;
  }

  if (keys["KeyS"]) {
    direction.z += 1;
  }

  if (keys["KeyA"]) {
    direction.x -= 1;
  }

  if (keys["KeyD"]) {
    direction.x += 1;
  }

  if (
    direction.lengthSq() >
    0
  ) {
    direction.normalize();

    camera.position.x +=
      direction.x *
      movementSpeed *
      delta;

    camera.position.z +=
      direction.z *
      movementSpeed *
      delta;
  }

  // Keep player inside room.

  camera.position.x =
    THREE.MathUtils.clamp(
      camera.position.x,
      -9,
      9
    );

  camera.position.z =
    THREE.MathUtils.clamp(
      camera.position.z,
      -9,
      9
    );

  renderer.render(
    scene,
    camera
  );
}

animate();
