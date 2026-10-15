(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const porNumero = {};
  CANDIDATOS.forEach((c) => { porNumero[c.num] = c; });

  const tela = $('#tela');
  const caixas = $$('.caixa');
  const elMsg = $('#vMsg');
  const elNome = $('#vNome');
  const elVice = $('#vVice');
  const elDecada = $('#vDecada');
  const elFoto = $('#vFoto');
  const elCargo = $('#vCargo');
  const elEtapa = $('#vEtapa');
  const lista = $('#lista');
  const etapas = $('#etapas');

  // Cada eleitor vota uma vez em cada década, uma etapa de cada vez,
  // como na urna de verdade (deputado, senador, presidente...).
  let etapa = 0;
  let cedula = {};   // votos do eleitor atual, só gravados no FIM
  let digitos = '';
  let modo = 'votando'; // votando | branco | fim
  let travado = false;
  let fotoAtual = '';

  const decadaAtual = () => DECADAS[etapa];

  /* ---------- votos guardados no navegador ---------- */

  // formato: { eleitores: 3, por: { '70': { '71': 2, branco: 1, nulo: 0 }, ... } }
  const CHAVE = 'urnaDesenhos:votos:v2';
  let votos = vazio();
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE));
    if (salvo && salvo.por) votos = salvo;
  } catch (e) { /* começa zerada */ }

  function vazio() { return { eleitores: 0, por: {} }; }

  function salvarVotos() {
    try { localStorage.setItem(CHAVE, JSON.stringify(votos)); } catch (e) { /* segue só na memória */ }
  }

  function gravarCedula() {
    Object.keys(cedula).forEach((dec) => {
      const urnaDec = votos.por[dec] || (votos.por[dec] = {});
      urnaDec[cedula[dec]] = (urnaDec[cedula[dec]] || 0) + 1;
    });
    votos.eleitores++;
    salvarVotos();
  }

  /* ---------- sons (gerados na hora, sem arquivos) ---------- */

  let audio = null;
  function ctx() {
    if (!audio) {
      try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }

  function tom(freq, inicio, duracao, tipo, volume) {
    const a = ctx();
    if (!a) return;
    const o = a.createOscillator();
    const g = a.createGain();
    const t = a.currentTime + inicio;
    const v = volume || 0.05;
    o.type = tipo || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.005);
    g.gain.setValueAtTime(v, t + duracao - 0.01);
    g.gain.linearRampToValueAtTime(0, t + duracao);
    o.connect(g);
    g.connect(a.destination);
    o.start(t);
    o.stop(t + duracao + 0.02);
  }

  const somTecla = () => tom(1000, 0, 0.07);
  const somErro = () => { tom(330, 0, 0.12); tom(250, 0.13, 0.2); };
  const somProxima = () => { tom(1050, 0, 0.09); tom(1320, 0.1, 0.12); };

  // o famoso "pirililim" do fim do voto
  function somConfirma() {
    let t = 0;
    for (let i = 0; i < 8; i++) {
      tom(i % 2 ? 1320 : 1050, t, 0.07);
      t += 0.08;
    }
    tom(1050, t, 0.4);
  }

  // trecho de áudio do desenho: toca quando ele aparece na tela,
  // no máximo uns 10 segundos, e para ao corrigir ou confirmar
  let somDesenho = null;
  let fimSomDesenho = null;

  function tocarDesenho(c) {
    pararDesenho();
    if (!c.som) return;
    const a = new Audio(c.som);
    a.volume = 0.7;
    a.play().catch(() => { /* arquivo ainda não baixado: segue sem som */ });
    somDesenho = a;
    fimSomDesenho = setTimeout(pararDesenho, 10000);
  }

  function pararDesenho() {
    clearTimeout(fimSomDesenho);
    const a = somDesenho;
    somDesenho = null;
    if (!a) return;
    const baixar = setInterval(() => {
      a.volume = Math.max(0, a.volume - 0.1);
      if (a.volume === 0) { clearInterval(baixar); a.pause(); }
    }, 40);
  }

  function somImpressora() {
    for (let i = 0; i < 14; i++) tom(140 + (i % 3) * 30, i * 0.075, 0.04, 'sawtooth', 0.025);
  }

  /* ---------- guia do eleitor e etapas ---------- */

  function montarLista() {
    lista.innerHTML = DECADAS.map((d) => {
      const doDecada = CANDIDATOS.filter((c) => c.decada === d.id);
      const faixa = doDecada.length
        ? `números ${doDecada[0].num} a ${doDecada[doDecada.length - 1].num}`
        : '';
      return `
        <section class="bloco" data-decada="${d.id}" style="--cor:${d.cor}">
          <h3><span>${d.nome}</span><small>${faixa}</small></h3>
          <ul>
            ${doDecada.map((c) => `
              <li><button type="button" data-num="${c.num}"><b>${c.num}</b>${c.nome}</button></li>
            `).join('')}
          </ul>
        </section>`;
    }).join('');

    etapas.innerHTML = DECADAS.map((d) =>
      `<li style="--cor:${d.cor}" title="${d.nome}">${d.id}</li>`
    ).join('');

    lista.addEventListener('click', (e) => {
      const b = e.target.closest('[data-num]');
      if (!b) return;
      const c = porNumero[b.dataset.num];
      if (modo === 'fim' || travado) return;
      if (c.decada !== decadaAtual().id) {
        // desenho de outra década: avisa qual é a etapa da vez
        somErro();
        const atual = lista.querySelector('.bloco.atual');
        if (atual) {
          atual.classList.remove('chamar');
          void atual.offsetWidth;
          atual.classList.add('chamar');
        }
        return;
      }
      digitarNumero(c.num);
    });
  }

  function digitarNumero(num) {
    digitos = '';
    modo = 'votando';
    render();

    const r = $('#urna').getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) {
      $('#urna').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    num.split('').forEach((d, i) => {
      setTimeout(() => apertar(d), 220 + i * 180);
    });
  }

  /* ---------- tela ---------- */

  function iniciais(c) {
    if (c.sigla) return c.sigla;
    const ignorar = ['o', 'os', 'a', 'as', 'do', 'da', 'de', 'dos', 'das', 'e', 'um'];
    const p = c.nome.split(/[\s:\-]+/).filter((w) => w && !ignorar.includes(w.toLowerCase()));
    if (p.length > 1) return (p[0][0] + p[1][0]).toUpperCase();
    return p[0].slice(0, 2).toUpperCase();
  }

  function montarFoto(c) {
    const dentro = c.img
      ? `<img src="${c.img}" alt="${c.nome}"${c.pos ? ` style="object-position:${c.pos}"` : ''}>`
      : `<span>${iniciais(c)}</span>`;
    elFoto.innerHTML = `
      <div class="mini-tv">
        <div class="mini-tela d${c.decada}">${dentro}</div>
        <span class="botoes"><i></i><i></i><i></i></span>
      </div>`;
  }

  function render() {
    const dec = decadaAtual();
    const completo = digitos.length === 2;
    const achado = completo ? porNumero[digitos] : null;
    // número de outra década não vale nesta etapa: é voto nulo
    const cand = achado && achado.decada === dec.id ? achado : null;

    elCargo.textContent = `Desenho dos ${dec.nome}`;
    elEtapa.textContent = `${etapa + 1} de ${DECADAS.length}`;

    tela.classList.toggle('completo', completo);
    tela.classList.toggle('valido', !!cand);
    tela.classList.toggle('modo-branco', modo === 'branco');
    tela.classList.toggle('modo-fim', modo === 'fim');

    caixas.forEach((cx, i) => {
      cx.textContent = digitos[i] || '';
      cx.classList.toggle('ativa', modo === 'votando' && i === digitos.length);
    });

    if (modo === 'branco') {
      elMsg.innerHTML = '<div class="grande piscando">VOTO EM BRANCO</div>';
    } else if (completo && !cand) {
      elMsg.innerHTML = '<div class="pequeno">NÚMERO ERRADO</div><div class="grande piscando">VOTO NULO</div>';
    } else {
      elMsg.innerHTML = '';
    }

    if (cand) {
      elNome.textContent = cand.nome;
      elVice.textContent = cand.vice || '—';
      elDecada.textContent = dec.nome;
      if (fotoAtual !== cand.num) {
        montarFoto(cand);
        tocarDesenho(cand);
        fotoAtual = cand.num;
      }
    } else {
      if (fotoAtual) pararDesenho();
      elFoto.innerHTML = '';
      fotoAtual = '';
    }

    // guia: destaca a década da vez e o desenho digitado
    lista.classList.toggle('votando', modo !== 'fim');
    $$('.bloco').forEach((b) => {
      b.classList.toggle('atual', modo !== 'fim' && b.dataset.decada === dec.id);
    });
    $$('[data-num]').forEach((b) => {
      b.classList.toggle('selecionado', !!cand && b.dataset.num === cand.num);
    });

    Array.from(etapas.children).forEach((li, i) => {
      li.classList.toggle('feito', modo === 'fim' || i < etapa);
      li.classList.toggle('atual', modo !== 'fim' && i === etapa);
    });
  }

  // 70, 80, 90, 2000, 2010, 2020
  const rotuloDecada = (d) => (d.id >= '70' ? d.id : '20' + d.id);

  /* ---------- teclas da urna ---------- */

  function digito(d) {
    if (travado || modo !== 'votando' || digitos.length >= 2) return;
    digitos += d;
    somTecla();
    render();
  }

  function corrige() {
    if (travado) return;
    digitos = '';
    modo = 'votando';
    somTecla();
    render();
  }

  function branco() {
    if (travado) return;
    if (digitos.length > 0) { somErro(); return; } // na urna de verdade, tem que corrigir antes
    modo = 'branco';
    somTecla();
    render();
  }

  function confirma() {
    if (travado) return;
    const dec = decadaAtual().id;

    if (modo === 'branco') {
      cedula[dec] = 'branco';
    } else if (digitos.length === 2) {
      const c = porNumero[digitos];
      cedula[dec] = c && c.decada === dec ? digitos : 'nulo';
    } else {
      somErro();
      return;
    }

    pararDesenho();
    if (etapa < DECADAS.length - 1) proximaEtapa();
    else fim();
  }

  function proximaEtapa() {
    travado = true;
    somProxima();
    setTimeout(() => {
      etapa++;
      digitos = '';
      modo = 'votando';
      travado = false;
      tela.classList.remove('trocando');
      void tela.offsetWidth;
      tela.classList.add('trocando');
      render();
    }, 350);
  }

  let timerFim = null;

  function fim() {
    travado = true;
    gravarCedula();
    const escolhas = Object.assign({}, cedula);
    modo = 'fim';
    render();
    somConfirma();
    soltarConfete();

    // primeiro aparece o FIM na urna, depois a cédula "Eu votei!"
    setTimeout(() => { if (modo === 'fim') mostrarCedula(escolhas); }, 1300);
    timerFim = setTimeout(novoEleitor, 10000);
  }

  function novoEleitor() {
    clearTimeout(timerFim);
    if (modo !== 'fim') return;
    esconderCedula();
    etapa = 0;
    cedula = {};
    digitos = '';
    modo = 'votando';
    travado = false;
    render();
  }

  /* ---------- cédula "Eu votei!" ---------- */

  const elCedula = $('#cedula');

  function mostrarCedula(escolhas) {
    const linhas = DECADAS.map((d) => {
      const v = escolhas[d.id];
      const c = porNumero[v];
      const foto = c && c.img
        ? `<img src="${c.img}" alt="" style="object-position:${c.pos || '50% 30%'}">`
        : `<span>${v === 'branco' ? 'B' : 'N'}</span>`;
      const nome = c ? c.nome : v === 'branco' ? 'Voto em branco' : 'Voto nulo';
      return `
        <li style="--cor:${d.cor}">
          <span class="ced-dec">${rotuloDecada(d)}</span>
          <span class="ced-foto">${foto}</span>
          <span class="ced-nome${c ? '' : ' vazio'}">${nome}</span>
        </li>`;
    }).join('');

    elCedula.innerHTML = `
      <div class="ced-cartao" role="dialog" aria-label="Seu voto">
        <div class="ced-selo"><span>EU</span><b>VOTEI!</b></div>
        <p class="ced-sub">Seus desenhos favoritos</p>
        <ol>${linhas}</ol>
        <button type="button" class="btn-boletim ced-btn">Próximo eleitor ▶</button>
      </div>`;
    elCedula.hidden = false;
    const btn = elCedula.querySelector('.ced-btn');
    btn.addEventListener('click', novoEleitor);
    btn.focus();
  }

  function esconderCedula() {
    elCedula.hidden = true;
    elCedula.innerHTML = '';
  }

  function acionar(t) {
    if (/^\d$/.test(t)) digito(t);
    else if (t === 'branco') branco();
    else if (t === 'corrige') corrige();
    else if (t === 'confirma') confirma();
  }

  // aperta a tecla com o efeito visual (usado pelo teclado do PC e pelo guia)
  function apertar(t) {
    const b = document.querySelector(`[data-tecla="${t}"]`);
    if (b) {
      b.classList.add('pressionada');
      setTimeout(() => b.classList.remove('pressionada'), 120);
    }
    acionar(t);
  }

  $$('[data-tecla]').forEach((b) => {
    b.addEventListener('click', () => acionar(b.dataset.tecla));
  });

  document.addEventListener('keydown', (e) => {
    if (dlg.open || e.ctrlKey || e.altKey || e.metaKey) return;
    if (ap.open) {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        apAvancar();
      }
      return;
    }
    if (!elCedula.hidden) {
      if (e.key === 'Enter') { e.preventDefault(); novoEleitor(); }
      return;
    }
    let t = null;
    if (/^\d$/.test(e.key)) t = e.key;
    else if (e.key === 'Backspace' || e.key === 'Delete') t = 'corrige';
    else if (e.key === 'Enter') t = 'confirma';
    else if (e.key === 'b' || e.key === 'B') t = 'branco';
    if (!t) return;
    e.preventDefault();
    apertar(t);
  });

  /* ---------- confete ---------- */

  function soltarConfete(caixa) {
    caixa = caixa || $('#confete');
    const cores = DECADAS.map((d) => d.cor).concat(['#e9ac3c', '#f6d23c']);
    const pedacos = [];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = cores[i % cores.length];
      p.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
      p.style.animationDelay = Math.random() * 0.6 + 's';
      if (i % 3 === 0) p.style.borderRadius = '50%';
      pedacos.push(p);
    }
    caixa.append(...pedacos);
    setTimeout(() => pedacos.forEach((p) => p.remove()), 4500);
  }

  /* ---------- boletim de urna ---------- */

  const dlg = $('#boletim');
  const recibo = $('#recibo');

  function linha(rotulo, valor, classe) {
    return `<div class="r ${classe || ''}"><span>${rotulo}</span><span class="lider"></span><span>${valor}</span></div>`;
  }

  function apurarDecada(d) {
    const urnaDec = votos.por[d.id] || {};
    const ranking = CANDIDATOS
      .filter((c) => c.decada === d.id)
      .map((c) => ({ c, n: urnaDec[c.num] || 0 }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n);
    const empatados = ranking.length ? ranking.filter((x) => x.n === ranking[0].n) : [];
    return { d, ranking, empatados, brancos: urnaDec.branco || 0, nulos: urnaDec.nulo || 0 };
  }

  function montarBoletim() {
    const agora = new Date().toLocaleString('pt-BR');

    let html = `
      <h2>BOLETIM DE URNA</h2>
      <div class="centro">Eleição dos Desenhos por Década</div>
      <div class="centro">${agora}</div>
      <hr>`;

    if (!votos.eleitores) {
      html += '<p class="centro">Nenhum voto registrado ainda.<br>A urna está zerada.</p>';
    } else {
      const apuracao = DECADAS.map(apurarDecada);

      html += linha('Eleitores que votaram', votos.eleitores, 'destaque');
      html += '<hr><div class="centro destaque">CAMPEÕES DE CADA DÉCADA</div>';
      apuracao.forEach((a) => {
        const vencedor = !a.empatados.length ? '—'
          : a.empatados.length > 1 ? 'empate' : a.empatados[0].c.nome;
        html += linha(a.d.nome, vencedor);
      });

      apuracao.forEach((a) => {
        html += `<hr><div class="centro destaque">${a.d.nome.toUpperCase()}</div>`;
        const maior = a.ranking.length ? a.ranking[0].n : 1;
        a.ranking.forEach((x) => {
          html += linha(`${x.c.num} ${x.c.nome}`, x.n);
          html += `<div class="barra" style="width:${Math.max(4, (x.n / maior) * 100)}%"></div>`;
        });
        html += linha('Brancos', a.brancos);
        html += linha('Nulos', a.nulos);
        if (a.empatados.length > 1) {
          html += `<p class="centro">Empate: ${a.empatados.map((x) => x.c.nome).join(' / ')}</p>`;
        }
      });
    }

    html += `
      <div class="recibo-acoes">
        <button type="button" data-acao="fechar">Fechar</button>
        <button type="button" class="zerar" data-acao="zerar">Zerar urna</button>
      </div>`;

    recibo.innerHTML = html;
  }

  $('#abrirBoletim').addEventListener('click', () => {
    montarBoletim();
    recibo.style.animation = 'none';
    void recibo.offsetWidth; // reinicia a animação de "impressão"
    recibo.style.animation = '';
    dlg.showModal();
    somImpressora();
  });

  recibo.addEventListener('click', (e) => {
    const acao = e.target.dataset.acao;
    if (acao === 'fechar') dlg.close();
    if (acao === 'zerar' && confirm('Zerar todos os votos desta urna?')) {
      votos = vazio();
      salvarVotos();
      montarBoletim();
    }
  });

  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  /* ---------- apuração ao vivo (plantão) ---------- */

  const ap = $('#apuracao');
  const apPalco = $('#apPalco');
  const apInfo = $('#apInfo');
  const apProximo = $('#apProximo');
  let apPasso = -1;
  let apTimers = [];

  function somPlantao() {
    [523, 659, 784].forEach((f, i) => tom(f, i * 0.16, 0.14, 'square', 0.045));
    tom(1046, 0.5, 0.6, 'square', 0.045);
    tom(523, 0.5, 0.6, 'triangle', 0.06);
  }

  const somRevela = () => { tom(784, 0, 0.1); tom(1046, 0.11, 0.3); };

  function apDepois(ms, fn) { apTimers.push(setTimeout(fn, ms)); }

  function apLimpar() {
    apTimers.forEach(clearTimeout);
    apTimers = [];
    pararDesenho();
  }

  function poster(c, classe) {
    return `<img class="${classe}" src="${c.img}" alt="${c.nome}" style="object-position:${c.pos || '50% 30%'}">`;
  }

  function apAbertura() {
    if (!votos.eleitores) {
      apPasso = DECADAS.length; // o próximo clique fecha
      apProximo.textContent = 'Fechar';
      apInfo.textContent = '';
      apPalco.innerHTML = `
        <div class="ap-abertura">
          <div class="ap-plantao">PLANTÃO</div>
          <p>A urna ainda está vazia.<br>Volte quando a turma tiver votado!</p>
        </div>`;
      return;
    }
    const n = votos.eleitores;
    apPalco.innerHTML = `
      <div class="ap-abertura">
        <div class="ap-plantao">PLANTÃO</div>
        <p>Urnas fechadas! Começa agora a apuração.</p>
        <p class="ap-num"><b>${n}</b> ${n === 1 ? 'eleitor votou' : 'eleitores votaram'}</p>
      </div>`;
    apInfo.textContent = '6 décadas para apurar';
    apProximo.textContent = 'Começar apuração ▶';
    somPlantao();
  }

  function apDecada(i) {
    const d = DECADAS[i];
    const urnaDec = votos.por[d.id] || {};
    const todos = CANDIDATOS
      .filter((c) => c.decada === d.id)
      .map((c) => ({ c, n: urnaDec[c.num] || 0 }))
      .sort((a, b) => b.n - a.n);
    const validos = todos.reduce((s, x) => s + x.n, 0);
    const topo = todos[0].n;
    const empatados = topo ? todos.filter((x) => x.n === topo) : [];

    const linhas = todos.map((x) => {
      const pct = validos ? Math.round((x.n / validos) * 100) : 0;
      return `
        <li class="${x.n && x.n === topo ? 'lider' : ''}">
          <b>${x.c.num}</b>
          <div class="ap-linha">
            <div class="ap-rotulo"><span>${x.c.nome}</span><span>${x.n} ${x.n === 1 ? 'voto' : 'votos'} · ${pct}%</span></div>
            <div class="ap-trilho"><div class="ap-barra" data-pct="${pct}"></div></div>
          </div>
        </li>`;
    }).join('');

    let venc;
    if (!empatados.length) {
      venc = '<p class="ap-sem">Sem votos válidos nesta década</p>';
    } else if (empatados.length > 1) {
      venc = `
        <div class="ap-posters">${empatados.slice(0, 3).map((x) => poster(x.c, 'ap-poster pequeno')).join('')}</div>
        <span class="ap-carimbo">EMPATE</span>
        <p class="ap-venc-nome">${empatados.map((x) => x.c.nome).join(' / ')}</p>`;
    } else {
      venc = `
        ${poster(empatados[0].c, 'ap-poster')}
        <span class="ap-carimbo">ELEITO!</span>
        <p class="ap-venc-nome">${empatados[0].c.nome}</p>`;
    }

    apPalco.innerHTML = `
      <div class="ap-decada" style="--cor:${d.cor}">
        <h2>${d.nome}</h2>
        <div class="ap-grade">
          <div>
            <ol class="ap-lista">${linhas}</ol>
            <p class="ap-extra">Votos válidos: ${validos} · Brancos: ${urnaDec.branco || 0} · Nulos: ${urnaDec.nulo || 0}</p>
          </div>
          <div class="ap-venc" id="apVenc">${venc}</div>
        </div>
      </div>`;

    apInfo.textContent = `Década ${i + 1} de ${DECADAS.length}`;
    apProximo.textContent = i < DECADAS.length - 1 ? 'Próxima década ▶' : 'Ver campeões ▶';

    // barras enchem, depois o vencedor é revelado com o som do desenho
    apDepois(80, () => {
      apPalco.querySelectorAll('.ap-barra').forEach((b) => { b.style.width = b.dataset.pct + '%'; });
    });
    apDepois(1700, () => {
      $('#apVenc').classList.add('revelar');
      somRevela();
      if (empatados.length === 1) apDepois(500, () => tocarDesenho(empatados[0].c));
    });
  }

  function apFinal() {
    const lideres = [];
    const cards = DECADAS.map((d) => {
      const a = apurarDecada(d);
      let corpo;
      if (!a.empatados.length) {
        corpo = '<div class="ap-camp-vazio">—</div><strong>Sem votos</strong>';
      } else {
        const x = a.empatados[0];
        a.empatados.forEach((e) => lideres.push(e));
        const nome = a.empatados.map((e) => e.c.nome).join(' / ');
        corpo = `${poster(x.c, 'ap-camp-img')}<strong>${a.empatados.length > 1 ? 'Empate: ' : ''}${nome}</strong><span>${x.n} ${x.n === 1 ? 'voto' : 'votos'}</span>`;
      }
      return `<div class="ap-camp" style="--cor:${d.cor}"><small>${d.nome}</small>${corpo}</div>`;
    }).join('');

    const maximo = Math.max(0, ...lideres.map((x) => x.n));
    const geral = lideres.filter((x) => x.n === maximo);
    const nomesGeral = geral.map((x) => x.c.nome).join(', ').replace(/, ([^,]*)$/, ' e $1');
    const txtVotos = `${maximo} ${maximo === 1 ? 'voto' : 'votos'}`;

    apPalco.innerHTML = `
      <div class="ap-final">
        <h2>Campeões de cada década</h2>
        <div class="ap-campeoes">${cards}</div>
        ${!geral.length ? '' : geral.length === 1
          ? `<p class="ap-geral">Mais votado da eleição: <b>${nomesGeral}</b>, com ${txtVotos}</p>`
          : `<p class="ap-geral">Empate entre os mais votados: <b>${nomesGeral}</b>, com ${txtVotos} cada</p>`}
      </div>`;
    apInfo.textContent = `${votos.eleitores} ${votos.eleitores === 1 ? 'eleitor' : 'eleitores'}`;
    apProximo.textContent = 'Encerrar';
    somConfirma();
    soltarConfete($('#apConfete'));
  }

  function apMostrar() {
    apLimpar();
    if (apPasso < 0) apAbertura();
    else if (apPasso < DECADAS.length) apDecada(apPasso);
    else apFinal();
  }

  function apAvancar() {
    if (apPasso >= DECADAS.length) { ap.close(); return; }
    apPasso++;
    apMostrar();
  }

  $('#abrirApuracao').addEventListener('click', () => {
    if (!elCedula.hidden) novoEleitor();
    apPasso = -1;
    ap.showModal();
    apMostrar();
    apProximo.focus();
  });
  apProximo.addEventListener('click', apAvancar);
  $('#apFechar').addEventListener('click', () => ap.close());
  ap.addEventListener('close', apLimpar);

  /* ---------- início ---------- */

  montarLista();
  render();
})();
