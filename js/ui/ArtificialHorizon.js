export class ArtificialHorizon {

    constructor() {

        this.canvas = null;
        this.ctx = null;

    }

    create() {

        const container = document.createElement("div");

        container.id = "horizonContainer";

        container.innerHTML = `

<button id="toggleHorizon">−</button>

<canvas id="horizonCanvas"></canvas>

`;

        document.body.appendChild(container);

        this.canvas = document.getElementById("horizonCanvas");
        this.ctx = this.canvas.getContext("2d");

        this.canvas.width = 250;
        this.canvas.height = 250;

        this.createCSS();

    }

    createCSS() {

        const style = document.createElement("style");

        style.innerHTML = `

#horizonContainer{

position:fixed;

bottom:20px;

right:20px;

width:250px;

height:250px;

border-radius:20px;

background:rgba(15,20,30,.6);

backdrop-filter:blur(18px);

overflow:hidden;

z-index:999;

}

#horizonCanvas{

width:100%;

height:100%;

}

`;

        document.head.appendChild(style);

    }

    update(roll,pitch){

        const ctx=this.ctx;

        const w=250;
        const h=250;

        ctx.clearRect(0,0,w,h);

        ctx.save();

        ctx.translate(w/2,h/2);

        ctx.rotate(roll);

        const offset=pitch*120;

        ctx.fillStyle="#61b8ff";
        ctx.fillRect(-300,-300+offset,600,300);

        ctx.fillStyle="#7b5b34";
        ctx.fillRect(-300,offset,600,300);

        ctx.restore();

    }

}