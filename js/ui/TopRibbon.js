export class TopRibbon {

    constructor() {

        this.element = null;

    }

    create() {

        this.element = document.createElement("div");

        this.element.id = "topRibbon";

        this.element.innerHTML = `

<div class="left">

    <div class="logo">✈ AeroVerse</div>

</div>

<div class="center">

    <div class="infoBox">
        <span>SPD</span>
        <h2 id="hudSpeed">0</h2>
    </div>

    <div class="infoBox">
        <span>ALT</span>
        <h2 id="hudAlt">0</h2>
    </div>

    <div class="infoBox">
        <span>HDG</span>
        <h2 id="hudHeading">000</h2>
    </div>

    <div class="infoBox">
        <span>VS</span>
        <h2 id="hudVS">0</h2>
    </div>

</div>

<div class="right">

    <button id="btnMap">MAP</button>
    <button id="btnWeather">WX</button>
    <button id="btnSettings">⚙</button>

</div>

`;

        document.body.appendChild(this.element);

        this.createCSS();

    }

    createCSS() {

        const style = document.createElement("style");

        style.innerHTML = `

#topRibbon{

position:fixed;

top:0;

left:0;

width:100%;

height:60px;

background:rgba(15,20,30,.88);

backdrop-filter:blur(18px);

display:flex;

justify-content:space-between;

align-items:center;

padding:0 25px;

box-sizing:border-box;

z-index:9999;

}

.left{

font-size:24px;

font-weight:bold;

color:white;

}

.center{

display:flex;

gap:18px;

}

.infoBox{

color:white;

text-align:center;

min-width:70px;

}

.infoBox span{

font-size:10px;

opacity:.6;

}

.infoBox h2{

margin:0;

font-size:20px;

color:#00ffff;

}

.right{

display:flex;

gap:12px;

}

.right button{

width:45px;

height:38px;

border:none;

border-radius:10px;

background:#222;

color:white;

cursor:pointer;

}

`;

        document.head.appendChild(style);

    }

    update(){

    }

}