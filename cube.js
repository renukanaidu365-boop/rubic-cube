import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class RubiksCube {
    constructor(container) {
        this.container = container;
        this.cubies = [];
        this.moveQueue = [];
        this.isAnimating = false;
        this.speed = 200;
        this.isScrambling = false;
        this.scrambleMoves = [];
        this.isSolved = true;  // Track solved state

        this.setupScene();
        this.createCube();
        this.animate();
        this.setupResize();
        
        window.cube = this;
        console.log('✅ CubeAI initialized!');
    }

    setupScene() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
        this.camera.position.set(5, 4, 6);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;

        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
        fillLight.position.set(-5, 0, 5);
        this.scene.add(fillLight);
    }

    createCube() {
        console.log('🔄 Creating cube...');
        this.cubies.forEach(c => this.scene.remove(c));
        this.cubies = [];

        const colors = {
            right: 0xc41e3a, left: 0xff5800,
            up: 0xffffff, down: 0xffd500,
            front: 0x009e60, back: 0x0051ba,
            inside: 0x1a1a1a
        };

        const size = 0.85;
        const gap = 0.06;
        const spacing = size + gap;

        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    if (x === 0 && y === 0 && z === 0) continue;

                    const geo = new THREE.BoxGeometry(size, size, size);
                    const mats = [
                        this.makeMat(x === 1 ? colors.right : colors.inside),
                        this.makeMat(x === -1 ? colors.left : colors.inside),
                        this.makeMat(y === 1 ? colors.up : colors.inside),
                        this.makeMat(y === -1 ? colors.down : colors.inside),
                        this.makeMat(z === 1 ? colors.front : colors.inside),
                        this.makeMat(z === -1 ? colors.back : colors.inside)
                    ];

                    const mesh = new THREE.Mesh(geo, mats);
                    mesh.position.set(x * spacing, y * spacing, z * spacing);
                    mesh.userData = { grid: { x, y, z } };

                    this.scene.add(mesh);
                    this.cubies.push(mesh);
                }
            }
        }
        console.log('✅ Cube created with', this.cubies.length, 'cubies');
    }

    makeMat(color) {
        return new THREE.MeshStandardMaterial({
            color: color,
            roughness: color === 0x1a1a1a ? 0.9 : 0.25,
            metalness: color === 0x1a1a1a ? 0.0 : 0.05,
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();

        if (this.moveQueue.length > 0 && !this.isAnimating && !this.isScrambling) {
            this.executeNextMove();
        }

        this.renderer.render(this.scene, this.camera);
    }

    executeNextMove() {
        const moveData = this.moveQueue.shift();
        if (!moveData) return;

        this.isAnimating = true;
        const move = moveData.move;
        const callback = moveData.callback || null;

        console.log('🔄 Executing move:', move);

        const face = move.charAt(0);
        let angle = 0;

        if (move.length > 1) {
            if (move.charAt(1) === "'") angle = -Math.PI / 2;
            else if (move.charAt(1) === '2') angle = Math.PI;
        } else {
            angle = Math.PI / 2;
        }

        let axis = new THREE.Vector3();
        let layer = 0;

        switch(face) {
            case 'R': axis.set(1, 0, 0); layer = 1; break;
            case 'L': axis.set(1, 0, 0); layer = -1; break;
            case 'U': axis.set(0, 1, 0); layer = 1; break;
            case 'D': axis.set(0, 1, 0); layer = -1; break;
            case 'F': axis.set(0, 0, 1); layer = 1; break;
            case 'B': axis.set(0, 0, 1); layer = -1; break;
            default: this.isAnimating = false; if (callback) callback(); return;
        }

        const layerCubies = [];
        const pos = layer * 0.95;

        this.cubies.forEach(cubie => {
            let isOnLayer = false;
            const p = cubie.position;
            
            if (axis.x === 1 && Math.abs(p.x - pos) < 0.2) isOnLayer = true;
            else if (axis.y === 1 && Math.abs(p.y - pos) < 0.2) isOnLayer = true;
            else if (axis.z === 1 && Math.abs(p.z - pos) < 0.2) isOnLayer = true;
            
            if (isOnLayer) layerCubies.push(cubie);
        });

        if (layerCubies.length === 0) {
            console.warn('⚠️ No cubies found for layer:', layer);
            this.isAnimating = false;
            if (callback) callback();
            return;
        }

        const group = new THREE.Group();
        layerCubies.forEach(cubie => {
            this.scene.remove(cubie);
            group.add(cubie);
        });
        this.scene.add(group);

        const totalSteps = 20;
        let currentStep = 0;
        const targetAngle = angle;

        const animateRotation = () => {
            currentStep++;
            const progress = currentStep / totalSteps;
            const currentAngle = targetAngle * progress;
            
            group.quaternion.setFromAxisAngle(axis, currentAngle);

            if (currentStep < totalSteps) {
                requestAnimationFrame(animateRotation);
            } else {
                group.quaternion.setFromAxisAngle(axis, targetAngle);
                group.updateMatrixWorld(true);

                const children = [...group.children];
                children.forEach(cubie => {
                    group.remove(cubie);
                    const worldPos = new THREE.Vector3();
                    cubie.getWorldPosition(worldPos);
                    cubie.position.copy(worldPos);
                    const worldQuat = new THREE.Quaternion();
                    cubie.getWorldQuaternion(worldQuat);
                    cubie.quaternion.copy(worldQuat);
                    this.scene.add(cubie);
                });
                this.scene.remove(group);

                this.isAnimating = false;
                this.isSolved = false;  // Mark as not solved after any move
                if (callback) callback();
            }
        };

        animateRotation();
    }

    performMove(move) {
        return new Promise((resolve) => {
            this.moveQueue.push({ move, callback: resolve });
        });
    }

    async scramble() {
        if (this.isScrambling) {
            console.log('⚠️ Already scrambling!');
            return;
        }
        
        console.log('🔀 Starting scramble...');
        this.isScrambling = true;
        this.isSolved = false;

        // Reset first
        this.reset();
        await new Promise(resolve => setTimeout(resolve, 200));

        // Generate 30 random moves
        const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
        const modifiers = ['', "'", '2'];
        const moves = [];

        let lastFace = '';
        
        // Use 30 moves for a good scramble
        const numMoves = 30;
        
        for (let i = 0; i < numMoves; i++) {
            let face = faces[Math.floor(Math.random() * faces.length)];
            
            // Avoid same face twice in a row
            while (face === lastFace) {
                face = faces[Math.floor(Math.random() * faces.length)];
            }
            
            // Avoid opposite faces that cancel out
            const opposite = {
                'R': 'L', 'L': 'R',
                'U': 'D', 'D': 'U',
                'F': 'B', 'B': 'F'
            };
            
            if (opposite[face] === lastFace) {
                // Try a different face
                const available = faces.filter(f => f !== lastFace && opposite[f] !== lastFace);
                if (available.length > 0) {
                    face = available[Math.floor(Math.random() * available.length)];
                }
            }
            
            const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
            const move = face + mod;
            moves.push(move);
            lastFace = face;
        }

        console.log(`🔄 Scramble (${moves.length} moves):`, moves.join(' '));
        
        // Store scramble moves
        this.scrambleMoves = [...moves];

        // Execute all moves
        for (let i = 0; i < moves.length; i++) {
            await this.performMove(moves[i]);
            await new Promise(resolve => setTimeout(resolve, 20));
        }

        this.isScrambling = false;
        this.isSolved = false;
        console.log('✅ Scramble complete! Cube is scrambled.');
        console.log('📝 Scramble moves saved:', this.scrambleMoves.length, 'moves');
        
        return moves;
    }

    reset() {
        console.log('🔄 Resetting cube...');
        this.moveQueue = [];
        this.isAnimating = false;
        this.isScrambling = false;
        this.scrambleMoves = [];
        this.isSolved = true;
        this.createCube();
        console.log('✅ Cube reset to solved state');
    }

    getState() {
        try {
            if (this.scrambleMoves.length > 0) {
                return 'SCRAMBLED';
            }
            return 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
        } catch (error) {
            console.error('Error in getState:', error);
            return 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
        }
    }

    setupResize() {
        const observer = new ResizeObserver(() => this.resize());
        observer.observe(this.container);
    }

    resize() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        if (w > 0 && h > 0) {
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        }
    }
}