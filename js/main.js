/* ==========================================================================
   V2 CORE WebGL ENGINE & GSAP SCROLL SYSTEM — UDAY JAISWAL PORTFOLIO
   ========================================================================== */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Register GSAP ScrollTrigger plugin immediately
gsap.registerPlugin(ScrollTrigger);

// --- ENGINE STATE ---
let canvas, renderer, scene, camera, composer;
let bloomPass, renderPass;

// Global settings
let fxEnabled = true;
let currentSectionIndex = 0;
const scrollProgress = { value: 0 };
const mouse = {
    x: 0, y: 0,
    targetX: 0, targetY: 0,
    speedX: 0, speedY: 0,
    lastX: 0, lastY: 0
};

// Groups for each "World"
let worldHero, worldAbout, worldSkills, worldProjects, worldExperience, worldContact;
let splinePath, targetSplinePath;

// Raycasting for projects
const raycaster = new THREE.Raycaster();
const mouseVector = new THREE.Vector2();
let hoveredPlanet = null;
let clickedPlanet = null;

// Particle arrays
let starParticlesGeo, starParticlesMesh;
let inputParticlesGeo, inputParticlesMesh, inputParticlePositions = [], inputParticleVelocities = [];
let roadParticles = [];
const projectPlanets = [];

// Rotating roles data
const rolesList = [
    "Computer Science Scholar", 
    "AI/ML Developer", 
    "Cinematic Video Editor", 
    "Social Media Strategist", 
    "Digital Creative generalist"
];
let roleIndex = 0;

// --- INITIALIZE SITE ---
function init() {
    initEngine();
    buildSplinePath();
    createWorlds();
    setupScrollAnimations();
    setupUserInteractions();
    animate();
    initRoleRotation();
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// --- ENGINE SETUP ---
function initEngine() {
    canvas = document.getElementById('webgl-canvas');
    
    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    // Scene & Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 8);
    
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0x0a0a15, 1.5);
    scene.add(ambientLight);
    
    // Dynamic Point Lights (Moving glow orbs)
    const goldLight = new THREE.PointLight(0xC8A24E, 3, 50);
    goldLight.position.set(5, 5, 5);
    scene.add(goldLight);
    
    const blueLight = new THREE.PointLight(0x00F0FF, 3, 50);
    blueLight.position.set(-5, -5, -5);
    scene.add(blueLight);

    // Save references to animate lights
    scene.userData = { goldLight, blueLight };
    
    // Postprocessing Composer (UnrealBloom)
    renderPass = new RenderPass(scene, camera);
    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.0,  // Strength
        0.5,  // Radius
        0.15  // Threshold
    );
    
    composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    
    // Window resize handler
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// --- DEFINE SPLINE CAMERA PATH ---
function buildSplinePath() {
    // Defines points in 3D space the camera flies through during scrolling
    const points = [
        new THREE.Vector3(0, 0, 8),        // 0. Hero
        new THREE.Vector3(8, 3, -15),      // 1. About (Looking across city)
        new THREE.Vector3(0, 4, -40),      // 2. Skills (Facing graph)
        new THREE.Vector3(0, 0, -78),      // 3. Projects (Center of planet ring)
        new THREE.Vector3(0, 0, -112),     // 4. Experience (Entering tunnel)
        new THREE.Vector3(0, 8, -170)      // 5. Contact (Looking down at command grid)
    ];
    
    splinePath = new THREE.CatmullRomCurve3(points);

    // Target tracking path for the camera to look at in each world
    const targetPoints = [
        new THREE.Vector3(0, 0, 0),        // 0. Hero (Look at avatar)
        new THREE.Vector3(-8, -5, -25),    // 1. About (Look at city center)
        new THREE.Vector3(0, 0, -48),      // 2. Skills (Look at neural net)
        new THREE.Vector3(0, 0, -85),      // 3. Projects (Look at projects ring center)
        new THREE.Vector3(0, 0, -155),     // 4. Experience (Look down tunnel)
        new THREE.Vector3(0, -5, -180)     // 5. Contact (Look down at grid)
    ];
    targetSplinePath = new THREE.CatmullRomCurve3(targetPoints);
}

// --- CREATE THE 6 WORLDS ---
function createWorlds() {
    // 0. Hero World
    worldHero = new THREE.Group();
    scene.add(worldHero);
    buildWorldHero();
    
    // 1. About World (Digital City)
    worldAbout = new THREE.Group();
    worldAbout.position.set(-8, -10, -25);
    scene.add(worldAbout);
    buildWorldAbout();
    
    // 2. Skills World (Neural Graph)
    worldSkills = new THREE.Group();
    worldSkills.position.set(0, 0, -48);
    scene.add(worldSkills);
    buildWorldSkills();
    
    // 3. Projects World (Planets)
    worldProjects = new THREE.Group();
    worldProjects.position.set(0, 0, -85);
    scene.add(worldProjects);
    buildWorldProjects();
    
    // 4. Experience World (Cyber Tunnel)
    worldExperience = new THREE.Group();
    worldExperience.position.set(0, 0, -145);
    scene.add(worldExperience);
    buildWorldExperience();
    
    // 5. Contact World (Radar Command Grid)
    worldContact = new THREE.Group();
    worldContact.position.set(0, -5, -180);
    scene.add(worldContact);
    buildWorldContact();
}

// --- WORLD BUILDERS ---

// Hero World: Holographic Avatar & Particle Starfield
function buildWorldHero() {
    // 1. Core Pulsating Shader Mesh
    const coreGeo = new THREE.IcosahedronGeometry(1.2, 2);
    
    const coreMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color('#C8A24E') },
            uSecondary: { value: new THREE.Color('#00F0FF') }
        },
        vertexShader: `
            uniform float uTime;
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            float wave(vec3 p) {
                return sin(p.x * 3.0 + uTime * 2.0) * cos(p.y * 3.0 + uTime * 1.5) * sin(p.z * 3.0 + uTime * 2.2) * 0.15;
            }
            
            void main() {
                vPosition = position;
                // Transform normals to view space for correct camera-facing Fresnel edge glow
                vNormal = normalize(normalMatrix * normal);
                vec3 displaced = position + normal * wave(position);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec3 uColor;
            uniform vec3 uSecondary;
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                // Compute correct view-space camera-facing Fresnel glow
                float edge = 1.0 - max(0.0, dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
                float scan = sin(vPosition.y * 30.0 + uTime * 4.0) * 0.5 + 0.5;
                vec3 col = mix(uColor, uSecondary, edge * 0.6);
                gl_FragColor = vec4(col * (0.5 + scan * 0.4 + edge * 0.9), 0.8);
            }
        `,
        wireframe: true,
        transparent: true,
        depthWrite: false
    });
    
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    worldHero.add(coreMesh);
    worldHero.userData = { coreMat };
    
    // 2. Outer Gyroscope Rings
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00F0FF,
        wireframe: true,
        transparent: true,
        opacity: 0.25,
        depthWrite: false
    });
    
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.015, 8, 48), ringMat);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.015, 8, 48), ringMat);
    ring2.rotation.x = Math.PI / 2;
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.015, 8, 48), ringMat);
    ring3.rotation.y = Math.PI / 4;
    
    worldHero.add(ring1, ring2, ring3);
    worldHero.userData.rings = [ring1, ring2, ring3];
    
    // 3. Ambient Particle Starfield (shared across entire universe space)
    const particleCount = 8000;
    starParticlesGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(particleCount * 3);
    
    for(let i = 0; i < particleCount * 3; i += 3) {
        // Distribute in a huge bounding box surrounding all worlds
        starPositions[i] = (Math.random() - 0.5) * 160;
        starPositions[i+1] = (Math.random() - 0.5) * 80;
        starPositions[i+2] = (Math.random() - 0.5) * 260 - 70; // stretch deep along Z axis
    }
    
    starParticlesGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    
    const starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.07,
        transparent: true,
        opacity: 0.6,
        depthWrite: false
    });
    
    starParticlesMesh = new THREE.Points(starParticlesGeo, starMat);
    scene.add(starParticlesMesh);
}

// About World: Floating Digital City
function buildWorldAbout() {
    const citySize = 50;
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    
    const goldWire = new THREE.MeshBasicMaterial({
        color: 0xC8A24E,
        wireframe: true,
        transparent: true,
        opacity: 0.12,
        depthWrite: false
    });
    
    const baseMat = new THREE.MeshBasicMaterial({
        color: 0x050508,
        transparent: true,
        opacity: 0.8
    });
    
    for (let i = 0; i < citySize; i++) {
        const height = Math.random() * 8 + 2;
        const width = Math.random() * 1.5 + 0.5;
        const depth = Math.random() * 1.5 + 0.5;
        
        // Single skyscraper assembly (wire outline + solid core to prevent seeing through everything)
        const building = new THREE.Group();
        
        const wireMesh = new THREE.Mesh(boxGeo, goldWire);
        wireMesh.scale.set(width, height, depth);
        
        const coreMesh = new THREE.Mesh(boxGeo, baseMat);
        coreMesh.scale.set(width * 0.98, height * 0.98, depth * 0.98);
        
        building.add(wireMesh, coreMesh);
        
        // Random layout
        building.position.set(
            (Math.random() - 0.5) * 30,
            height / 2 - 4, // align base below camera line
            (Math.random() - 0.5) * 30
        );
        
        worldAbout.add(building);
    }
    
    // Add glowing traffic path particles
    const roadPointsCount = 200;
    const roadGeo = new THREE.BufferGeometry();
    const roadPositions = new Float32Array(roadPointsCount * 3);
    
    for(let i=0; i<roadPointsCount * 3; i+=3) {
        roadPositions[i] = (Math.random() - 0.5) * 35;
        roadPositions[i+1] = -4; // flat grid level
        roadPositions[i+2] = (Math.random() - 0.5) * 35;
    }
    
    roadGeo.setAttribute('position', new THREE.BufferAttribute(roadPositions, 3));
    
    const roadMat = new THREE.PointsMaterial({
        color: 0x00F0FF,
        size: 0.12,
        transparent: true,
        opacity: 0.8
    });
    
    const trafficParticles = new THREE.Points(roadGeo, roadMat);
    worldAbout.add(trafficParticles);
    worldAbout.userData = { trafficParticles, roadPointsCount };
}

// Skills World: Neural Network Graph
function buildWorldSkills() {
    const hubCount = 4;
    const nodeCount = 16;
    
    const hubColors = [0xC8A24E, 0x00F0FF, 0xB829FF, 0x00F0FF];
    const hubPositions = [
        new THREE.Vector3(-2.5, 1.5, 0),
        new THREE.Vector3(2.5, 1.5, 0),
        new THREE.Vector3(-2.0, -1.8, 0),
        new THREE.Vector3(2.0, -1.8, 0)
    ];
    
    const hubGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const nodeGeo = new THREE.SphereGeometry(0.12, 8, 8);
    
    const hubs = [];
    const nodes = [];
    const linesGroup = new THREE.Group();
    worldSkills.add(linesGroup);
    
    // 1. Draw central Hubs
    for(let i = 0; i < hubCount; i++) {
        const mat = new THREE.MeshBasicMaterial({
            color: hubColors[i],
            wireframe: true
        });
        const mesh = new THREE.Mesh(hubGeo, mat);
        mesh.position.copy(hubPositions[i]);
        worldSkills.add(mesh);
        hubs.push(mesh);
        
        // Ring orbiter for hubs
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.5, 0.01, 4, 24),
            new THREE.MeshBasicMaterial({ color: hubColors[i], transparent: true, opacity: 0.4 })
        );
        ring.position.copy(hubPositions[i]);
        worldSkills.add(ring);
    }
    
    // 2. Draw Sub-Nodes branching out
    const linePositions = [];
    for(let i = 0; i < nodeCount; i++) {
        const parentHubIdx = i % hubCount;
        const parentHubPos = hubPositions[parentHubIdx];
        
        // Position randomly around their parent hub
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.5 + 1.0;
        const nodePos = new THREE.Vector3(
            parentHubPos.x + Math.cos(angle) * radius,
            parentHubPos.y + Math.sin(angle) * radius,
            parentHubPos.z + (Math.random() - 0.5) * 1.2
        );
        
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7
        });
        const mesh = new THREE.Mesh(nodeGeo, mat);
        mesh.position.copy(nodePos);
        worldSkills.add(mesh);
        nodes.push(mesh);
        
        // Add connections to coordinate arrays
        linePositions.push(parentHubPos.x, parentHubPos.y, parentHubPos.z);
        linePositions.push(nodePos.x, nodePos.y, nodePos.z);
    }
    
    // Connect hubs together in a central diamond
    for(let i=0; i<hubCount; i++) {
        const nextIdx = (i + 1) % hubCount;
        linePositions.push(hubPositions[i].x, hubPositions[i].y, hubPositions[i].z);
        linePositions.push(hubPositions[nextIdx].x, hubPositions[nextIdx].y, hubPositions[nextIdx].z);
    }
    
    // Create Line Segment meshes
    const connectionGeo = new THREE.BufferGeometry();
    connectionGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const connectionMat = new THREE.LineBasicMaterial({
        color: 0x555577,
        transparent: true,
        opacity: 0.35
    });
    
    const lines = new THREE.LineSegments(connectionGeo, connectionMat);
    linesGroup.add(lines);
}

// Projects World: Orbiting Planet Spheres
function buildWorldProjects() {
    const planetCount = 6;
    const ringRadius = 4.2;
    
    // Geometries representing each project
    const geometries = [
        new THREE.IcosahedronGeometry(0.8, 1),       // 0. Movie Recommendation (Wire Core)
        new THREE.OctahedronGeometry(0.7, 0),        // 1. House of Annie (Faceted Gem)
        new THREE.TorusGeometry(0.5, 0.15, 8, 24),   // 2. House of Kavati (Ring torus)
        new THREE.ConeGeometry(0.6, 1.1, 4),         // 3. Agasiaclub (Cone Pyramid)
        new THREE.DodecahedronGeometry(0.75, 1),     // 4. Naresh Fashion (Polyhedron)
        new THREE.BoxGeometry(0.9, 0.9, 0.9)         // 5. LM Farms & Farmside (Grid Cube)
    ];
    
    const colors = [0x00F0FF, 0xC8A24E, 0xB829FF, 0xE0E0E0, 0x00F0FF, 0x28a745];
    
    for (let i = 0; i < planetCount; i++) {
        const angle = (i / planetCount) * Math.PI * 2;
        
        const group = new THREE.Group();
        group.position.set(
            Math.cos(angle) * ringRadius,
            Math.sin(angle) * ringRadius * 0.3, // slight elliptical skew
            0
        );
        
        // Distinct styles
        const mat = new THREE.MeshBasicMaterial({
            color: colors[i],
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });
        
        const coreMesh = new THREE.Mesh(geometries[i], mat);
        group.add(coreMesh);
        
        // Add a secondary internal solid wire mesh for premium visual complexity
        if (i !== 2) { // Skip torus
            const innerMesh = new THREE.Mesh(
                geometries[i],
                new THREE.MeshBasicMaterial({
                    color: 0x050508,
                    transparent: true,
                    opacity: 0.9
                })
            );
            innerMesh.scale.setScalar(0.95);
            group.add(innerMesh);
        }
        
        // Orbit ring indicator
        const orbitLine = new THREE.Mesh(
            new THREE.TorusGeometry(1.1, 0.005, 4, 32),
            new THREE.MeshBasicMaterial({ color: colors[i], transparent: true, opacity: 0.15 })
        );
        group.add(orbitLine);
        
        worldProjects.add(group);
        projectPlanets.push(group);
        
        // Store project index metadata on the group for Raycaster detection
        group.userData = { projectIndex: i, coreMesh, color: colors[i] };
    }
}

// Experience World: Futuristic Timeline Tunnel
function buildWorldExperience() {
    // 1. Long wireframe corridor cylinder
    const tunnelGeo = new THREE.CylinderGeometry(4.5, 4.5, 80, 16, 24, true);
    
    const tunnelMat = new THREE.MeshBasicMaterial({
        color: 0xC8A24E,
        wireframe: true,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
        depthWrite: false
    });
    
    const tunnelMesh = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnelMesh.rotation.x = Math.PI / 2; // align down Z axis
    worldExperience.add(tunnelMesh);
    
    // 2. Rib rings pulsing down the length of the cylinder
    const ribCount = 8;
    const ribs = [];
    const ribGeo = new THREE.TorusGeometry(4.45, 0.02, 6, 48);
    const ribMat = new THREE.MeshBasicMaterial({
        color: 0x00F0FF,
        transparent: true,
        opacity: 0.35
    });
    
    for(let i=0; i<ribCount; i++) {
        const ring = new THREE.Mesh(ribGeo, ribMat);
        ring.position.set(0, 0, (i - ribCount/2) * 10);
        worldExperience.add(ring);
        ribs.push(ring);
    }
    
    worldExperience.userData = { ribs };
}

// Contact World: Radar concentric command center grid
function buildWorldContact() {
    // 1. Flat grid floor
    const grid = new THREE.GridHelper(30, 30, 0xC8A24E, 0x333344);
    grid.position.y = -3;
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    worldContact.add(grid);
    
    // 2. Concentric HUD rings sitting flat on floor
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00F0FF,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
    });
    
    const ringsGroup = new THREE.Group();
    ringsGroup.rotation.x = Math.PI / 2;
    ringsGroup.position.y = -2.95;
    
    const ring1 = new THREE.Mesh(new THREE.RingGeometry(2, 2.05, 64), ringMat);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(4, 4.08, 64), ringMat);
    const ring3 = new THREE.Mesh(new THREE.RingGeometry(8, 8.12, 64), ringMat);
    
    ringsGroup.add(ring1, ring2, ring3);
    worldContact.add(ringsGroup);
    worldContact.userData = { ringsGroup };
    
    // 3. User Typing Particle System emitter
    const maxInputParticles = 200;
    inputParticlesGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(maxInputParticles * 3);
    
    // Set all out of screen initially
    for(let i=0; i<maxInputParticles*3; i++) {
        positions[i] = -9999;
    }
    
    inputParticlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const inputMat = new THREE.PointsMaterial({
        color: 0x00F0FF,
        size: 0.15,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
    });
    
    inputParticlesMesh = new THREE.Points(inputParticlesGeo, inputMat);
    worldContact.add(inputParticlesMesh);
}

// --- GSAP CAMERA CAMERA FLIGHT AND HUD PANEL TRIGGERS ---
function setupScrollAnimations() {
    const sections = document.querySelectorAll('.scroll-section');
    const navLinks = document.querySelectorAll('.nav-link');
    const sidebarDots = document.querySelectorAll('.sidebar-dot');
    
    // Link page scrolling to timeline scroll progress variable
    gsap.to(scrollProgress, {
        value: 1,
        ease: "none",
        scrollTrigger: {
            trigger: ".scroll-container",
            start: "top top",
            end: "bottom bottom",
            scrub: 0.5,
            onUpdate: (self) => {
                // Update sidebar height filling bar
                document.getElementById('sidebar-fill').style.height = `${self.progress * 100}%`;
                
                // Track mouse speed scaling particle speeds based on scroll speed
                mouse.speedX = Math.abs(self.getVelocity() * 0.005);
            }
        }
    });
    
    // Attach trigger points for individual HUD panels
    sections.forEach((sec, idx) => {
        const panel = sec.querySelector('.hud-panel');
        
        ScrollTrigger.create({
            trigger: sec,
            start: "top 60%",
            end: "bottom 40%",
            onToggle: (self) => {
                if (self.isActive) {
                    currentSectionIndex = idx;
                    panel.classList.add('revealed');
                    
                    // Update header menu selection
                    navLinks.forEach(l => l.classList.remove('active'));
                    const targetLink = document.querySelector(`.nav-link[data-index="${idx}"]`);
                    if(targetLink) targetLink.classList.add('active');
                    
                    // Update sidebar dots selection
                    sidebarDots.forEach(d => d.classList.remove('active'));
                    const targetDot = document.querySelector(`.sidebar-dot[data-index="${idx}"]`);
                    if(targetDot) targetDot.classList.add('active');
                } else {
                    panel.classList.remove('revealed');
                }
            }
        });
    });
}

// Navigation helpers
window.scrollToIndex = function(index) {
    const sections = document.querySelectorAll('.scroll-section');
    if(sections[index]) {
        sections[index].scrollIntoView({ behavior: 'smooth' });
    }
};

// --- INTERACTIVE TRIGGERS & TRIGGERS LISENTERS ---
function setupUserInteractions() {
    const cursor = document.getElementById('custom-cursor');
    const cursorDot = document.getElementById('custom-cursor-dot');
    
    // Custom cursor tracker
    window.addEventListener('mousemove', (e) => {
        mouse.targetX = e.clientX;
        mouse.targetY = e.clientY;
        
        // Three.js Raycaster mapping normalized coordinates [-1, 1]
        mouseVector.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouseVector.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    
    // Check buttons, links and elements for custom cursor hover enlargement
    const interactables = 'a, button, .fallback-proj-item, input, textarea';
    document.addEventListener('mouseover', (e) => {
        if(e.target.closest(interactables)) {
            cursor.classList.add('hovered');
            cursorDot.classList.add('hovered');
        }
    });
    
    document.addEventListener('mouseout', (e) => {
        if(e.target.closest(interactables)) {
            cursor.classList.remove('hovered');
            cursorDot.classList.remove('hovered');
        }
    });
    
    // Performance FX Toggle click listener
    const perfToggle = document.getElementById('perf-toggle');
    perfToggle.addEventListener('click', () => {
        fxEnabled = !fxEnabled;
        if(fxEnabled) {
            perfToggle.classList.remove('eco');
            document.querySelector('.perf-text').innerText = "FX // ON";
            bloomPass.strength = 1.0;
        } else {
            perfToggle.classList.add('eco');
            document.querySelector('.perf-text').innerText = "FX // ECO";
            bloomPass.strength = 0.0; // shut off bloom
        }
    });
    
    // Menu links click triggers
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            scrollToIndex(idx);
        });
    });
    
    document.querySelectorAll('.sidebar-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            scrollToIndex(idx);
        });
    });
    
    document.querySelectorAll('.btn-trigger-contact').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            scrollToIndex(5);
        });
    });
    
    // 3D Canvas clicks (avatar shockwave and projects Raycasting selection)
    canvas.addEventListener('click', () => {
        // 1. Trigger shockwave on central avatar if currently in Hero section
        if (currentSectionIndex === 0) {
            triggerAvatarShockwave();
        }
        
        // 2. Select orbiting projects planets
        if (currentSectionIndex === 3 && hoveredPlanet) {
            selectProjectPlanet(hoveredPlanet);
        }
    });
    
    // Project detail modal controls
    document.getElementById('modal-close').addEventListener('click', () => {
        document.getElementById('project-modal').classList.remove('active');
        clickedPlanet = null;
    });
    
    // Establish Contact Form keyboard keypress listener to trigger upward glowing particles
    const formFields = document.querySelectorAll('#contact-form input, #contact-form textarea');
    formFields.forEach(field => {
        field.addEventListener('keypress', () => {
            spawnTypingParticle();
        });
    });
}

// Avatar shockwave expansion animation
function triggerAvatarShockwave() {
    // Generate expanding particle rings inside World Hero
    const ringGeo = new THREE.RingGeometry(0.1, 0.15, 32);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0xC8A24E,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const wave = new THREE.Mesh(ringGeo, ringMat);
    worldHero.add(wave);
    
    gsap.to(wave.scale, {
        x: 40,
        y: 40,
        z: 40,
        duration: 1.5,
        ease: "power2.out",
        onComplete: () => {
            worldHero.remove(wave);
            ringGeo.dispose();
            ringMat.dispose();
        }
    });
    
    gsap.to(ringMat, {
        opacity: 0,
        duration: 1.5,
        ease: "power2.out"
    });
}

// 3D Project Planet clicked zoom interaction
function selectProjectPlanet(planetGroup) {
    clickedPlanet = planetGroup;
    const projIdx = planetGroup.userData.projectIndex;
    
    // Open HTML HUD modal content for selected project
    openProjectData(projIdx);
}

// Spawns glowing cyan data lines/particles in Contact world when user types
function spawnTypingParticle() {
    if (inputParticlePositions.length / 3 >= 200) {
        // remove oldest
        inputParticlePositions.splice(0, 3);
        inputParticleVelocities.splice(0, 3);
    }
    
    // Spawn at random grid coordinate flat on floor
    const x = (Math.random() - 0.5) * 6;
    const y = -2.9;
    const z = (Math.random() - 0.5) * 6;
    
    inputParticlePositions.push(x, y, z);
    
    // upward floating velocities
    inputParticleVelocities.push(
        (Math.random() - 0.5) * 0.05,
        Math.random() * 0.08 + 0.04,
        (Math.random() - 0.5) * 0.05
    );
}

// Updates positions of floating keyboard packet particles
function updateInputParticles() {
    const posAttr = inputParticlesMesh.geometry.attributes.position;
    const positions = posAttr.array;
    
    let activeParticlesCount = inputParticlePositions.length / 3;
    
    // Copy active particles values to standard buffer array
    for(let i = 0; i < 200; i++) {
        if (i < activeParticlesCount) {
            // apply velocities
            inputParticlePositions[i*3] += inputParticleVelocities[i*3];
            inputParticlePositions[i*3+1] += inputParticleVelocities[i*3+1];
            inputParticlePositions[i*3+2] += inputParticleVelocities[i*3+2];
            
            positions[i*3] = inputParticlePositions[i*3];
            positions[i*3+1] = inputParticlePositions[i*3+1];
            positions[i*3+2] = inputParticlePositions[i*3+2];
            
            // if floats too high, recycle
            if (inputParticlePositions[i*3+1] > 8) {
                inputParticlePositions.splice(i*3, 3);
                inputParticleVelocities.splice(i*3, 3);
                activeParticlesCount--;
                i--;
            }
        } else {
            // hide offscreen
            positions[i*3] = -9999;
            positions[i*3+1] = -9999;
            positions[i*3+2] = -9999;
        }
    }
    
    posAttr.needsUpdate = true;
}

// --- PROJECT DATA LOGGER LOADER ---
const projectDetailsData = [
    {
        tag: "AI / MACHINE LEARNING",
        title: "Movie Recommendation System",
        desc: "Full-stack content filtering recommendation engine combining TMDB API integration with TF-IDF natural language processing models to serve real-time personalized suggestions.",
        tech: ["Python", "FastAPI", "TF-IDF", "NLP", "TMDB API"],
        link: "https://github.com/udayjaiswal143/Movie-Recommandation-Syatem"
    },
    {
        tag: "VIDEO PRODUCTION / BILASPUR",
        title: "House of Annie",
        desc: "Macro-cinematography and premium post-production pacing for Bilaspur's luxury jewelry brand. Engineered under internship at Chrysalis Media.",
        tech: ["Premiere Pro", "Color Grading", "Cinematography", "Product Video"],
        link: "https://drive.google.com/drive/folders/1TMf8XDP32LiLmlY9pjNkzxLx60hQp24E"
    },
    {
        tag: "VIDEO PRODUCTION / UK BRAND",
        title: "House of Kavati",
        desc: "Visual direction, editorial pacing, and motion graphics for UK-based luxury label. Engineered under internship at Chrysalis Media.",
        tech: ["Premiere Pro", "Motion Graphics", "Lensing", "Color Pacing"],
        link: "https://drive.google.com/drive/folders/1TMf8XDP32LiLmlY9pjNkzxLx60hQp24E"
    },
    {
        tag: "ACTIVE PROJECT / DUBAI COFFEE",
        title: "Agasiaclub",
        desc: "Currently active campaign direction, video editing, and motion design assets for Dubai's premium coffee brand. Engineered under internship at Chrysalis Media.",
        tech: ["CapCut", "Cinematic Direction", "Pacing", "Social Strategy"],
        link: "https://drive.google.com/drive/folders/1TMf8XDP32LiLmlY9pjNkzxLx60hQp24E"
    },
    {
        tag: "SOCIAL MEDIA CAMPAIGNS",
        title: "Naresh Fashion",
        desc: "Social campaign content curation, visual pacing, and trend optimization for boutique fashion labels. Engineered under internship at Chrysalis Media.",
        tech: ["CapCut", "Instagram Algorithms", "Creative Direction", "Audio Mix"],
        link: "https://drive.google.com/drive/folders/1TMf8XDP32LiLmlY9pjNkzxLx60hQp24E"
    },
    {
        tag: "COMMERCIAL FILMING",
        title: "LM Farms & Farmside",
        desc: "Cinematic commercial filming and editing campaigns capturing agricultural hospitality and tourism. Engineered under internship at Chrysalis Media.",
        tech: ["Premiere Pro", "Lensing", "Lighting Design", "Commercial Edit"],
        link: "https://drive.google.com/drive/folders/1TMf8XDP32LiLmlY9pjNkzxLx60hQp24E"
    }
];

window.openProjectData = function(index) {
    const data = projectDetailsData[index];
    if(!data) return;
    
    document.getElementById('modal-tag').innerText = data.tag;
    document.getElementById('modal-title').innerText = data.title;
    document.getElementById('modal-description').innerText = data.desc;
    
    const techBox = document.getElementById('modal-tech');
    techBox.innerHTML = '';
    data.tech.forEach(t => {
        const span = document.createElement('span');
        span.innerText = t;
        techBox.appendChild(span);
    });
    
    const linkBtn = document.getElementById('modal-link');
    if(data.link) {
        linkBtn.href = data.link;
        linkBtn.style.display = 'inline-flex';
    } else {
        linkBtn.style.display = 'none';
    }
    
    document.getElementById('project-modal').classList.add('active');
};

// --- ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    
    const time = performance.now() * 0.001;
    
    // 1. Mouse Lerping (Smooth Lag follow)
    mouse.x += (mouse.targetX - mouse.x) * 0.08;
    mouse.y += (mouse.targetY - mouse.y) * 0.08;
    
    const cursor = document.getElementById('custom-cursor');
    const cursorDot = document.getElementById('custom-cursor-dot');
    if(cursor && cursorDot) {
        cursor.style.left = `${mouse.x}px`;
        cursor.style.top = `${mouse.y}px`;
        cursorDot.style.left = `${mouse.targetX}px`;
        cursorDot.style.top = `${mouse.targetY}px`;
    }
    
    // 2. Camera Flight tracking along Scroll Spine
    if (splinePath && targetSplinePath) {
        const pathPoint = splinePath.getPointAt(scrollProgress.value);
        const lookTarget = targetSplinePath.getPointAt(scrollProgress.value);
        
        // Add subtle mouse-perspective displacement offset (camera parallax)
        const mouseShiftX = ((mouse.x / window.innerWidth) - 0.5) * 1.5;
        const mouseShiftY = -((mouse.y / window.innerHeight) - 0.5) * 1.5;
        
        camera.position.set(
            pathPoint.x + mouseShiftX,
            pathPoint.y + mouseShiftY,
            pathPoint.z
        );
        camera.lookAt(lookTarget);
    }
    
    // 3. Animate point lights subtly
    if (scene.userData.goldLight) {
        scene.userData.goldLight.position.x = 5 + Math.sin(time) * 3;
        scene.userData.goldLight.position.z = 5 + Math.cos(time) * 3;
    }
    if (scene.userData.blueLight) {
        scene.userData.blueLight.position.x = -5 - Math.cos(time) * 3;
        scene.userData.blueLight.position.z = -5 - Math.sin(time) * 3;
    }
    
    // 4. Animate Starfield velocity responding to cursor speed
    if (starParticlesMesh) {
        starParticlesMesh.rotation.y = time * 0.015;
        
        // accelerate spin velocity based on mouse activity
        const velocityAcc = Math.max(mouse.speedX * 0.05, 0.0);
        starParticlesMesh.rotation.x += velocityAcc;
        
        // slowly decay velocity back to ambient
        mouse.speedX *= 0.95;
    }
    
    // 5. Animate individual worlds elements
    // World 0 (Avatar core rotation + gyro rings)
    if (worldHero) {
        if (worldHero.userData.coreMat) {
            worldHero.userData.coreMat.uniforms.uTime.value = time;
        }
        
        // Avatar face looking at cursor
        const avTargetX = ((mouse.x / window.innerWidth) - 0.5) * 0.4;
        const avTargetY = -((mouse.y / window.innerHeight) - 0.5) * 0.3;
        worldHero.rotation.y += (avTargetX - worldHero.rotation.y) * 0.08;
        worldHero.rotation.x += (avTargetY - worldHero.rotation.x) * 0.08;
        
        // Rotate outer gyro rings
        if (worldHero.userData.rings) {
            worldHero.userData.rings[0].rotation.z = time * 0.4;
            worldHero.userData.rings[1].rotation.y = time * -0.3;
            worldHero.userData.rings[2].rotation.x = time * 0.2;
        }
    }
    
    // World 1 (City digital traffic)
    if (worldAbout && worldAbout.userData.trafficParticles) {
        worldAbout.userData.trafficParticles.rotation.y = -time * 0.02;
    }
    
    // World 2 (Neural network spin)
    if (worldSkills) {
        worldSkills.rotation.y = Math.sin(time * 0.1) * 0.3;
    }
    
    // World 3 (Projects orbiting planet systems rotation)
    if (worldProjects && projectPlanets.length > 0) {
        projectPlanets.forEach((p, i) => {
            // Ambient self-rotation
            p.rotation.y += 0.015;
            p.rotation.x += 0.005;
            
            // Orbit skew bobbing
            p.position.y += Math.sin(time * 1.5 + i) * 0.003;
        });
        
        // Handle raycaster hovered intersections with project planets
        if (currentSectionIndex === 3) {
            raycaster.setFromCamera(mouseVector, camera);
            const intersects = raycaster.intersectObjects(projectPlanets, true);
            
            if (intersects.length > 0) {
                // Find parent planet group in intersects list
                let obj = intersects[0].object;
                while (obj.parent && !projectPlanets.includes(obj)) {
                    obj = obj.parent;
                }
                
                if (projectPlanets.includes(obj)) {
                    if (hoveredPlanet !== obj) {
                        // Reset last hovered
                        if (hoveredPlanet) {
                            gsap.to(hoveredPlanet.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
                        }
                        hoveredPlanet = obj;
                        
                        // Scale up active hover
                        gsap.to(hoveredPlanet.scale, { x: 1.4, y: 1.4, z: 1.4, duration: 0.3 });
                        
                        // Enlarge cursor
                        document.getElementById('custom-cursor').classList.add('hovered');
                    }
                }
            } else {
                if (hoveredPlanet) {
                    gsap.to(hoveredPlanet.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
                    hoveredPlanet = null;
                    document.getElementById('custom-cursor').classList.remove('hovered');
                }
            }
        }
    }
    
    // World 4 (Tunnel camera passage / rib animation)
    if (worldExperience && worldExperience.userData.ribs) {
        worldExperience.userData.ribs.forEach((rib, idx) => {
            // rotate ribs
            rib.rotation.z = time * (0.2 + idx * 0.05);
        });
    }
    
    // World 5 (Radar grids rotation + Keyboard input particles)
    if (worldContact) {
        if(worldContact.userData.ringsGroup) {
            worldContact.userData.ringsGroup.children[0].rotation.z = time * 0.2;
            worldContact.userData.ringsGroup.children[1].rotation.z = -time * 0.1;
            worldContact.userData.ringsGroup.children[2].rotation.z = time * 0.05;
        }
        updateInputParticles();
    }
    
    // 6. Draw Composer Frame (or simple Renderer to save graphics budget)
    if(fxEnabled) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}

// --- SUB-INTERACTION LOGS ---

// Form Submission transmit animation
window.handleFormSubmit = function(event) {
    event.preventDefault();
    const btn = document.getElementById('form-submit-btn');
    const originalText = btn.innerText;
    
    btn.disabled = true;
    btn.innerText = "TRANSMITTING PACKET...";
    btn.style.borderColor = "var(--accent-cyan)";
    btn.style.color = "var(--accent-cyan)";
    
    // Spawn a huge burst of particles from the radar grid center
    for(let i=0; i<80; i++) {
        setTimeout(() => {
            spawnTypingParticle();
        }, i * 15);
    }
    
    setTimeout(() => {
        // Construct standard mailto link fallback
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const subject = document.getElementById('subject').value;
        const message = document.getElementById('message').value;
        
        const mailtoLink = `mailto:udaycontactus@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent("Sender Name: " + name + "\nSender Email: " + email + "\n\n" + message)}`;
        
        window.location.href = mailtoLink;
        
        btn.innerText = "PACKET INJECTED";
        btn.style.borderColor = "var(--accent-gold)";
        btn.style.color = "var(--accent-gold)";
        
        // Reset form fields
        document.getElementById('contact-form').reset();
        
        setTimeout(() => {
            btn.disabled = false;
            btn.innerText = originalText;
            btn.style.borderColor = "";
            btn.style.color = "";
        }, 3000);
        
    }, 1500);
};

// Hero Role Auto-Rotation Carousel
function initRoleRotation() {
    const textEl = document.getElementById('rotating-role');
    if(!textEl) return;
    
    setInterval(() => {
        gsap.to(textEl, {
            opacity: 0,
            y: -10,
            duration: 0.4,
            onComplete: () => {
                roleIndex = (roleIndex + 1) % rolesList.length;
                textEl.innerText = rolesList[roleIndex];
                gsap.fromTo(textEl, 
                    { opacity: 0, y: 10 },
                    { opacity: 1, y: 0, duration: 0.4 }
                );
            }
        });
    }, 3500);
}
