function gerarProjeto(){

let tipo=document.getElementById("tipo").value;

let titulo=document.getElementById("titulo").value;

let cor=document.getElementById("cor").value;

let html="";

if(tipo=="site"){

html=`

<h1 style="color:${cor};">${titulo}</h1>

<p>Este é um site criado automaticamente.</p>

`;

}

if(tipo=="app"){

html=`

<h1 style="color:${cor};">${titulo}</h1>

<p>Aplicativo criado automaticamente.</p>

<button>Abrir</button>

`;

}

if(tipo=="jogo"){

html=`

<h1 style="color:${cor};">${titulo}</h1>

<canvas id="game" width="400" height="250" style="background:black;"></canvas>

`;

}

document.getElementById("preview").innerHTML=html;

}
