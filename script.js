/* -------------------------------------------------------------
   script.js  –  versão com “Ver Depois” 100 % funcional
   + mostra gabarito das questões NÃO respondidas logo abaixo do
     campo de resposta depois que o botão GABARITO é acionado
   + adiciona totalizador: Nota final = básico + (2 × específico), mesmo que uma parte ainda não tenha sido corrigida
------------------------------------------------------------- */

let dadosProva = null;
let parteAtual = 'basicos';
let dados;
let liquidoBasico = null;
let liquidoEspecifico = null;

function carregarProva() {
  fetch(dados)
    .then(res => res.json())
    .then(json => {
      dadosProva = json;
      parteAtual = 'basicos';
      renderizarParte(parteAtual);
      updateAbas();
    });
}

document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('prova-select');
  const styleTag = document.createElement('style');
  styleTag.textContent = `.gabarito-correto{font-size:0.85em;color:#204389;display:block;margin-top:4px;}`;
  document.head.appendChild(styleTag);

  select.addEventListener('change', () => {
    dados = `provas/${select.value}.json`;
    carregarProva();
  });

  dados = `provas/${select.value}.json`;
  carregarProva();

  document.getElementById('btn-basico').onclick = () => {
    parteAtual = 'basicos';
    renderizarParte(parteAtual);
    updateAbas();
  };
  document.getElementById('btn-especifico').onclick = () => {
    parteAtual = 'especificos';
    renderizarParte(parteAtual);
    updateAbas();
  };

  document.getElementById('btn-limpar').onclick = limparLocalStorage;
});

function updateAbas() {
  document.getElementById('btn-basico').classList.toggle('ativo', parteAtual === 'basicos');
  document.getElementById('btn-especifico').classList.toggle('ativo', parteAtual === 'especificos');
}

function limparLocalStorage() {
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith('resposta-') || k.startsWith('gabarito-') || k.startsWith('verDepois-')) {
      localStorage.removeItem(k);
    }
  });
  document.getElementById('gabarito-result').style.display = 'none';
  renderizarParte(parteAtual);
}

function renderizarParte(parte) {
  if (!dadosProva) return;
  const data = dadosProva[parte];
  if (!data) return;

  document.getElementById('titulo-prova').innerText = data.titulo || '';

  let textoHtml = '';
  if (data.texto && Array.isArray(data.texto.linhas)) {
    textoHtml = `<h2 id="titulo-texto">${data.texto.titulo || ''}</h2>` +
      data.texto.linhas.map((ln, i) => `<div class="linha-texto"><span class="linha-numero">${i + 1}</span>${ln}</div>`).join('');
  }

  let todas = [];
  data.temas.forEach(t => t.questoes?.forEach(q => todas.push({ ...q, tema: t.nome })));

  const metade = Math.ceil(todas.length / 2);
  const esquerda = todas.slice(0, metade);
  const direita = todas.slice(metade);

  document.getElementById('coluna-esquerda').innerHTML = (textoHtml || '') + renderQuestoesAgrupadas(data.temas, esquerda);
  document.getElementById('coluna-direita').innerHTML = renderQuestoesAgrupadas(data.temas, direita);

  document.querySelectorAll('.campo-resposta').forEach(inp => {
    const qid = inp.dataset.qid;
    const salvo = localStorage.getItem(`resposta-${qid}`);
    if (salvo) {
      inp.value = salvo;
      inp.classList.toggle('certo', salvo === 'C');
      inp.classList.toggle('errado', salvo === 'E');
    }
    inp.addEventListener('input', function () {
      const v = this.value.trim().toUpperCase();
      if (v === 'C' || v === 'E') localStorage.setItem(`resposta-${qid}`, v);
      else localStorage.removeItem(`resposta-${qid}`);
      this.classList.toggle('certo', v === 'C');
      this.classList.toggle('errado', v === 'E');
      this.closest('li').classList.remove('questao-erro');
    });
  });

  document.querySelectorAll('.btn-ver-depois').forEach(btn => {
    const qid = btn.dataset.qid;
    const marcado = localStorage.getItem(`verDepois-${qid}`) === 'true';
    btn.textContent = marcado ? '✅' : '☑️';
    if (marcado) btn.closest('li').classList.add('marcado');

    btn.addEventListener('click', e => {
      e.preventDefault();
      const li = btn.closest('li');
      const novoEstado = li.classList.toggle('marcado');
      btn.textContent = novoEstado ? '✅' : '☑️';
      localStorage.setItem(`verDepois-${qid}`, novoEstado);
    });
  });

  const gabSave = localStorage.getItem(`gabarito-${parte}`);
  document.getElementById('gabarito-result').style.display = gabSave ? 'block' : 'none';
  if (gabSave) document.getElementById('gabarito-result').innerHTML = gabSave;

  document.getElementById('btn-gabarito').onclick = () => corrigirGabarito(data);
}

function renderQuestoesAgrupadas(temas, lista) {
  if (!lista.length) return '';
  let html = '';
  temas.forEach(t => {
    const qs = lista.filter(q => q.tema === t.nome);
    if (!qs.length) return;
    html += `<div class="tema"><h3 style="text-align:center;">${t.nome}</h3><ol>`;
    qs.forEach(q => {
      const marcado = localStorage.getItem(`verDepois-${q.id}`) === 'true';
      html += `<li class="${marcado ? 'marcado' : ''}">
        <span class="numero-questao">${q.id}.</span>
        <span style="margin-right:8px;">${q.enunciado}</span>
        <input class="campo-resposta" maxlength="1" data-qid="${q.id}" title="Digite C ou E">
        <button type="button" class="btn-ver-depois" data-qid="${q.id}" title="Marcar para rever">${marcado ? '✅' : '☑️'}</button>
      </li>`;
    });
    html += '</ol></div>';
  });
  return html;
}

function corrigirGabarito(data) {
  document.querySelectorAll('.questao-erro').forEach(el => el.classList.remove('questao-erro'));
  document.querySelectorAll('.gabarito-correto').forEach(el => el.remove());

  let ordem = [];
  data.temas.forEach(t => t.questoes.forEach(q => ordem.push({ ...q, tema: t.nome })));

  let resp = {};
  document.querySelectorAll('.campo-resposta').forEach(i => resp[i.dataset.qid] = i.value.trim().toUpperCase());

  let total = 0, acertos = 0, erros = 0, vazios = 0;
  let temaStats = {};
  data.temas.forEach(t => temaStats[t.nome] = { acertos: 0, erros: 0, vazios: 0, total: 0 });

  ordem.forEach(q => {
    const r = resp[q.id] || '';
    const g = (q.gabarito || '').toUpperCase();
    const inp = document.querySelector(`.campo-resposta[data-qid="${q.id}"]`);
    const li = inp?.closest('li');

    if (!r) {
      vazios++; temaStats[q.tema].vazios++;
      if (li) {
        const div = document.createElement('div');
        div.className = 'gabarito-correto';
        div.textContent = `${g}`;
        li.appendChild(div);
      }
    }
    else if (r === g) {
      acertos++; total++; temaStats[q.tema].acertos++; temaStats[q.tema].total++;
    } else {
      erros++; total--; temaStats[q.tema].erros++; temaStats[q.tema].total--;
      li?.classList.add('questao-erro');
    }
  });

  if (parteAtual === 'basicos') liquidoBasico = total;
  if (parteAtual === 'especificos') liquidoEspecifico = total;

  const cor = total > 10 ? 'gabarito-azul' : 'gabarito-vermelho';
  let html = `<div class="${cor}" style="padding:22px 0 12px 0;">
    <b>Acertos: ${acertos}</b>&nbsp;&nbsp;
    <b>Erros: ${erros}</b>&nbsp;&nbsp;
    <b>Não Respondidas: ${vazios}</b><br><br>
    <b>Pontuação líquida: <span style="color:${total > 10 ? '#204389' : '#b32a2a'}">${total}</span></b>
  </div>`;

  html += `<table style="margin:22px auto;border-spacing:8px 0;font-size:0.75em;max-width:600px;">
    <tr><th>Tema</th><th>Acertos</th><th>Erros</th><th>Não resp.</th><th>Líquido</th></tr>`;
  Object.entries(temaStats).forEach(([nome, s]) =>
    html += `<tr><td>${nome}</td><td>${s.acertos}</td><td>${s.erros}</td><td>${s.vazios}</td><td>${s.total}</td></tr>`);
  html += `</table>`;

  html += `<div style="text-align:center;font-size:1em;padding-top:14px;">
    <b>Nota Final:</b> `;

  if (liquidoBasico !== null && liquidoEspecifico !== null) {
    const notaFinal = liquidoBasico + 2 * liquidoEspecifico;
    html += `${liquidoBasico} + (2 × ${liquidoEspecifico}) = <span style="color:#2a2">${notaFinal}</span>`;
  } else {
    html += `${liquidoBasico !== null ? liquidoBasico : '?'} + (2 × ${liquidoEspecifico !== null ? liquidoEspecifico : '?'}) = <span style="color:#777">?</span>`;
  }

  html += `</div>`;

  document.getElementById('gabarito-result').innerHTML = html;
  document.getElementById('gabarito-result').style.display = 'block';
  localStorage.setItem(`gabarito-${parteAtual}`, html);
}