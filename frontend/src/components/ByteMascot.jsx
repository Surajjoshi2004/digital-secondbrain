import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const DEFAULT_SIZE = {
  width: 560,
  height: 580,
};

const MOODS = {
  think: {
    label: "THINKING...",
    accentLabel: "#88ccff",
    bc: 0x1a3a66,
    be: 0x091833,
    bs: 0x99ccff,
    wc: 0x4499ff,
    ec: 0x66bbff,
    ee: 0x223355,
    pc: 0x2288ee,
    mc: 0x44aaff,
    me: 0x112266,
    ac: 0x3388ff,
    ae: 0x112255,
    abc: 0x88ccff,
    abe: 0x224466,
    hc: 0x3388ff,
    he: 0x112244,
    pkc: 0x6699ff,
    esc: 0.88,
    poy: 0.06,
    mcv: 0,
  },
  happy: {
    label: "HAPPY :D",
    accentLabel: "#ffe880",
    bc: 0x443300,
    be: 0x221a00,
    bs: 0xffee88,
    wc: 0xffcc00,
    ec: 0xffdd44,
    ee: 0x885500,
    pc: 0xff9900,
    mc: 0xffcc22,
    me: 0x884400,
    ac: 0xffbb00,
    ae: 0x664400,
    abc: 0xffee55,
    abe: 0x886600,
    hc: 0xffbb00,
    he: 0x774400,
    pkc: 0xffcc44,
    esc: 1.15,
    poy: 0,
    mcv: 1,
  },
  zap: {
    label: "ZAP!!!",
    accentLabel: "#ff9966",
    bc: 0x441100,
    be: 0x220800,
    bs: 0xff9966,
    wc: 0xff5500,
    ec: 0xff7744,
    ee: 0x882200,
    pc: 0xff2200,
    mc: 0xff5533,
    me: 0x881100,
    ac: 0xff4400,
    ae: 0x661100,
    abc: 0xff8844,
    abe: 0x882200,
    hc: 0xff4400,
    he: 0x881100,
    pkc: 0xff6633,
    esc: 1.3,
    poy: -0.04,
    mcv: 0.6,
  },
  sleep: {
    label: "zzzz...",
    accentLabel: "#ccaaff",
    bc: 0x1a0d33,
    be: 0x0d0622,
    bs: 0xbbaaff,
    wc: 0x9966ff,
    ec: 0xaa88ff,
    ee: 0x441166,
    pc: 0x7755ee,
    mc: 0xaa88ff,
    me: 0x331166,
    ac: 0x8855dd,
    ae: 0x331166,
    abc: 0xbbaaff,
    abe: 0x442266,
    hc: 0x8855dd,
    he: 0x331166,
    pkc: 0x9966ff,
    esc: 0.2,
    poy: 0.13,
    mcv: -0.6,
  },
};

const MOOD_BUTTONS = [
  { id: "think", label: "think", emoji: "💭" },
  { id: "happy", label: "happy", emoji: "☀️" },
  { id: "zap", label: "zap!", emoji: "⚡" },
  { id: "sleep", label: "sleep", emoji: "🌙" },
];

const noise3 = (x, y, z) =>
  Math.sin(x * 3.1 + y * 1.7) *
  Math.cos(y * 2.3 + z * 1.9) *
  Math.sin(z * 2.7 + x * 1.3);

const lerpMaterialColor = (material, prop, hex, speed) => {
  const target = new THREE.Color(hex);
  material[prop].r += (target.r - material[prop].r) * speed;
  material[prop].g += (target.g - material[prop].g) * speed;
  material[prop].b += (target.b - material[prop].b) * speed;
};

const isAccentMaterial = (material, accentHex) => {
  const materialHex = material.color.getHex();
  return (
    material.userData.role === "accent" ||
    materialHex === 0x3388ff ||
    materialHex === accentHex
  );
};

const createBodyMaterial = (color, emissive, role = "body") => {
  const material = new THREE.MeshPhongMaterial({
    color,
    emissive,
    specular: 0x88aaff,
    shininess: 70,
  });
  material.userData.role = role;
  return material;
};

function ByteMascot({ decorative = false, className = "", initialMood = "think" }) {
  const mountRef = useRef(null);
  const moodRef = useRef(initialMood);
  const [mood, setMood] = useState(initialMood);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return undefined;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(DEFAULT_SIZE.width, DEFAULT_SIZE.height);
    renderer.shadowMap.enabled = true;
    renderer.domElement.className = "byte-mascot-canvas";
    mount.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      48,
      DEFAULT_SIZE.width / DEFAULT_SIZE.height,
      0.1,
      100
    );
    camera.position.set(0, 0.8, 8);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const dA = new THREE.DirectionalLight(0xffffff, 2.5);
    dA.position.set(4, 8, 7);
    scene.add(dA);
    const dB = new THREE.DirectionalLight(0xccddff, 1.5);
    dB.position.set(-5, 3, 5);
    scene.add(dB);
    const dC = new THREE.DirectionalLight(0xffffff, 1.2);
    dC.position.set(0, -5, 6);
    scene.add(dC);
    const dD = new THREE.DirectionalLight(0xffffff, 1);
    dD.position.set(0, 2, -4);
    scene.add(dD);
    const ptA = new THREE.PointLight(0xffffff, 6, 50);
    ptA.position.set(0, 4, 7);
    scene.add(ptA);
    const ptB = new THREE.PointLight(0xaabbff, 3, 50);
    ptB.position.set(-4, -1, 5);
    scene.add(ptB);

    const brainGeometry = new THREE.IcosahedronGeometry(1.55, 6);
    const positions = brainGeometry.attributes.position;
    const originalPositions = new Float32Array(positions.count * 3);

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const z = positions.getZ(index);
      const bulge =
        1 +
        (noise3(x, y, z) +
          noise3(x * 2, y * 2, z * 2) * 0.5 +
          noise3(x * 4, y * 4, z * 4) * 0.25) *
          0.17;
      const nx = x * bulge;
      const ny = y * bulge * 0.86;
      const nz = z * bulge;

      positions.setXYZ(index, nx, ny, nz);
      originalPositions[index * 3] = nx;
      originalPositions[index * 3 + 1] = ny;
      originalPositions[index * 3 + 2] = nz;
    }

    brainGeometry.computeVertexNormals();

    const brainMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a3a66,
      emissive: 0x091833,
      specular: 0x99ccff,
      shininess: 110,
    });
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x4499ff,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    });

    const brainGroup = new THREE.Group();
    brainGroup.add(new THREE.Mesh(brainGeometry, brainMaterial));
    brainGroup.add(new THREE.Mesh(brainGeometry, wireMaterial));
    scene.add(brainGroup);

    const createEye = () => {
      const group = new THREE.Group();

      group.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 16, 16),
          new THREE.MeshPhongMaterial({
            color: 0x000c1a,
            specular: 0xaaddff,
            shininess: 160,
          })
        )
      );

      const ringMaterial = new THREE.MeshPhongMaterial({
        color: 0x66bbff,
        emissive: 0x224466,
        specular: 0xffffff,
        shininess: 80,
      });
      group.add(new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 8, 32), ringMaterial));

      const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x2288ff });
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 10), pupilMaterial);
      pupil.position.z = 0.2;
      group.add(pupil);

      const shine = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      shine.position.set(-0.08, 0.09, 0.23);
      group.add(shine);

      group.userData.ringMaterial = ringMaterial;
      group.userData.pupilMaterial = pupilMaterial;
      group.userData.pupil = pupil;

      return group;
    };

    const leftEye = createEye();
    leftEye.position.set(-0.5, 0.74, 1.3);
    const rightEye = createEye();
    rightEye.position.set(0.5, 0.74, 1.3);
    brainGroup.add(leftEye, rightEye);

    const mouthMaterial = new THREE.MeshPhongMaterial({
      color: 0x44aaff,
      emissive: 0x1133aa,
      specular: 0xaaddff,
      shininess: 80,
    });
    let mouthMesh = null;
    let lastCurve = 0;

    const buildMouth = (curve) => {
      if (mouthMesh) {
        brainGroup.remove(mouthMesh);
        mouthMesh.geometry.dispose();
      }

      const points = [];
      for (let index = 0; index <= 24; index += 1) {
        const t = index / 24;
        const x = THREE.MathUtils.lerp(-0.44, 0.44, t);
        points.push(
          new THREE.Vector3(x, 0.16 + curve * 0.3 * Math.sin(t * Math.PI), 1.56)
        );
      }

      mouthMesh = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, 0.065, 8, false),
        mouthMaterial
      );
      brainGroup.add(mouthMesh);
    };

    buildMouth(0);

    const antennaMaterial = new THREE.MeshPhongMaterial({
      color: 0x3388ff,
      emissive: 0x112255,
    });
    const antennaCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 1, 8),
      antennaMaterial
    );
    antennaCylinder.position.set(0, 2.08, 0);
    antennaCylinder.rotation.z = 0.17;

    const antennaBallMaterial = new THREE.MeshPhongMaterial({
      color: 0x88ccff,
      emissive: 0x336688,
      specular: 0xffffff,
      shininess: 120,
    });
    const antennaBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 12, 12),
      antennaBallMaterial
    );
    antennaBall.position.set(0.18, 2.62, 0);
    brainGroup.add(antennaCylinder, antennaBall);

    const createArm = (side) => {
      const group = new THREE.Group();
      const shaftMaterial = createBodyMaterial(0x1a3a66, 0x0a1a33, "body");
      const accentMaterial = createBodyMaterial(0x3388ff, 0x112244, "accent");

      const upper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.075, 0.55, 10),
        shaftMaterial.clone()
      );
      upper.rotation.z = side * -0.5;
      upper.position.set(side * 0.27, -0.27, 0);
      group.add(upper);

      const elbow = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 10, 10),
        accentMaterial.clone()
      );
      elbow.position.set(side * 0.5, -0.52, 0);
      group.add(elbow);

      const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.065, 0.5, 10),
        shaftMaterial.clone()
      );
      forearm.rotation.z = side * -0.9;
      forearm.position.set(side * 0.72, -0.7, 0);
      group.add(forearm);

      const wristPosition = new THREE.Vector3(side * 0.95, -0.88, 0.05);
      const wrist = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 10, 10),
        accentMaterial.clone()
      );
      wrist.position.copy(wristPosition);
      group.add(wrist);

      const palm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.12, 0.09, 12),
        accentMaterial.clone()
      );
      palm.rotation.x = Math.PI / 2;
      palm.position.set(wristPosition.x + side * 0.06, wristPosition.y - 0.03, wristPosition.z + 0.13);
      group.add(palm);

      const fingerCount = 4;
      for (let finger = 0; finger < fingerCount; finger += 1) {
        const fraction = (finger - (fingerCount - 1) / 2) / (fingerCount - 1);
        const fingerLength = finger === 1 || finger === 2 ? 0.18 : 0.14;
        const knuckleMaterial = createBodyMaterial(0x3388ff, 0x112244, "accent");
        const segmentMaterial = createBodyMaterial(0x1a3a66, 0x0a1a33, "body");

        const knucklePosition = new THREE.Vector3(
          palm.position.x + fraction * 0.22,
          palm.position.y + 0.01,
          palm.position.z + 0.1
        );

        const knuckle = new THREE.Mesh(
          new THREE.SphereGeometry(0.034, 8, 8),
          knuckleMaterial
        );
        knuckle.position.copy(knucklePosition);
        group.add(knuckle);

        const fingerSegment = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.024, fingerLength, 8),
          segmentMaterial
        );
        fingerSegment.rotation.x = -Math.PI * 0.38;
        fingerSegment.position.set(
          knucklePosition.x,
          knucklePosition.y + fingerLength * 0.28,
          knucklePosition.z + fingerLength * 0.38
        );
        group.add(fingerSegment);

        const fingertip = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 8, 8),
          knuckleMaterial.clone()
        );
        fingertip.position.set(
          knucklePosition.x,
          knucklePosition.y + fingerLength * 0.55,
          knucklePosition.z + fingerLength * 0.75
        );
        group.add(fingertip);
      }

      const thumbKnucklePosition = new THREE.Vector3(
        palm.position.x + side * 0.14,
        palm.position.y,
        palm.position.z + 0.04
      );
      const thumbKnuckle = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 8, 8),
        createBodyMaterial(0x3388ff, 0x112244, "accent")
      );
      thumbKnuckle.position.copy(thumbKnucklePosition);
      group.add(thumbKnuckle);

      const thumbSegment = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.026, 0.13, 8),
        createBodyMaterial(0x1a3a66, 0x0a1a33, "body")
      );
      thumbSegment.rotation.z = side * -0.8;
      thumbSegment.rotation.x = -0.4;
      thumbSegment.position.set(
        thumbKnucklePosition.x + side * 0.06,
        thumbKnucklePosition.y + 0.03,
        thumbKnucklePosition.z + 0.07
      );
      group.add(thumbSegment);

      return group;
    };

    const leftArm = createArm(-1);
    const rightArm = createArm(1);
    brainGroup.add(leftArm, rightArm);

    const createLeg = (side) => {
      const group = new THREE.Group();
      const shaftMaterial = createBodyMaterial(0x1a3a66, 0x0a1a33, "body");
      const accentMaterial = createBodyMaterial(0x3388ff, 0x112244, "accent");

      const hip = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 10, 10),
        accentMaterial.clone()
      );
      hip.position.set(0, 0, 0);
      group.add(hip);

      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.09, 0.62, 10),
        shaftMaterial.clone()
      );
      thigh.position.set(0, -0.31, 0);
      group.add(thigh);

      const knee = new THREE.Mesh(
        new THREE.SphereGeometry(0.105, 10, 10),
        accentMaterial.clone()
      );
      knee.position.set(0, -0.64, 0.05);
      group.add(knee);

      const shin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.075, 0.58, 10),
        shaftMaterial.clone()
      );
      shin.rotation.x = 0.12;
      shin.position.set(0, -0.96, 0.09);
      group.add(shin);

      const ankle = new THREE.Mesh(
        new THREE.SphereGeometry(0.088, 10, 10),
        accentMaterial.clone()
      );
      ankle.position.set(0, -1.27, 0.16);
      group.add(ankle);

      const heel = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 8, 8),
        shaftMaterial.clone()
      );
      heel.position.set(0, -1.32, -0.1);
      group.add(heel);

      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.075, 0.32, 10),
        shaftMaterial.clone()
      );
      foot.rotation.x = -Math.PI / 2.1;
      foot.position.set(0, -1.34, 0.21);
      group.add(foot);

      for (let toe = 0; toe < 4; toe += 1) {
        const fraction = (toe - 1.5) / 1.5;
        const toeLength = toe === 1 || toe === 2 ? 0.13 : 0.1;
        const toePosition = new THREE.Vector3(fraction * 0.13, -1.38, 0.37);

        const toeSegment = new THREE.Mesh(
          new THREE.CylinderGeometry(0.028, 0.022, toeLength, 7),
          shaftMaterial.clone()
        );
        toeSegment.rotation.x = -Math.PI * 0.42;
        toeSegment.position.set(
          toePosition.x,
          toePosition.y + toeLength * 0.22,
          toePosition.z + toeLength * 0.3
        );
        group.add(toeSegment);

        const toeTip = new THREE.Mesh(
          new THREE.SphereGeometry(0.028, 7, 7),
          accentMaterial.clone()
        );
        toeTip.position.set(
          toePosition.x,
          toePosition.y + toeLength * 0.42,
          toePosition.z + toeLength * 0.6
        );
        group.add(toeTip);
      }

      group.position.set(side * 0.46, -1.52, 0);

      return group;
    };

    const leftLeg = createLeg(-1);
    const rightLeg = createLeg(1);
    brainGroup.add(leftLeg, rightLeg);

    const neuronGeometry = new THREE.SphereGeometry(0.042, 6, 6);
    const neurons = [];
    for (let index = 0; index < 100; index += 1) {
      const randomIndex = Math.floor(Math.random() * positions.count);
      const material = new THREE.MeshBasicMaterial({
        color: 0x4499ff,
        transparent: true,
        opacity: 0.8,
      });
      const mesh = new THREE.Mesh(neuronGeometry, material);
      mesh.position.set(
        originalPositions[randomIndex * 3],
        originalPositions[randomIndex * 3 + 1],
        originalPositions[randomIndex * 3 + 2]
      );
      brainGroup.add(mesh);
      neurons.push({
        mesh,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.8,
      });
    }

    const synapses = [];
    for (let index = 0; index < 55; index += 1) {
      const sourceNeuron = neurons[Math.floor(Math.random() * neurons.length)];
      const targetNeuron = neurons[Math.floor(Math.random() * neurons.length)];

      if (sourceNeuron.mesh.position.distanceTo(targetNeuron.mesh.position) > 2.3) {
        index -= 1;
        continue;
      }

      const material = new THREE.LineBasicMaterial({
        color: 0x4499ff,
        transparent: true,
        opacity: 0,
      });
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          sourceNeuron.mesh.position.clone(),
          targetNeuron.mesh.position.clone(),
        ]),
        material
      );
      brainGroup.add(line);
      synapses.push({
        material,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random(),
      });
    }

    const orbitCount = 260;
    const orbitGeometry = new THREE.BufferGeometry();
    const orbitPositions = new Float32Array(orbitCount * 3);
    const orbitVelocity = [];

    for (let index = 0; index < orbitCount; index += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 2.1 + Math.random() * 1;

      orbitPositions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      orbitPositions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.85;
      orbitPositions[index * 3 + 2] = radius * Math.cos(phi);
      orbitVelocity.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.005,
          (Math.random() - 0.5) * 0.005,
          (Math.random() - 0.5) * 0.005
        )
      );
    }

    orbitGeometry.setAttribute("position", new THREE.BufferAttribute(orbitPositions, 3));
    const orbitMaterial = new THREE.PointsMaterial({
      color: 0x4499ff,
      size: 0.048,
      transparent: true,
      opacity: 0.75,
    });
    const orbitPoints = new THREE.Points(orbitGeometry, orbitMaterial);
    orbitPoints.position.y = 0.4;
    scene.add(orbitPoints);

    const zapGroup = new THREE.Group();
    scene.add(zapGroup);

    const makeZap = () => {
      while (zapGroup.children.length) {
        const child = zapGroup.children.pop();
        child.geometry.dispose();
        child.material.dispose();
      }

      for (let side = -1; side <= 1; side += 2) {
        const points = [];
        let x = side * 1.8;
        let y = 0.8;
        points.push(new THREE.Vector3(x, y, 0.5));

        for (let segment = 0; segment < 7; segment += 1) {
          x += side * (0.2 + Math.random() * 0.2);
          y += (Math.random() - 0.5) * 0.5;
          points.push(
            new THREE.Vector3(x, y, 0.5 + (Math.random() - 0.5) * 0.3)
          );
        }

        zapGroup.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineBasicMaterial({
              color: 0xff8800,
              transparent: true,
              opacity: 1,
            })
          )
        );
      }
    };

    const sleepBursts = [];
    for (let index = 0; index < 3; index += 1) {
      const material = new THREE.MeshPhongMaterial({
        color: 0xaa88ff,
        emissive: 0x441166,
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 + index * 0.04, 8, 8),
        material
      );
      mesh.position.set(2.3 + index * 0.3, 1.9 + index * 0.4, 0);
      scene.add(mesh);
      sleepBursts.push({
        mesh,
        material,
        offset: index * 0.34,
      });
    }

    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    let rotationY = 0;
    let rotationX = 0;

    const handleMouseDown = (event) => {
      dragging = true;
      previousX = event.clientX;
      previousY = event.clientY;
    };

    const handleMouseUp = () => {
      dragging = false;
    };

    const handleMouseMove = (event) => {
      if (!dragging) {
        return;
      }

      rotationY += (event.clientX - previousX) * 0.01;
      rotationX += (event.clientY - previousY) * 0.008;
      rotationX = Math.max(-0.65, Math.min(0.65, rotationX));
      previousX = event.clientX;
      previousY = event.clientY;
    };

    const handleWheel = (event) => {
      camera.position.z = Math.max(4.5, Math.min(12, camera.position.z + event.deltaY * 0.009));
      event.preventDefault();
    };

    if (!decorative) {
      renderer.domElement.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("mousemove", handleMouseMove);
      renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });
    }

    let blinkTimer = 0;
    let nextBlink = 130;
    let blinking = false;
    let blinkPhase = 0;
    let tick = 0;
    let zapRefresh = 0;
    let animationFrameId = 0;

    const animate = () => {
      animationFrameId = window.requestAnimationFrame(animate);
      tick += 0.016;

      const activeMood = MOODS[moodRef.current];
      const speed = 0.055;

      lerpMaterialColor(brainMaterial, "color", activeMood.bc, speed);
      lerpMaterialColor(brainMaterial, "emissive", activeMood.be, speed);
      lerpMaterialColor(brainMaterial, "specular", activeMood.bs, speed);
      lerpMaterialColor(wireMaterial, "color", activeMood.wc, speed);
      lerpMaterialColor(leftEye.userData.ringMaterial, "color", activeMood.ec, speed);
      lerpMaterialColor(leftEye.userData.ringMaterial, "emissive", activeMood.ee, speed);
      lerpMaterialColor(rightEye.userData.ringMaterial, "color", activeMood.ec, speed);
      lerpMaterialColor(rightEye.userData.ringMaterial, "emissive", activeMood.ee, speed);
      lerpMaterialColor(leftEye.userData.pupilMaterial, "color", activeMood.pc, speed);
      lerpMaterialColor(rightEye.userData.pupilMaterial, "color", activeMood.pc, speed);
      lerpMaterialColor(mouthMaterial, "color", activeMood.mc, speed);
      lerpMaterialColor(mouthMaterial, "emissive", activeMood.me, speed);
      lerpMaterialColor(antennaMaterial, "color", activeMood.ac, speed);
      lerpMaterialColor(antennaMaterial, "emissive", activeMood.ae, speed);
      lerpMaterialColor(antennaBallMaterial, "color", activeMood.abc, speed);
      lerpMaterialColor(antennaBallMaterial, "emissive", activeMood.abe, speed);
      lerpMaterialColor(orbitMaterial, "color", activeMood.hc, speed);

      neurons.forEach((neuron) => {
        lerpMaterialColor(neuron.mesh.material, "color", activeMood.hc, speed);
      });

      synapses.forEach((synapse) => {
        lerpMaterialColor(synapse.material, "color", activeMood.hc, speed);
      });

      ptA.color.lerp(new THREE.Color(activeMood.pkc), speed);

      [leftArm, rightArm, leftLeg, rightLeg].forEach((limb) => {
        limb.traverse((child) => {
          if (!child.isMesh) {
            return;
          }

          if (isAccentMaterial(child.material, activeMood.hc)) {
            lerpMaterialColor(child.material, "color", activeMood.hc, speed);
            lerpMaterialColor(child.material, "emissive", activeMood.he, speed);
          } else {
            lerpMaterialColor(child.material, "color", activeMood.bc, speed);
            lerpMaterialColor(child.material, "emissive", activeMood.be, speed);
          }
        });
      });

      brainGroup.rotation.y += (rotationY - brainGroup.rotation.y) * 0.08;
      brainGroup.rotation.x += (rotationX - brainGroup.rotation.x) * 0.08;
      brainGroup.position.y = Math.sin(tick * 0.85) * 0.09;

      leftArm.rotation.z = Math.sin(tick * 1.1) * 0.2 + 0.08;
      rightArm.rotation.z = -Math.sin(tick * 1.1) * 0.2 - 0.08;
      leftArm.rotation.x = Math.sin(tick * 1.1 + 0.4) * 0.1;
      rightArm.rotation.x = -Math.sin(tick * 1.1 + 0.4) * 0.1;
      leftLeg.rotation.x = Math.sin(tick * 1.1) * 0.18;
      rightLeg.rotation.x = -Math.sin(tick * 1.1) * 0.18;

      antennaCylinder.rotation.z = 0.17 + Math.sin(tick * 1.4) * 0.08;
      antennaBall.position.x = 0.18 + Math.sin(tick * 1.4) * 0.13;

      const antennaPulse = (Math.sin(tick * 3) + 1) * 0.5;
      antennaBallMaterial.emissive.lerp(new THREE.Color(activeMood.abc), speed);
      antennaBallMaterial.emissive.multiplyScalar(0.4 + antennaPulse * 0.6);

      blinkTimer += 1;
      if (!blinking && blinkTimer > nextBlink) {
        blinking = true;
        blinkPhase = 0;
        nextBlink = 90 + Math.random() * 70;
        blinkTimer = 0;
      }

      if (blinking) {
        blinkPhase += 0.15;
        if (blinkPhase >= 1) {
          blinking = false;
          blinkPhase = 0;
        }
      }

      let eyeScale = activeMood.esc;
      if (blinking) {
        const blinkScale = blinkPhase < 0.5 ? 1 - blinkPhase * 2 : (blinkPhase - 0.5) * 2;
        eyeScale = activeMood.esc * blinkScale;
      }

      [leftEye, rightEye].forEach((eye) => {
        eye.scale.y = Math.max(0.04, eyeScale);
        eye.userData.pupil.position.y = activeMood.poy;
      });

      if (Math.abs(activeMood.mcv - lastCurve) > 0.007) {
        lastCurve += (activeMood.mcv - lastCurve) * 0.07;
        buildMouth(lastCurve);
      }

      neurons.forEach((neuron) => {
        const pulse = (Math.sin(tick * neuron.speed + neuron.phase) + 1) * 0.5;
        neuron.mesh.material.opacity = 0.3 + pulse * 0.7;
        neuron.mesh.scale.setScalar(0.65 + pulse * 0.7);
      });

      synapses.forEach((synapse) => {
        synapse.material.opacity = Math.max(0, Math.sin(tick * synapse.speed + synapse.phase)) * 0.5;
      });

      const orbitArray = orbitGeometry.attributes.position.array;
      for (let index = 0; index < orbitCount; index += 1) {
        orbitArray[index * 3] += orbitVelocity[index].x;
        orbitArray[index * 3 + 1] += orbitVelocity[index].y;
        orbitArray[index * 3 + 2] += orbitVelocity[index].z;

        const radius = Math.sqrt(
          orbitArray[index * 3] ** 2 +
            orbitArray[index * 3 + 1] ** 2 +
            orbitArray[index * 3 + 2] ** 2
        );

        if (radius > 3.3 || radius < 1.8) {
          orbitVelocity[index].negate();
        }
      }

      orbitGeometry.attributes.position.needsUpdate = true;
      orbitPoints.rotation.y = tick * 0.04;
      ptA.position.x = Math.sin(tick * 0.4) * 4.5;
      ptA.position.z = 6 + Math.cos(tick * 0.4) * 2;

      if (moodRef.current === "zap") {
        zapGroup.visible = true;
        zapRefresh += 1;
        if (zapRefresh > 8) {
          makeZap();
          zapRefresh = 0;
        }
      } else {
        zapGroup.visible = false;
      }

      sleepBursts.forEach((sleepBurst) => {
        if (moodRef.current === "sleep") {
          const alpha = (tick * 0.4 + sleepBurst.offset) % 1;
          sleepBurst.material.opacity = Math.sin(alpha * Math.PI) * 0.9;
          sleepBurst.material.color.lerp(new THREE.Color(activeMood.hc), 0.05);
          sleepBurst.mesh.position.y = 1.9 + sleepBurst.offset * 0.8 + alpha * 0.65;
          sleepBurst.mesh.scale.setScalar(0.85 + sleepBurst.offset * 0.5);
        } else {
          sleepBurst.material.opacity = 0;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      if (!decorative) {
        renderer.domElement.removeEventListener("mousedown", handleMouseDown);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("mousemove", handleMouseMove);
        renderer.domElement.removeEventListener("wheel", handleWheel);
      }

      scene.traverse((child) => {
        if (child.geometry) {
          child.geometry.dispose();
        }

        if (child.material) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];
          materials.forEach((material) => material.dispose());
        }
      });

      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [decorative]);

  if (decorative) {
    return (
      <section className={`byte-stage byte-stage-bg ${className}`.trim()}>
        <div ref={mountRef} className="byte-wrap byte-wrap-bg mx-auto">
          <div className="byte-canvas-wrap" />
        </div>
      </section>
    );
  }

  return (
    <section className="byte-stage rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
      <div className="byte-wrap mx-auto">
        <div className="byte-tag" style={{ color: MOODS[mood].accentLabel }}>
          {MOODS[mood].label}
        </div>
        <div ref={mountRef} className="byte-canvas-wrap" />
        <div className="byte-hint">drag to rotate | scroll to zoom</div>
      </div>

      <div className="byte-btns mt-4">
        {MOOD_BUTTONS.map((button) => (
          <button
            key={button.id}
            type="button"
            onClick={() => setMood(button.id)}
            className={`byte-btn byte-btn-${button.id} ${
              mood === button.id ? "byte-btn-active" : ""
            }`}
          >
            {button.label} {button.emoji}
          </button>
        ))}
      </div>
    </section>
  );
}

export default ByteMascot;
