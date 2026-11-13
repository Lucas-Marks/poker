import re
def rd(p): return open(p,encoding='utf-8').read()
def wr(p,s): open(p,'w',encoding='utf-8').write(s)
def rep(s,old,new,count=1):
    assert s.count(old)>=1, ('ANCORA',old[:90])
    if count==1: assert s.count(old)==1, ('ANCORA repetida',old[:90],s.count(old))
    return s.replace(old,new) if count!=1 else s.replace(old,new,1)

# ---------------- CSS: layout rolável em todas as telas ----------------
b=rd('css/base.css')
b=rep(b,".screen{height:100%;max-width:480px;margin:0 auto;padding:16px;display:flex;flex-direction:column;}",
""".screen{height:100%;max-width:480px;margin:0 auto;padding:16px;display:flex;flex-direction:column;gap:16px;overflow-y:auto;-webkit-overflow-scrolling:touch;}
.screen>*{flex:none;}
.screen>:first-child{margin-top:auto;}
.screen>:last-child{margin-bottom:auto;}""")
wr('css/base.css',b)
t=rd('css/telas.css')
t=rep(t,"#menu,#win{justify-content:center;gap:24px;}","#menu,#win,#home,#bjmenu,#fim21{gap:24px;}")
t=re.sub(r"#tables\{overflow-y:auto;[^\n]*\n","",t); assert '#tables{' not in t
wr('css/telas.css',t)

# ---------------- config: regras do blackjack e adversários do arcade ----------------
c=rd('js/config.js')
c+='''
/* Blackjack clássico: regras por dificuldade (meta = quantas vezes as fichas iniciais; cada = rodadas até subir a aposta mínima) */
export const BJ_REGRAS = {
  facil:   {decks:2, pagamento:'3:2', soft17:'stand', meta:2, cada:15},
  medio:   {decks:6, pagamento:'3:2', soft17:'stand', meta:3, cada:12},
  dificil: {decks:8, pagamento:'6:5', soft17:'hit',   meta:4, cada:10}
};
export const BJ_TABLES = TABLES.map(t => Object.assign({buy:t.buy, min:t.bb, max:t.bb * 20, diff:t.diff, goal:t.buy * BJ_REGRAS[t.diff].meta}, BJ_REGRAS[t.diff]));

/* Blackjack arcade: adversários (a personalidade fica escondida fora do modo treino) */
export const ARC_OPPS = [
  {id:'ana',   nome:'Ana',   pers:'novato',        diff:'facil',   hp:10},
  {id:'bruno', nome:'Bruno', pers:'medroso',       diff:'facil',   hp:10},
  {id:'carla', nome:'Carla', pers:'copiador',      diff:'facil',   hp:10},
  {id:'diego', nome:'Diego', pers:'intermediario', diff:'medio',   hp:10},
  {id:'elisa', nome:'Elisa', pers:'enganador',     diff:'medio',   hp:10},
  {id:'fabio', nome:'Fábio', pers:'cacador',       diff:'medio',   hp:10},
  {id:'gabi',  nome:'Gabi',  pers:'vingativo',     diff:'medio',   hp:10},
  {id:'hugo',  nome:'Hugo',  pers:'agressivo',     diff:'dificil', hp:10},
  {id:'iara',  nome:'Iara',  pers:'mimico',        diff:'dificil', hp:10},
  {id:'julio', nome:'Júlio', pers:'trapaceiro',    diff:'dificil', hp:10},
  {id:'karen', nome:'Karen', pers:'profissional',  diff:'dificil', hp:10}
];
'''
wr('js/config.js',c)

# ---------------- estatísticas: blackjack e arcade ----------------
e=rd('js/estatisticas.js')
e=rep(e,"ach:{}, placeSum:0, placeGames:0});","ach:{}, placeSum:0, placeGames:0,\n  bj:{games:0, wins:0, losses:0, rounds:0, roundsWon:0, blackjacks:0, biggest:0, chipsWon:0, chipsLost:0, bestStreak:0},\n  arc:{games:0, wins:0, losses:0, rounds:0, roundsWon:0, trumps:0}});")
e=rep(e,"if (!ST.ach) ST.ach = {};","if (!ST.ach) ST.ach = {};\nST.bj = Object.assign(defStats().bj, ST.bj);\nST.arc = Object.assign(defStats().arc, ST.arc);")
i=e.index('export const ACH = [')
j=e.index('\n];',i)
novas='''
  /* Blackjack clássico (bjhand: fim de cada rodada | bjgame: fim de uma partida concluída) */
  {id:'bj_meta',     modo:'bj', name:'Meta batida',          desc:'Alcance a meta de fichas em uma mesa de blackjack.',        bjgame:c => c.win},
  {id:'bj_dificil',  modo:'bj', name:'Contra a banca difícil', desc:'Vença uma mesa de blackjack na dificuldade Difícil.',     bjgame:c => c.win && c.diff === 'dificil'},
  {id:'bj_rodadas',  modo:'bj', name:'Crupiê frequente',     desc:'Jogue 100 rodadas de blackjack em partidas concluídas.',     bjgame:c => ST.bj.rounds >= 100},
  {id:'bj_blackjack',modo:'bj', name:'21 de primeira',       desc:'Faça um blackjack (21 com as duas primeiras cartas).',      bjhand:c => c.blackjack},
  {id:'bj_dobro',    modo:'bj', name:'Dobro ou nada',        desc:'Ganhe uma mão em que você dobrou a aposta.',                bjhand:c => c.dobrouGanhou},
  {id:'bj_divisao',  modo:'bj', name:'Dividir e conquistar', desc:'Ganhe uma mão depois de dividir um par.',                   bjhand:c => c.dividiuGanhou},
  {id:'bj_seq5',     modo:'bj', name:'Maré de sorte',        desc:'Ganhe 5 rodadas seguidas.',                                 bjhand:c => c.sequencia >= 5},
  /* Blackjack arcade (arcround: fim de cada rodada | arcgame: fim de uma partida concluída) */
  {id:'arc_primeira',modo:'arc', name:'Primeiro duelo vencido', desc:'Vença uma partida do arcade.',                            arcgame:c => c.win},
  {id:'arc_dificil', modo:'arc', name:'Mestre das cartas',    desc:'Vença um adversário Difícil no arcade.',                    arcgame:c => c.win && c.diff === 'dificil'},
  {id:'arc_limpa',   modo:'arc', name:'Sem arranhões',        desc:'Vença uma partida do arcade sem perder nenhuma ficha.',     arcgame:c => c.win && c.hpFinal === c.hpMax},
  {id:'arc_fio',     modo:'arc', name:'Por um fio',           desc:'Vença uma partida do arcade com apenas 1 ficha.',           arcgame:c => c.win && c.hpFinal === 1},
  {id:'arc_cartas',  modo:'arc', name:'Colecionador',         desc:'Use 25 cartas especiais em partidas concluídas.',           arcgame:c => ST.arc.trumps >= 25},
  {id:'arc_alta',    modo:'arc', name:'Tudo na mesa',         desc:'Ganhe uma rodada com 5 ou mais fichas em jogo.',            arcround:c => c.venceu && c.aposta >= 5},'''
e=e[:j]+','+novas.rstrip(',')+e[j:] if not e[:j].rstrip().endswith(',') else e[:j]+novas.rstrip(',')+e[j:]
wr('js/estatisticas.js',e)

# ---------------- interface: telas novas, estatísticas e conquistas por jogo ----------------
f=rd('js/interface.js')
f=rep(f,"['menu','custom','win','game','stats','ach','opts','help'].forEach","['home','menu','custom','win','game','stats','ach','opts','help','bjmenu','bj','arc','fim21'].forEach")
f=rep(f,"  $('stDiff').innerHTML = DIFF_IDS.map(d => {","""  const bj = S.bj, bjRate = bj.games ? Math.round(100 * bj.wins / bj.games) + '%' : '—', bjNet = bj.chipsWon - bj.chipsLost;
  const linhas = rs => rs.map(r => `<div class="field stat"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('');
  $('stBJ').innerHTML = linhas([
    ['Partidas jogadas', bj.games], ['Metas batidas', bj.wins], ['Derrotas', bj.losses], ['Taxa de vitória', bjRate],
    ['Fichas ganhas', fmt(bj.chipsWon)], ['Fichas perdidas', fmt(bj.chipsLost)], ['Saldo de fichas', (bjNet > 0 ? '+' : '') + fmt(bjNet)],
    ['Rodadas jogadas', fmt(bj.rounds)], ['Rodadas ganhas', fmt(bj.roundsWon)], ['Blackjacks', bj.blackjacks],
    ['Maior ganho numa rodada', fmt(bj.biggest)], ['Melhor sequência de rodadas', bj.bestStreak]]);
  const ar = S.arc, arRate = ar.games ? Math.round(100 * ar.wins / ar.games) + '%' : '—';
  $('stArc').innerHTML = linhas([
    ['Partidas jogadas', ar.games], ['Vitórias', ar.wins], ['Derrotas', ar.losses], ['Taxa de vitória', arRate],
    ['Rodadas jogadas', fmt(ar.rounds)], ['Rodadas ganhas', fmt(ar.roundsWon)], ['Cartas especiais usadas', fmt(ar.trumps)]]);
  $('stDiff').innerHTML = DIFF_IDS.map(d => {""")
i=f.index("export function renderAch(){"); j=f.index("\n}\n",i)+3
f=f[:i]+'''export function renderAch(){
  const n = ACH.filter(a => ST.ach[a.id]).length;
  $('achCount').textContent = n + ' de ' + ACH.length + ' conquistas';
  const linha = a => {
    const ok = !!ST.ach[a.id];
    return `<div class="field ach${ok ? '' : ' lock'}"><span class="al"><span class="an">${a.name}</span><span class="ad">${a.desc}</span></span><span class="as${ok ? '' : ' dim'}">${ok ? 'Concluída' : 'Bloqueada'}</span></div>`;
  };
  const grupos = [['poker', 'Poker'], ['bj', 'Blackjack clássico'], ['arc', 'Blackjack arcade']];
  $('achBox').innerHTML = grupos.map(([m, titulo]) => {
    const lista = ACH.filter(a => (a.modo || 'poker') === m);
    return `<p class="small dim">${titulo} (${lista.filter(a => ST.ach[a.id]).length} de ${lista.length})</p><div class="box">${lista.map(linha).join('')}</div>`;
  }).join('');
}
'''+f[j:]
wr('js/interface.js',f)

# ---------------- main.js: ligação com os novos módulos ----------------
m=rd('js/main.js')
m=rep(m,"import { audio, sfx } from './som.js';","import { acao21, aoSlider21, iniciar21 } from './acoes21.js';\nimport { aplicarIcones } from './icones.js';\nimport { audio, sfx } from './som.js';")
m=rep(m,"applyTheme(settings.theme);\n","applyTheme(settings.theme);\n\naplicarIcones();\n\niniciar21();\n")
m=rep(m,"  } else if (id === 'cChips'){","  } else if (id === 'bjSlider'){\n    aoSlider21(+e.target.value);\n  } else if (id === 'cChips'){")
m=rep(m,"  const a = b.dataset.a;\n  audio();\n","  const a = b.dataset.a;\n  audio();\n  if (acao21(a, b.dataset)) return;\n")
m=rep(m,"if (a === 'mback'){ ui.confirmReset = false; return show('menu'); }","if (a === 'mback'){ ui.confirmReset = false; return show('home'); }")
wr('js/main.js',m)

# ---------------- index.html ----------------
h=rd('index.html')
h=rep(h,'<link rel="stylesheet" href="css/jogo.css">','<link rel="stylesheet" href="css/jogo.css">\n<link rel="stylesheet" href="css/blackjack.css">')
# menu do poker: volta para o início e perde a barra de ícones (ela vai para o início)
h=re.sub(r'<section id="menu" class="screen">\n  <div class="head">','<section id="menu" class="screen" hidden>\n  <div class="topbar"><button class="ib" data-a="home" data-ico="voltar" aria-label="Voltar"></button></div>\n  <div class="head">',h,count=1)
h=rep(h,'  <div class="box"><div class="row g2"><button data-a="stats">Estatísticas</button><button data-a="ach">Conquistas</button><button data-a="opts">Opções</button><button data-a="help">Ajuda</button></div></div>\n','')
HOME='''<section id="home" class="screen">
  <div class="head"><h1>Cartas</h1><p>Escolha um jogo. Tudo funciona sem internet e sem fichas para comprar.</p></div>
  <div class="box">
    <button class="opt" data-a="gpoker"><span class="ol"><span class="on">Poker</span><span class="od dim">Texas hold'em contra bots</span></span><span class="or"><span class="ob">9 mesas</span><span class="op">e personalizada</span></span></button>
    <button class="opt" data-a="gbj"><span class="ol"><span class="on">Blackjack</span><span class="od dim">Clássico e Arcade</span></span><span class="or"><span class="ob">21</span><span class="op">banca e duelo</span></span></button>
  </div>
  <div class="box"><div class="row">
    <button data-a="stats" data-ico="grafico" aria-label="Estatísticas"></button>
    <button data-a="ach" data-ico="trofeu" aria-label="Conquistas"></button>
    <button data-a="opts" data-ico="engrenagem" aria-label="Opções"></button>
    <button data-a="help" data-ico="ajuda" aria-label="Ajuda"></button>
  </div></div>
</section>

<section id="menu" class="screen" hidden>'''
h=h.replace('<section id="menu" class="screen" hidden>',HOME,1)
# voltar/fechar viram ícones
h=h.replace('<button data-a="mback">Voltar</button>','<button data-a="mback" data-ico="voltar" aria-label="Voltar"></button>')
h=rep(h,'<button data-a="cback">Voltar</button>','<button data-a="cback" data-ico="voltar" aria-label="Voltar"></button>')
h=rep(h,'<button data-a="hclose">Fechar</button>','<button data-a="hclose" data-ico="fechar" aria-label="Fechar"></button>')
h=rep(h,'<div class="lefts"><button class="link" data-a="exit">Sair</button><button class="link" data-a="hist">Histórico</button></div>','<div class="lefts"><button class="link ib" data-a="exit" data-ico="sair" aria-label="Sair"></button><button class="link ib" data-a="hist" data-ico="historico" aria-label="Histórico"></button></div>')
# estatísticas e conquistas por jogo
h=re.sub(r'<section id="stats" class="screen" hidden>.*?</section>','''<section id="stats" class="screen" hidden>
  <div class="head"><h1>Estatísticas</h1></div>
  <p class="small dim">Poker</p>
  <div class="box" id="stBox"></div>
  <div class="box" id="stDiff"></div>
  <p class="small dim">Blackjack clássico</p>
  <div class="box" id="stBJ"></div>
  <p class="small dim">Blackjack arcade</p>
  <div class="box" id="stArc"></div>
  <p class="small dim">Partidas abandonadas não entram na conta.</p>
  <div class="box"><div class="row"><button data-a="mback" data-ico="voltar" aria-label="Voltar"></button></div></div>
</section>''',h,count=1,flags=re.S)
h=rep(h,'<div class="box" id="achBox"></div>','<div id="achBox" class="grupos"></div>')
# ajuda: cartas especiais do arcade e resumo do blackjack
h=rep(h,'    <div class="hp"><b>Continuar partida.</b>','''    <div class="hp"><b>Blackjack clássico.</b> Chegue o mais perto de 21 sem passar. Ás vale 1 ou 11, figuras valem 10. Dobrar: uma carta só, aposta em dobro. Dividir: separa um par em duas mãos. Blackjack paga 3 para 2 (6 para 5 nas mesas difíceis). Vença batendo a meta de fichas da mesa.</div>
    <div class="hp"><b>Blackjack arcade.</b> Duelo 1 contra 1 com baralho de 1 a 11. Quem perde a rodada perde fichas igual ao valor em jogo, que sobe com o tempo. Use cartas especiais na sua vez e depois compre ou pare.</div>
    <div class="hp"><b>Continuar partida.</b>''')
h=rep(h,'  <div class="box"><div class="row"><button data-a="mback" data-ico="voltar" aria-label="Voltar"></button></div></div>\n</section>\n\n<section id="win"','  <p class="small dim">Cartas especiais do arcade</p>\n  <div class="box" id="helpEsp"></div>\n  <div class="box"><div class="row"><button data-a="mback" data-ico="voltar" aria-label="Voltar"></button></div></div>\n</section>\n\n<section id="win"')
NOVAS='''<section id="bjmenu" class="screen" hidden>
  <div class="topbar"><button class="ib" data-a="home" data-ico="voltar" aria-label="Voltar"></button></div>
  <div class="head"><h1>Blackjack</h1><p id="bjdesc"></p></div>
  <div class="box"><div class="row"><button data-a="bjtab" data-t="classico" id="bjtC">Clássico</button><button data-a="bjtab" data-t="arcade" id="bjtA">Arcade</button></div></div>
  <div class="box" id="bjlist"></div>
</section>

<section id="bj" class="screen" hidden>
  <div class="top">
    <div class="lefts"><button class="link ib" data-a="bjexit" data-ico="sair" aria-label="Sair"></button></div>
    <div class="left" id="bjInfo"></div>
  </div>
  <div class="mesa21">
    <div class="area21" id="bjDealer"></div>
    <div class="msg" id="bjMsg"></div>
    <div class="maos21" id="bjHands"></div>
  </div>
  <div class="tr" id="bjTrain"></div>
  <div id="bjActions" class="box actions"></div>
</section>

<section id="arc" class="screen" hidden>
  <div class="top">
    <div class="lefts"><button class="link ib" data-a="arcexit" data-ico="sair" aria-label="Sair"></button></div>
    <div class="left" id="arcInfo"></div>
  </div>
  <div class="area21" id="arcOpp"></div>
  <div class="aviso21" id="arcAviso"></div>
  <div class="msg" id="arcMsg"></div>
  <div class="area21" id="arcMe"></div>
  <div class="tr" id="arcTrain"></div>
  <div id="arcEsp" class="box espbox"></div>
  <div id="arcActions" class="box actions"></div>
</section>

<section id="fim21" class="screen" hidden>
  <div class="head"><h1 id="fimTitulo">Vitória</h1><p id="fimTexto"></p><p id="fimAch" class="small"></p></div>
  <div class="box"><div class="row"><button data-a="again21">Jogar de novo</button><button data-a="menu21">Voltar ao menu</button></div></div>
</section>

<div id="modal"'''
h=rep(h,'<div id="modal"',NOVAS)
wr('index.html',h)

# ---------------- sw.js ----------------
s=rd('sw.js')
s=rep(s,"'css/jogo.css',","'css/jogo.css', 'css/blackjack.css',")
s=rep(s,"'js/personalizada.js',","'js/personalizada.js', 'js/icones.js', 'js/blackjack.js', 'js/arcade.js', 'js/interface21.js', 'js/acoes21.js',")
wr('sw.js',s)
print('patch 1 ok')
