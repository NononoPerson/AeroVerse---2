import * as THREE from "three";

export class Engine {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
    }

    getScene() {
        return this.scene;
    }
}