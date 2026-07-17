export const joystick = {

    container: null,
    stick: null,

    x: 0,
    y: 0,

    maxRadius: 60

};

export function createJoystick() {

    // Outer Circle
    joystick.container = document.createElement("div");

    joystick.container.style.position = "fixed";
    joystick.container.style.left = "50%";
    joystick.container.style.bottom = "40px";
    joystick.container.style.transform = "translateX(-50%)";

    joystick.container.style.width = "140px";
    joystick.container.style.height = "140px";

    joystick.container.style.border = "2px solid rgba(255,255,255,.6)";
    joystick.container.style.borderRadius = "50%";

    joystick.container.style.pointerEvents = "none";

    joystick.container.style.zIndex = "999";

    // Stick

    joystick.stick = document.createElement("div");

    joystick.stick.style.position = "absolute";

    joystick.stick.style.left = "50%";
    joystick.stick.style.top = "50%";

    joystick.stick.style.width = "24px";
    joystick.stick.style.height = "24px";

    joystick.stick.style.background = "white";
    joystick.stick.style.borderRadius = "50%";

    joystick.stick.style.transform = "translate(-50%, -50%)";

    joystick.container.appendChild(joystick.stick);

    document.body.appendChild(joystick.container);

}
export class Joystick {
    constructor() {
        // joystick code
    }
}