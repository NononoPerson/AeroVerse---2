import * as THREE from "three";


/* ==========================================================
   AeroVerse Futuristic Airport System
========================================================== */


export function createFuturisticAirport(scene, position){


const airport = new THREE.Group();


airport.position.copy(position);



/* ==========================================================
   Materials
========================================================== */


const runwayMaterial =
new THREE.MeshStandardMaterial({

    color:0x151515,

    roughness:0.8

});



const glassMaterial =
new THREE.MeshStandardMaterial({

    color:0x55ccff,

    metalness:0.8,

    roughness:0.2,

    transparent:true,

    opacity:0.65

});



const neonMaterial =
new THREE.MeshStandardMaterial({

    color:0x00ffff,

    emissive:0x00ffff,

    emissiveIntensity:3

});




/* ==========================================================
   Main Runway
========================================================== */


const runway =
new THREE.Mesh(

new THREE.BoxGeometry(

    400,

    0.2,

    50

),


runwayMaterial


);


runway.position.y=0.1;


runway.receiveShadow=true;


airport.add(runway);





/* ==========================================================
   Runway LED Lights
========================================================== */


for(let i=-180;i<=180;i+=20){


const light =
new THREE.Mesh(

new THREE.BoxGeometry(

    3,

    0.1,

    0.5

),


neonMaterial


);



light.position.set(

    i,

    0.25,

    0

);


airport.add(light);


}





/* ==========================================================
   Futuristic Terminal
========================================================== */


const terminal =
new THREE.Mesh(

new THREE.BoxGeometry(

    120,

    25,

    40

),


glassMaterial


);



terminal.position.set(

    0,

    12,

    -80

);


terminal.castShadow=true;


airport.add(terminal);





/* ==========================================================
   Control Tower
========================================================== */


const towerBase =
new THREE.Mesh(

new THREE.CylinderGeometry(

    8,

    12,

    50,

    32

),


glassMaterial


);



towerBase.position.set(

70,

25,

-60

);


airport.add(towerBase);




const towerTop =
new THREE.Mesh(

new THREE.SphereGeometry(

12,

32,

16

),


neonMaterial


);


towerTop.position.set(

70,

52,

-60

);



airport.add(towerTop);





/* ==========================================================
   Hangars
========================================================== */


for(let i=0;i<3;i++){


const hangar =
new THREE.Mesh(

new THREE.BoxGeometry(

40,

20,

50

),


glassMaterial


);



hangar.position.set(

-100 + i*50,

10,

-100

);



airport.add(hangar);


}





/* ==========================================================
   Helipad
========================================================== */


const pad =
new THREE.Mesh(

new THREE.CylinderGeometry(

25,

25,

0.3,

64

),


neonMaterial


);


pad.position.set(

120,

0.2,

50

);


airport.add(pad);





scene.add(airport);



return airport;


}