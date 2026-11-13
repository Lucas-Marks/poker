// Estatísticas do jogador e conquistas.
import { LS, STATS_KEY } from './armazenamento.js';

export const defStats = () => ({games:0, wins:0, losses:0, chipsWon:0, chipsLost:0, hands:0, handsWon:0, biggest:0, bestVal:-1,
  streak:0, bestStreak:0, byDiff:{facil:{g:0,w:0}, medio:{g:0,w:0}, dificil:{g:0,w:0}}, ach:{}, placeSum:0, placeGames:0,
  bj:{games:0, wins:0, losses:0, rounds:0, roundsWon:0, blackjacks:0, biggest:0, chipsWon:0, chipsLost:0, bestStreak:0},
  arc:{games:0, wins:0, losses:0, rounds:0, roundsWon:0, trumps:0}});

export let ST = Object.assign(defStats(), LS.get(STATS_KEY, {}));

['facil','medio','dificil'].forEach(d => { ST.byDiff[d] = Object.assign({g:0, w:0}, (ST.byDiff || {})[d]); });

if (!ST.ach) ST.ach = {};
ST.bj = Object.assign(defStats().bj, ST.bj);
ST.arc = Object.assign(defStats().arc, ST.arc);

/* hand: avaliada ao fim de cada mão | game: avaliada ao fim de uma partida concluída */
export const ACH = [
  {id:'first',    name:'Primeira vitória',    desc:'Vença uma partida.',                                  game:c => c.win},
  {id:'ten',      name:'Dez vitórias',        desc:'Vença 10 partidas.',                                  game:c => c.win && ST.wins >= 10},
  {id:'streak',   name:'Em sequência',        desc:'Vença 3 partidas seguidas.',                          game:c => c.win && ST.streak >= 3},
  {id:'dfacil',   name:'Mesa Fácil dominada', desc:'Vença uma partida na dificuldade Fácil.',             game:c => c.win && c.diff === 'facil'},
  {id:'dmedio',   name:'Mesa Média dominada', desc:'Vença uma partida na dificuldade Médio.',             game:c => c.win && c.diff === 'medio'},
  {id:'ddificil', name:'Mesa Difícil dominada', desc:'Vença uma partida na dificuldade Difícil.',         game:c => c.win && c.diff === 'dificil'},
  {id:'masters',  name:'Contra os mestres',   desc:'Vença com pelo menos 2 Profissionais na mesa.',       game:c => c.win && c.pros >= 2},
  {id:'headsup',  name:'Cara a cara',         desc:'Vença uma partida de 2 jogadores.',                   game:c => c.win && c.startN === 2},
  {id:'full8',    name:'Mesa cheia',          desc:'Vença uma partida com 8 jogadores.',                  game:c => c.win && c.startN === 8},
  {id:'comeback', name:'Sobrevivente',        desc:'Vença depois de ficar com menos de 10% das fichas iniciais.', game:c => c.win && c.minStack < 0.1 * c.buy},
  {id:'hands100', name:'Maratonista',         desc:'Jogue 100 mãos em partidas concluídas.',              game:c => ST.hands >= 100},
  {id:'fullhouse',name:'Casa cheia',          desc:'Ganhe uma mão com Full house ou melhor.',             hand:c => c.won && c.showdown && c.cat >= 6},
  {id:'quads',    name:'Quadra!',             desc:'Ganhe uma mão com Quadra ou melhor.',                 hand:c => c.won && c.showdown && c.cat >= 7},
  {id:'sflush',   name:'Straight flush',      desc:'Ganhe uma mão com Straight flush.',                   hand:c => c.won && c.showdown && c.cat >= 8},
  {id:'allin',    name:'Tudo ou nada',        desc:'Ganhe uma mão em que você estava all-in.',            hand:c => c.won && c.showdown && c.allIn},
  {id:'bluff',    name:'Blefe perfeito',      desc:'Faça todos desistirem tendo só carta alta.',          hand:c => c.won && !c.showdown && c.bluff},
  {id:'bigpot',   name:'Pote gigante',        desc:'Ganhe um pote de pelo menos o dobro das suas fichas iniciais.', hand:c => c.wonAmt >= 2 * c.buy},
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
  {id:'arc_alta',    modo:'arc', name:'Tudo na mesa',         desc:'Ganhe uma rodada com 5 ou mais fichas em jogo.',            arcround:c => c.venceu && c.aposta >= 5}
];

export function unlockAch(kind, ctx){
  const out = [];
  ACH.forEach(a => {
    if (a[kind] && !ST.ach[a.id] && a[kind](ctx)){ ST.ach[a.id] = Date.now(); out.push(a.name); }
  });
  if (out.length) LS.set(STATS_KEY, ST);
  return out;
}

export function resetStats(){
  ST = defStats();
  LS.set(STATS_KEY, ST);
}
