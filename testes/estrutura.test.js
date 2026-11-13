import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const raiz = new URL('../', import.meta.url).pathname;
const ler = f => fs.readFileSync(path.join(raiz, f), 'utf8');
const html = ler('index.html');
const jsArqs = fs.readdirSync(path.join(raiz, 'js')).filter(f => f.endsWith('.js'));
const js = Object.fromEntries(jsArqs.map(f => [f, ler('js/' + f)]));
const todoJs = Object.values(js).join('\n');

test('todo id usado no JavaScript existe na página', () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  const dinamicos = new Set([...todoJs.matchAll(/\bid="([^"$]+)"/g)].map(m => m[1]));
  const usados = new Set([...todoJs.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1]));
  const faltam = [...usados].filter(i => !ids.has(i) && !dinamicos.has(i));
  assert.deepEqual(faltam, []);
});

test('todo botão (data-a) tem tratamento e nenhum tratamento está sobrando', () => {
  const botoes = new Set([...html.matchAll(/data-a="([^"$]+)"/g)].map(m => m[1])
    .concat([...todoJs.matchAll(/data-a="([^"$]+)"/g)].map(m => m[1]))
    .concat([...js['interface21.js'].matchAll(/\bb\('([a-z]+)',/g)].map(m => m[1])));   // botões criados por uma função auxiliar
  const tratadas = new Set([...js['main.js'].matchAll(/a === '([^']+)'/g)].map(m => m[1]).concat([...js['acoes21.js'].matchAll(/case '([^']+)'/g)].map(m => m[1])));
  assert.deepEqual([...botoes].filter(b => !tratadas.has(b)), [], 'botões sem tratamento');
  assert.deepEqual([...tratadas].filter(b => !botoes.has(b)), [], 'tratamentos sem botão');
});

test('arquivos referenciados existem e o service worker conhece todos os módulos', () => {
  for (const ref of [...html.matchAll(/(?:href|src)="([^"#]+)"/g)].map(m => m[1]).filter(r => !r.startsWith('http')))
    assert.ok(fs.existsSync(path.join(raiz, ref)), ref);
  const sw = ler('sw.js');
  for (const f of jsArqs) assert.ok(sw.includes("'js/" + f + "'"), 'sw.js sem js/' + f);
  for (const f of fs.readdirSync(path.join(raiz, 'css'))) assert.ok(sw.includes("'css/" + f + "'"), 'sw.js sem css/' + f);
});

test('nenhum texto de navegação ficou como palavra onde agora há ícone', () => {
  for (const nome of ['Estatísticas', 'Conquistas', 'Opções', 'Ajuda']) {
    assert.ok(!new RegExp('>' + nome + '</button>').test(html), nome + ' ainda é texto em um botão');
  }
  assert.ok(!/>Voltar<\/button>/.test(html));
});
