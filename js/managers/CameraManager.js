import * as THREE from "three";

export class CameraManager {

    constructor() {

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            50000
        );

    }

    getCamera() {
        return this.camera;
    }

}