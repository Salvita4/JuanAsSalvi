<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import * as THREE from "three";
import {
  createCanvasFaces,
  onPageImagesLoaded,
  pagePainters,
} from "@/three/magazinePages";

const props = defineProps<{
  state: number;
}>();

const emit = defineEmits<{
  navigate: [direction: number];
}>();

const mountElement = ref<HTMLDivElement>();
const ready = ref(false);
let destroyScene: (() => void) | undefined;

const MAGAZINE_WIDTH = 4;
const MAGAZINE_HEIGHT = 5.4;
const PAGE_SEGMENTS = 36;
const LEAF_COUNT = pagePainters.length / 2;
const PAGE_GAP = 0.014;

interface Leaf {
  geometry: THREE.BufferGeometry;
  progress: number;
  from: number;
  to: number;
  startTime: number;
  direction: number;
}

function makeWoodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D no está disponible.");

  context.fillStyle = "#3a1d12";
  context.fillRect(0, 0, 1024, 1024);
  for (let index = 0; index < 260; index += 1) {
    const y = Math.random() * 1024;
    const rgb = Math.random() > 0.5 ? "20,6,2" : "110,50,28";
    context.strokeStyle = `rgba(${rgb},${0.08 + Math.random() * 0.22})`;
    context.lineWidth = 1 + Math.random() * 4;
    context.beginPath();
    context.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 32) {
      context.lineTo(x, y + Math.sin(x * 0.01 + index) * 6);
    }
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1.5);
  return texture;
}

function initializeScene(element: HTMLDivElement) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0606);
  scene.fog = new THREE.Fog(0x0b0606, 14, 30);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute("aria-hidden", "true");
  element.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffe6d0, 0x2a0805, 0.9));
  const lamp = new THREE.SpotLight(0xffd9a8, 260, 30, 0.62, 0.55, 1.6);
  lamp.position.set(-5, 10, 3);
  lamp.target.position.set(0.5, 0, 0);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.bias = -0.0004;
  lamp.shadow.radius = 6;
  scene.add(lamp, lamp.target);

  const rimLight = new THREE.PointLight(0xdb0821, 30, 18);
  rimLight.position.set(7, 3, -5);
  scene.add(rimLight);

  const standardMaterial = (color: number, roughness = 0.5, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });

  const woodTexture = makeWoodTexture();
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(22, 0.5, 13),
    new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.55,
      metalness: 0.05,
    }),
  );
  table.position.y = -0.26;
  table.receiveShadow = true;
  scene.add(table);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x120707, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -6;
  scene.add(floor);

  function addMesh(mesh: THREE.Mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  const mug = new THREE.Group();
  const mugBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.5, 1.15, 40, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xa50413,
      roughness: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  mugBody.castShadow = true;
  mug.add(mugBody);
  const coffee = new THREE.Mesh(
    new THREE.CircleGeometry(0.52, 40),
    standardMaterial(0x1c0b04, 0.2),
  );
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.42;
  mug.add(coffee);
  const mugHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.07, 12, 30),
    standardMaterial(0xa50413, 0.35),
  );
  mugHandle.position.x = 0.6;
  mugHandle.castShadow = true;
  mug.add(mugHandle);
  mug.position.set(-6.3, 0.58, -2.2);
  scene.add(mug);

  const pencil = addMesh(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 3.6, 6),
      standardMaterial(0xe5ac11, 0.6),
    ),
  );
  pencil.rotation.set(Math.PI / 2, 0, 0.3);
  pencil.rotation.order = "YXZ";
  pencil.rotation.y = 0.35;
  pencil.position.set(5.6, 0.12, 1.4);
  const pencilTip = addMesh(
    new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.3, 6),
      standardMaterial(0x1a1919),
    ),
  );
  pencilTip.rotation.copy(pencil.rotation);
  pencilTip.position.set(
    5.02 + Math.sin(0.35) * 1.95,
    0.12,
    1.52 + Math.cos(0.35) * 1.95,
  );

  [0x6f0004, 0xdb0821, 0x1a1919, 0xbfbfbf].forEach((color, index) => {
    const sheet = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.02, 4.2),
        standardMaterial(color, 0.9),
      ),
    );
    sheet.position.set(
      6.6 + index * 0.05,
      0.01 + index * 0.021,
      -2.4 - index * 0.04,
    );
    sheet.rotation.y = -0.25 + index * 0.12;
  });

  const reel = addMesh(
    new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 0.14, 48),
      standardMaterial(0x1a1919, 0.3, 0.8),
    ),
  );
  reel.position.set(-6.4, 0.07, 1.9);
  const reelHub = addMesh(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.18, 24),
      standardMaterial(0xdb0821, 0.4),
    ),
  );
  reelHub.position.set(-6.4, 0.09, 1.9);

  const magazine = new THREE.Group();
  scene.add(magazine);
  const faces = createCanvasFaces();
  const leaves: Leaf[] = Array.from({ length: LEAF_COUNT }, (_, index) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((PAGE_SEGMENTS + 1) * 2 * 3);
    const uvs = new Float32Array((PAGE_SEGMENTS + 1) * 2 * 2);
    const indices: number[] = [];

    for (let segment = 0; segment <= PAGE_SEGMENTS; segment += 1) {
      uvs.set([segment / PAGE_SEGMENTS, 1, segment / PAGE_SEGMENTS, 0], segment * 4);
      if (segment < PAGE_SEGMENTS) {
        const a = segment * 2;
        const b = a + 2;
        const c = a + 1;
        const d = a + 3;
        indices.push(a, c, b, b, c, d);
      }
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    const frontTexture = faces[index * 2].texture;
    const backTexture = faces[index * 2 + 1].texture;
    backTexture.wrapS = THREE.RepeatWrapping;
    backTexture.repeat.x = -1;
    const isCover = index === 0 || index === LEAF_COUNT - 1;
    const makePageMaterial = (texture: THREE.Texture, side: THREE.Side) =>
      new THREE.MeshStandardMaterial({
        map: texture,
        side,
        roughness: isCover ? 0.38 : 0.75,
        metalness: 0,
      });
    const frontMesh = new THREE.Mesh(
      geometry,
      makePageMaterial(frontTexture, THREE.FrontSide),
    );
    const backMesh = new THREE.Mesh(
      geometry,
      makePageMaterial(backTexture, THREE.BackSide),
    );
    frontMesh.castShadow = true;
    frontMesh.receiveShadow = true;
    backMesh.castShadow = true;
    backMesh.receiveShadow = true;
    magazine.add(frontMesh, backMesh);

    return {
      geometry,
      progress: 0,
      from: 0,
      to: 0,
      startTime: 0,
      direction: 1,
    };
  });

  const edgeMaterial = standardMaterial(0x6f0004, 0.8);
  const leftPageBlock = new THREE.Mesh(
    new THREE.BoxGeometry(MAGAZINE_WIDTH, 1, MAGAZINE_HEIGHT),
    edgeMaterial,
  );
  const rightPageBlock = leftPageBlock.clone();
  [leftPageBlock, rightPageBlock].forEach((block) => {
    block.castShadow = true;
    block.receiveShadow = true;
    magazine.add(block);
  });

  const repaintFaces = () => faces.forEach((face) => face.paint());
  document.fonts
    .load('100px "Jersey 25"')
    .then(() => document.fonts.load("100px Anton"))
    .then(() => document.fonts.load('700 20px "Inter Tight"'))
    .then(repaintFaces)
    .catch(() => undefined);
  const removeImageListeners = onPageImagesLoaded(repaintFaces);

  const easeInOutCubic = (value: number) =>
    value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  const animationDuration = 1.25;

  function shapeLeaf(index: number, leaf: Leaf) {
    const progress = leaf.progress;
    const rightRestHeight = (LEAF_COUNT - index) * PAGE_GAP + 0.02;
    const leftRestHeight = (index + 1) * PAGE_GAP + 0.02;
    const baseHeight =
      rightRestHeight + (leftRestHeight - rightRestHeight) * progress;
    const angle = progress * Math.PI;
    const lift = Math.sin(progress * Math.PI);
    const bend =
      0.9 *
      lift *
      leaf.direction *
      (index === 0 || index === LEAF_COUNT - 1 ? 0.35 : 1);
    const positions = leaf.geometry.attributes.position.array as Float32Array;
    let x = 0;
    let y = baseHeight;
    const segmentWidth = MAGAZINE_WIDTH / PAGE_SEGMENTS;

    for (let segment = 0; segment <= PAGE_SEGMENTS; segment += 1) {
      positions.set(
        [x, y, -MAGAZINE_HEIGHT / 2, x, y, MAGAZINE_HEIGHT / 2],
        segment * 6,
      );
      const ratio = segment / PAGE_SEGMENTS;
      const segmentAngle = angle - bend * Math.pow(ratio, 1.6);
      x += Math.cos(segmentAngle) * segmentWidth;
      y += Math.sin(segmentAngle) * segmentWidth;
    }
    leaf.geometry.attributes.position.needsUpdate = true;
    leaf.geometry.computeVertexNormals();
    leaf.geometry.computeBoundingSphere();
  }

  let renderedState = 0;
  function updateTargets(now: number) {
    const nextState = props.state;
    if (nextState === renderedState) return;
    const movingForward = nextState > renderedState;

    leaves.forEach((leaf, index) => {
      const target = index < nextState ? 1 : 0;
      if (target === leaf.to) return;
      const order = movingForward ? index - renderedState : renderedState - 1 - index;
      leaf.from = leaf.progress;
      leaf.to = target;
      leaf.direction = target > leaf.from ? 1 : -1;
      leaf.startTime = now + Math.max(0, order) * 0.22;
    });
    renderedState = nextState;
  }

  const resize = () => {
    const width = element.clientWidth;
    const height = element.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(element);
  resize();

  const pointer = new THREE.Vector2();
  let pointerStart: { x: number; y: number } | undefined;

  const onPointerMove = (event: PointerEvent) => {
    pointer.set(
      event.clientX / window.innerWidth - 0.5,
      event.clientY / window.innerHeight - 0.5,
    );
  };
  const onPointerDown = (event: PointerEvent) => {
    pointerStart = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!pointerStart) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    pointerStart = undefined;
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
      emit("navigate", deltaX < 0 ? 1 : -1);
      return;
    }
    emit("navigate", event.clientX > window.innerWidth / 2 || props.state === 0 ? 1 : -1);
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  renderer.domElement.addEventListener("pointerdown", onPointerDown, { passive: true });
  renderer.domElement.addEventListener("pointerup", onPointerUp, { passive: true });

  const clock = new THREE.Clock();
  const focus = new THREE.Vector3(MAGAZINE_WIDTH / 2, 0, 0);
  const targetFocus = new THREE.Vector3();
  const targetCamera = new THREE.Vector3();
  let animationFrame = 0;

  const render = () => {
    const now = clock.getElapsedTime();
    updateTargets(now);
    leaves.forEach((leaf, index) => {
      const elapsed = Math.min(
        1,
        Math.max(0, (now - leaf.startTime) / animationDuration),
      );
      leaf.progress =
        leaf.from + (leaf.to - leaf.from) * easeInOutCubic(elapsed);
      if (elapsed >= 1) leaf.direction = leaf.to ? 1 : -1;
      shapeLeaf(index, leaf);
    });

    const flippedPages = leaves.reduce((total, leaf) => total + leaf.progress, 0);
    const leftHeight = Math.max(0.001, flippedPages * PAGE_GAP);
    const rightHeight = Math.max(0.001, (LEAF_COUNT - flippedPages) * PAGE_GAP);
    leftPageBlock.scale.y = leftHeight;
    leftPageBlock.position.set(-MAGAZINE_WIDTH / 2, leftHeight / 2 + 0.01, 0);
    rightPageBlock.scale.y = rightHeight;
    rightPageBlock.position.set(MAGAZINE_WIDTH / 2, rightHeight / 2 + 0.01, 0);

    const openness = Math.min(
      1,
      flippedPages,
      LEAF_COUNT - 1 - flippedPages + 1,
    );
    const focusX = (MAGAZINE_WIDTH / 2) * (1 - Math.min(1, flippedPages));
    targetFocus.set(focusX, 0, 0.15);
    focus.lerp(targetFocus, 0.06);
    const fitWidth = (openness > 0.5 ? 2 * MAGAZINE_WIDTH : MAGAZINE_WIDTH) + 1.6;
    const halfFovTangent = Math.tan((camera.fov * Math.PI) / 360);
    const distance = Math.max(
      fitWidth / (2 * halfFovTangent * Math.min(camera.aspect, 1.6)),
      (MAGAZINE_HEIGHT + 1.4) / (2 * halfFovTangent),
    );
    targetCamera.set(
      focus.x + pointer.x * 0.8,
      distance * 0.86,
      focus.z + distance * 0.5 + pointer.y * 0.5,
    );
    camera.position.lerp(targetCamera, 0.05);
    camera.lookAt(focus);
    magazine.rotation.y = Math.sin(now * 0.3) * 0.006;
    renderer.render(scene, camera);
    ready.value = true;
    animationFrame = requestAnimationFrame(render);
  };

  leaves.forEach((leaf, index) => shapeLeaf(index, leaf));
  camera.position.set(MAGAZINE_WIDTH / 2, 12, 9);
  render();

  return () => {
    cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    removeImageListeners();
    window.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);

    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => material.dispose());
    });
    faces.forEach((face) => face.texture.dispose());
    woodTexture.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

onMounted(() => {
  if (mountElement.value) destroyScene = initializeScene(mountElement.value);
});

onBeforeUnmount(() => destroyScene?.());
</script>

<template>
  <div
    ref="mountElement"
    class="stage"
    role="img"
    aria-label="Revista 3D interactiva. Tocá o deslizá para recorrer el portfolio."
  />
  <Transition name="loading">
    <div v-if="!ready" class="ui-loading">Cargando portfolio…</div>
  </Transition>
</template>
