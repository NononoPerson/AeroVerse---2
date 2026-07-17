export class Ribbon {

    constructor() {

        this.container = null;

    }

    create() {

        this.container = document.createElement("div");

        this.container.id = "topRibbon";

        this.container.innerHTML = `

        <div class="hudBox">
            <div class="label">SPD</div>
            <div id="hudSpeed">0</div>
        </div>

        <div class="hudBox">
            <div class="label">ALT</div>
            <div id="hudAlt">0</div>
        </div>

        <div class="hudBox">
            <div class="label">HDG</div>
            <div id="hudHeading">000</div>
        </div>

        <div class="hudBox">
            <div class="label">VS</div>
            <div id="hudVS">0</div>
        </div>

        <div class="hudBox">
            <div class="label">ENG</div>
            <div id="hudEngine">OFF</div>
        </div>

        `;

        document.body.appendChild(this.container);

        this.createStyle();

    }

    createStyle() {

        const style = document.createElement("style");

        style.textContent = `

#topRibbon{

position:fixed;

top:15px;

left:50%;

transform:translateX(-50%);

display:flex;

gap:18px;

padding:14px 18px;

background:rgba(15,20,30,.55);

backdrop-filter:blur(14px);

border-radius:18px;

border:1px solid rgba(255,255,255,.12);

color:white;

z-index:1000;

}

.hudBox{

min-width:80px;

text-align:center;

}

.label{

font-size:11px;

opacity:.65;

letter-spacing:1px;

}

.hudBox div:last-child{

margin-top:4px;

font-size:22px;

font-weight:bold;

color:#00ffff;

}

`;

        document.head.appendChild(style);

    }

}