// Estado compartilhado da interface (ui) e controle das animações (anim).

export const ui = {raising:false, val:0, exiting:false, confirmReset:false};

/* Animações: cada carta/linha só anima na primeira vez que aparece (mesmo que a tela seja redesenhada várias vezes seguidas) */
export const anim = {seen:new Set(), pending:new Set(), timer:null, t0:0, pot:undefined, msg:undefined};
