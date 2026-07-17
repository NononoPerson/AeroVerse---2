import * as THREE from "three";

export class Renderer {

    constructor() {

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });

        this.renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        this.renderer.setPixelRatio(
            Math.min(window.devicePixelRatio, 2)
        );

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;

        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        document.body.appendChild(this.renderer.domElement);
    }

    getRenderer() {
        return this.renderer;
    }

}