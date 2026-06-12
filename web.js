const SUPABASE_URL = "https://tjgrcszthhddrqraokhy.supabase.co";
const SUPABASE_KEY ="sb_publishable_ALGM-6bn6uCfLliAMw3qRA_wg26Komf";
const USUARIO_ID = 1;

let sb = null;
let CATS = [];

function sFrom(table) {
  if (!sb || typeof sb.from !== 'function') {
    const msg = 'Supabase client não inicializado. Verifique SUPABASE_URL/SUPABASE_KEY e se o script do Supabase carregou.';
    console.error(msg);
    throw new Error(msg);
  }
  return sb.from(table);
}

let mesSel = new Date().getMonth();
let anoSel = new Date().getFullYear();

let quemSel = "eu";
let catSel = "alimentacao";
let fixoQuemSel = "eu";
let fixoCatSel = "moradia";
let tipoMovSel = "saida";
let tipoFixoSel = "gasto";
let histFiltro = "tudo";
let parcelasSel = 1;
let fixoDuracaoSel = "permanente"; // "permanente" | "meses"
let fixoMesesSel = 1;
let mpTrigger = null;

function configurado() {
  return SUPABASE_URL && 
    SUPABASE_KEY && 
    SUPABASE_URL.trim() !== "" && 
    SUPABASE_KEY.trim() !== "";
}

if (configurado()) {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  // expõe o cliente no console para debug rápido (remova em produção se quiser)
  try { window._sb = sb; } catch(e) {}
} else {
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("setup-alert").innerHTML = `
      <div class="erro-box">
        Configure o Supabase no arquivo index.html.
        Troque SUPABASE_URL e SUPABASE_KEY pelos dados reais.
      </div>
    `;
  });
}



function fmt(v) {
  v = Number(v || 0);
  return "R$ " + v.toFixed(2).replace(".", ",");
}

function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nomeMes(m, a) {
  return new Date(a, m, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });
}

// --- Month picker UI ---
const MES_NOMES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
let mpVisible = false;

function openMesPicker(trigger){
  const mp = document.getElementById('mes-picker');
  if(!mp) return;
  mpTrigger = trigger || null;
  buildMpGrid();
  document.getElementById('mp-year-val').textContent = anoSel;

  try {
    if (mpTrigger) {
      const rect = mpTrigger.getBoundingClientRect();
      mp.style.position = 'absolute';
      mp.style.left = (rect.left + rect.width/2) + 'px';
      mp.style.top = (rect.bottom + 8 + window.scrollY) + 'px';
      mp.style.transform = 'translateX(-50%)';
      mp.style.zIndex = 9999;
      mp.style.width = Math.min(420, Math.max(240, rect.width * 2)) + 'px';
    } else {
      mp.style.position = 'fixed';
      mp.style.left = '50%';
      mp.style.top = '120px';
      mp.style.transform = 'translateX(-50%)';
      mp.style.zIndex = 9999;
      mp.style.width = 'min(92%,420px)';
    }

    if (mp.parentElement !== document.body) document.body.appendChild(mp);
  } catch(e) {
    mp.style.position = 'fixed';
    mp.style.left = '50%';
    mp.style.top = '120px';
    mp.style.transform = 'translateX(-50%)';
    mp.style.zIndex = 9999;
  }

  mp.style.display = 'block';
  mpVisible = true;
}

function toggleMesPicker(el){
  if (mpVisible) {
    closeMesPicker();
  } else {
    openMesPicker(el || mpTrigger);
  }
}

function closeMesPicker(){
  const mp = document.getElementById('mes-picker');
  if(!mp) return;
  mp.style.display = 'none';
  mpVisible = false;
  mpTrigger = null;
  mp.style.position = '';
  mp.style.left = '';
  mp.style.top = '';
  mp.style.transform = '';
  mp.style.zIndex = '';
  mp.style.width = '';
}

function mpChangeYear(d){
  anoSel += d;
  document.getElementById('mp-year-val').textContent = anoSel;
  buildMpGrid();
}

function buildMpGrid(){
  const grid = document.getElementById('mp-grid');
  if(!grid) return;
  grid.innerHTML = MES_NOMES.map((n, i) => `
    <button class="mp-btn ${i===mesSel? 'sel':''}" onclick="mpSelectMonth(${i})">${n}</button>
  `).join('');
}

function mpSelectMonth(i){
  mesSel = i;
  renderAll();
  closeMesPicker();
}

function mpSetThisMonth(){
  const d = new Date(); mesSel = d.getMonth(); anoSel = d.getFullYear();
  renderAll(); closeMesPicker();
}

// close picker on outside click
document.addEventListener('click', function(e){
  if(!mpVisible) return;
  const mp = document.getElementById('mes-picker');
  const mdHome = document.getElementById('mesDisplayHome');
  const mdHist = document.getElementById('mesDisplayHist');
  if(!mp) return;
  if(mp.contains(e.target)) return;
  if ((mdHome && mdHome.contains(e.target)) || (mdHist && mdHist.contains(e.target))) return;
  closeMesPicker();
});


function mesBanco() {
  return mesSel + 1;
}

function ym(ano, mes) {
  return Number(ano) * 12 + Number(mes);
}

async function supa(promise) {
  const { data, error } = await promise;
  if (error) {
    console.error(error);
    throw error;
  }
  return data;
}

async function ensureMonth() {
  await supa(
    sFrom("meses_financeiros")
      .upsert({
        usuario_id: USUARIO_ID,
        ano: anoSel,
        mes: mesBanco(),
        
      }, {
        onConflict: "usuario_id,ano,mes",
        ignoreDuplicates: true
      })
  );
}

async function getMesConfig() {
  await ensureMonth();
  const rows = await supa(
    sFrom("meses_financeiros")
      .select('*')
      .eq("usuario_id", USUARIO_ID)
      .eq("ano", anoSel)
      .eq("mes", mesBanco())
      .limit(1)
  );

  return rows[0] || { entrada_extra: 0 };
}

async function getEntradas() {
  try {
    const rows = await supa(
      sFrom('entradas')
        .select('valor,ano,mes,id,descricao,data_entrada')
        .eq('usuario_id', USUARIO_ID)
        .eq('ano', anoSel)
        .eq('mes', mesBanco())
    );
    return rows || [];
  } catch (e) {
    console.warn('Erro ao buscar entradas:', e);
    return [];
  }
}

async function getCategorias() {
  if (CATS.length) return CATS;

  // quick cache: read from localStorage to show instantly, then revalidate
  try {
    const cached = localStorage.getItem('cats_v1');
    if (cached) {
      CATS = JSON.parse(cached);
    }
  } catch(e) { CATS = []; }

  // fetch fresh in background
  const fresh = await supa(
    sFrom("categorias")
      .select("*")
      .eq("ativo", true)
      .order("ordem", { ascending: true })
  );

  if (fresh && Array.isArray(fresh)) {
    CATS = fresh;
    try { localStorage.setItem('cats_v1', JSON.stringify(CATS)); } catch(e) {}
  }

  return CATS;
}

function catInfo(id) {
  return CATS.find(c => c.id === id) || {
    id: "outros",
    nome: "Outros",
    icone: "ti-dots",
    cor: "#888780"
  };
}

async function getGastosVariaveis() {
  return await supa(
    sFrom("gastos")
      .select("id,descricao,valor,quem_pagou,categoria_id,data_gasto,ano,mes,criado_em")
      .eq("usuario_id", USUARIO_ID)
      .eq("ano", anoSel)
      .eq("mes", mesBanco())
      .order("id", { ascending: false })
  );
}

async function getFixosDoMes() {
  const todos = await supa(
    sFrom("gastos_fixos")
      .select("id,descricao,valor,quem_pagou,categoria_id,dia_vencimento,ativo,inicio_ano,inicio_mes,fim_ano,fim_mes,criado_em")
      .eq("usuario_id", USUARIO_ID)
      .eq("ativo", true)
      .order("id", { ascending: false })
  );

  const atual = ym(anoSel, mesBanco());

  return todos.filter(f => {
    const ini = ym(f.inicio_ano, f.inicio_mes);
    const fim = f.fim_ano && f.fim_mes ? ym(f.fim_ano, f.fim_mes) : null;
    return ini <= atual && (fim === null || fim >= atual);
  });
}

async function getFixosTodos() {
  return await supa(
    sFrom("gastos_fixos")
      .select("id,descricao,valor,quem_pagou,categoria_id,dia_vencimento,ativo,inicio_ano,inicio_mes,fim_ano,fim_mes,criado_em")
      .eq("usuario_id", USUARIO_ID)
      .order("id", { ascending: false })
  );
}

async function mudaMes(d) {
  mesSel += d;

  if (mesSel < 0) {
    mesSel = 11;
    anoSel--;
  }

  if (mesSel > 11) {
    mesSel = 0;
    anoSel++;
  }

  await renderAll();
}

async function irPara(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  document.querySelectorAll(".nbtn").forEach(b => b.classList.remove("active"));

  const m = {
    "s-home": "nb-home",
    "s-hist": "nb-hist",
    "s-fixos": "nb-fixos",
    "s-cfg": "nb-cfg"
  };

  if (m[id]) document.getElementById(m[id]).classList.add("active");

  if (id !== "s-add") await renderAll();
  
  if (id === "s-add") {
    selTipo(tipoMovSel);
    renderCatGrid("cat-grid", catSel, "selCat");
  }

  document.querySelector(".content").scrollTop = 0;
}

function selQuem(q) {
  quemSel = q;
  document.getElementById("q-eu").className = "qbtn" + (q === "eu" ? " sel meu" : "");
  document.getElementById("q-mae").className = "qbtn" + (q === "mae" ? " sel mae" : "");
}

function fixoQuem(q) {
  fixoQuemSel = q;
  document.getElementById("ff-eu").className = "qbtn" + (q === "eu" ? " sel meu" : "");
  document.getElementById("ff-mae").className = "qbtn" + (q === "mae" ? " sel mae" : "");
}

function fixoDuracao(modo) {
  fixoDuracaoSel = modo;
  document.getElementById("ff-perm").className = "qbtn" + (modo === "permanente" ? " sel info" : "");
  document.getElementById("ff-meses").className = "qbtn" + (modo === "meses" ? " sel info" : "");
  const wrap = document.getElementById("ff-meses-wrap");
  if (wrap) wrap.style.display = modo === "meses" ? "block" : "none";
  if (modo === "meses") atualizaFixoMesesInfo();
}

function mudaFixoMeses(d) {
  fixoMesesSel = Math.max(1, Math.min(120, fixoMesesSel + d));
  atualizaFixoMesesInfo();
}

function atualizaFixoMesesInfo() {
  const el = document.getElementById("ff-meses-val");
  if (el) el.textContent = fixoMesesSel === 1 ? "1 mês" : fixoMesesSel + " meses";

  // calcular mês de término para mostrar ao usuário
  const info = document.getElementById("ff-meses-info");
  if (!info) return;

  let fimMes = mesBanco() + fixoMesesSel - 1;
  let fimAno = anoSel;
  while (fimMes > 12) { fimMes -= 12; fimAno++; }

  const nomesMes = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  info.textContent = `Termina em ${nomesMes[fimMes - 1]}/${fimAno}`;
  info.style.display = "block";
}

function renderCatGrid(cid, sel, fn) {
  const g = document.getElementById(cid);
  if (!g) return;

  g.innerHTML = CATS.map(c => `
    <button class="cbtn${sel === c.id ? " sel" : ""}" onclick="${fn}('${esc(c.id)}')">
      <i class="ti ${esc(c.icone)}" style="font-size:15px"></i>${esc(c.nome)}
    </button>
  `).join("");
}

function selCat(id) {
  catSel = id;
  renderCatGrid("cat-grid", catSel, "selCat");
}

function selFixoCat(id) {
  fixoCatSel = id;
  renderCatGrid("ff-cat", fixoCatSel, "selFixoCat");
}

function abaFixos(aba) {
  document.getElementById("fixos-lista").style.display = aba === "lista" ? "block" : "none";
  document.getElementById("fixos-form").style.display = (aba === "add-gasto" || aba === "add-entrada") ? "block" : "none";
  document.getElementById("tab-lista").className = "tab" + (aba === "lista" ? " active" : "");
  document.getElementById("tab-add-fixo-gasto").className = "tab" + (aba === "add-gasto" ? " active" : "");
  document.getElementById("tab-add-fixo-entrada").className = "tab" + (aba === "add-entrada" ? " active" : "");

  if (aba === "add-gasto") {
    tipoFixoSel = "gasto";
    document.getElementById("ff-cat-wrap").style.display = "block";
    document.getElementById("ff-quem-wrap").style.display = "block";
    document.getElementById("ff-desc").placeholder = "Ex: aluguel, Netflix...";
    fixoDuracao(fixoDuracaoSel);
    renderCatGrid("ff-cat", fixoCatSel, "selFixoCat");
  } else if (aba === "add-entrada") {
    tipoFixoSel = "entrada";
    document.getElementById("ff-cat-wrap").style.display = "none";
    document.getElementById("ff-quem-wrap").style.display = "none";
    document.getElementById("ff-desc").placeholder = "Ex: salário, mesada...";
    fixoDuracao(fixoDuracaoSel);
  }
}

function mudaParcelas(d) {
  parcelasSel = Math.max(1, Math.min(48, parcelasSel + d));
  atualizaParcelas();
}

function atualizaParcelas() {
  const el = document.getElementById("parc-val");
  if (el) el.textContent = parcelasSel + "x";

  const info = document.getElementById("parc-info");
  if (!info) return;

  if (parcelasSel > 1) {
    const valorEl = document.getElementById("f-valor");
    const total = parseFloat(valorEl ? valorEl.value : 0) || 0;
    const parcela = total > 0 ? (total / parcelasSel) : 0;
    info.textContent = parcela > 0
      ? `${parcelasSel}x de ${fmt(parcela)} = ${fmt(total)} total`
      : `${parcelasSel} parcelas mensais`;
    info.style.display = "block";
  } else {
    info.style.display = "none";
  }
}

function selTipo(tipo) {
  tipoMovSel = tipo;
  document.getElementById("t-saida").className = "qbtn" + (tipo === "saida" ? " sel meu" : "");
  document.getElementById("t-entrada").className = "qbtn" + (tipo === "entrada" ? " sel info" : "");

  const quemWrap = document.getElementById("f-quem-wrap");
  const catWrap = document.getElementById("f-cat-wrap");
  const parcelasWrap = document.getElementById("f-parcelas-wrap");

  const isSaida = tipo === "saida";
  if (quemWrap) quemWrap.style.display = isSaida ? "block" : "none";
  if (catWrap) catWrap.style.display = isSaida ? "block" : "none";
  if (parcelasWrap) parcelasWrap.style.display = isSaida ? "block" : "none";

  document.getElementById("f-desc").placeholder = isSaida ? "Ex: mercado, ifood..." : "Ex: salário, freelance...";
}

function filtroHist(f) {
  histFiltro = f;
  ["tudo","gastos","entradas"].forEach(x => {
    document.getElementById("tab-hist-" + x).className = "tab" + (x === f ? " active" : "");
  });
  renderListaHist();
}

// cache dos dados do mês para re-renderizar o histórico sem nova query
let _cacheHistData = null;

function renderListaHist() {
  const lh = document.getElementById("lista-hist");
  if (!lh || !_cacheHistData) return;

  const { todosMes, entradasMes } = _cacheHistData;

  let itens = [];

  // Preserva tipo:"fixo" para entradas fixas; entradas manuais ficam como "entrada"
  const entradasComTipo = entradasMes.map(e => ({ ...e, tipo: e.tipo || "entrada" }));

  if (histFiltro === "tudo") {
    itens = [...entradasComTipo, ...todosMes];
  } else if (histFiltro === "gastos") {
    itens = todosMes;
  } else {
    itens = entradasComTipo;
  }

  lh.innerHTML = itens.length === 0
    ? `<p class="empty">Sem movimento neste mês</p>`
    : itens.map(itemHtml).join("");
}

let _salvandoMovimento = false;
async function salvarMovimento() {
  if (_salvandoMovimento) return;
  _salvandoMovimento = true;

  try {
  const desc = document.getElementById("f-desc").value.trim();
  const valor = parseFloat(document.getElementById("f-valor").value);

  if (!desc || isNaN(valor) || valor <= 0) {
    alert("Preencha descrição e valor.");
    return;
  }

  const diaHoje = new Date().getDate();

  if (tipoMovSel === "entrada") {
    const data = `${anoSel}-${String(mesBanco()).padStart(2, "0")}-${String(diaHoje).padStart(2, "0")}`;
    try {
      await supa(
        sb.from("entradas").insert({
          usuario_id: USUARIO_ID,
          descricao: desc,
          valor,
          data_entrada: data,
          ano: anoSel,
          mes: mesBanco()
        })
      );
    } catch(e) {
      const msg = e && e.message ? e.message : String(e);
      alert("Erro ao salvar entrada: " + msg + "\n\nRode o fix_entradas.sql no Supabase SQL Editor.");
      return;
    }
  } else {
    // saída — insere 1 ou N parcelas em meses consecutivos
    const valorParcela = parcelasSel > 1 ? parseFloat((valor / parcelasSel).toFixed(2)) : valor;
    const inserts = [];

    for (let i = 0; i < parcelasSel; i++) {
      let m = mesBanco() + i;
      let a = anoSel;
      while (m > 12) { m -= 12; a++; }

      const data = `${a}-${String(m).padStart(2, "0")}-${String(diaHoje).padStart(2, "0")}`;
      const sufixo = parcelasSel > 1 ? ` (${i + 1}/${parcelasSel})` : "";

      inserts.push({
        usuario_id: USUARIO_ID,
        descricao: desc + sufixo,
        valor: valorParcela,
        quem_pagou: quemSel,
        categoria_id: catSel,
        data_gasto: data,
        ano: a,
        mes: m
      });
    }

    await supa(sb.from("gastos").insert(inserts));
  }

  document.getElementById("f-desc").value = "";
  document.getElementById("f-valor").value = "";

  tipoMovSel = "saida";
  quemSel = "eu";
  catSel = "alimentacao";
  parcelasSel = 1;
  selTipo("saida");
  selQuem("eu");
  atualizaParcelas();
  renderCatGrid("cat-grid", catSel, "selCat");

  await irPara("s-home");
  } finally {
    _salvandoMovimento = false;
  }
}

async function deletarGasto(id) {
  if (!confirm("Remover este gasto?")) return;

  await supa(
    sFrom("gastos")
      .delete()
      .eq("id", id)
      .eq("usuario_id", USUARIO_ID)
  );

  await renderAll();
}

let _salvandoFixo = false;
async function salvarFixo() {
  if (_salvandoFixo) return;
  _salvandoFixo = true;

  try {
  const desc = document.getElementById("ff-desc").value.trim();
  const valor = parseFloat(document.getElementById("ff-valor").value);

  if (!desc || isNaN(valor) || valor <= 0) {
    alert("Preencha descrição e valor.");
    return;
  }

  // calcular fim_ano / fim_mes se duração for por meses
  let fimAno = null;
  let fimMes = null;
  if (fixoDuracaoSel === "meses") {
    let m = mesBanco() + fixoMesesSel - 1;
    let a = anoSel;
    while (m > 12) { m -= 12; a++; }
    fimAno = a;
    fimMes = m;
  }

  const base = {
    usuario_id: USUARIO_ID,
    descricao: desc,
    valor,
    dia_vencimento: 1,
    ativo: true,
    inicio_ano: anoSel,
    inicio_mes: mesBanco(),
    fim_ano: fimAno,
    fim_mes: fimMes
  };

  if (tipoFixoSel === "entrada") {
    await supa(sFrom("gastos_fixos").insert({
      ...base,
      quem_pagou: null,
      categoria_id: "outros"   // campo obrigatório no banco; entradas são identificadas por quem_pagou=null
    }));
  } else {
    await supa(sFrom("gastos_fixos").insert({
      ...base,
      quem_pagou: fixoQuemSel,
      categoria_id: fixoCatSel
    }));
  }

  document.getElementById("ff-desc").value = "";
  document.getElementById("ff-valor").value = "";

  fixoQuemSel = "eu";
  fixoCatSel = "moradia";
  fixoDuracaoSel = "permanente";
  fixoMesesSel = 1;
  fixoQuem("eu");
  fixoDuracao("permanente");

  abaFixos("lista");
  await renderAll();
  } finally {
    _salvandoFixo = false;
  }
}

async function deletarFixo(id) {
  if (!confirm("Remover gasto fixo?")) return;

  await supa(
    sFrom("gastos_fixos")
      .delete()
      .eq("id", id)
      .eq("usuario_id", USUARIO_ID)
  );

  await renderAll();
}


async function salvarExtra() {
  const inpEl = document.getElementById("inp-extra");
  let v;
  if (inpEl) {
    v = parseFloat(inpEl.value);
  } else {
    const raw = prompt('Valor da entrada extra (ex: 100.00):', '0');
    if (raw === null) return;
    v = parseFloat(String(raw).replace(',', '.'));
  }

  if (isNaN(v) || v < 0) {
    alert("Informe um valor válido.");
    return;
  }

  await ensureMonth();

  try {
    await supa(
      sb.from("meses_financeiros")
        .update({
          entrada_extra: v,
          atualizado_em: new Date().toISOString()
        })
        .eq("usuario_id", USUARIO_ID)
        .eq("ano", anoSel)
        .eq("mes", mesBanco())
    );
  } catch (e) {
    console.warn('Não foi possível atualizar meses_financeiros. Tentando inserir em entradas...', e);
    // fallback: criar uma entrada manual
    try {
      const hoje = new Date();
      await supa(
        sb.from('entradas').insert({
          usuario_id: USUARIO_ID,
          descricao: 'Entrada extra',
          valor: v,
          data_entrada: hoje.toISOString().slice(0,10),
          ano: anoSel,
          mes: mesBanco()
        })
      );
    } catch (e2) {
      console.error('Falha ao inserir entrada de fallback:', e2);
      alert('Não foi possível salvar a entrada extra. Verifique o banco de dados.');
      return;
    }
  }

  if (inpEl) inpEl.value = "";
  await renderAll();
}

async function limparTudo() {
  if (!confirm("Apagar todos os dados?")) return;

  await supa(sFrom("gastos").delete().eq("usuario_id", USUARIO_ID));
  await supa(sFrom("gastos_fixos").delete().eq("usuario_id", USUARIO_ID));
  await supa(sFrom("meses_financeiros").delete().eq("usuario_id", USUARIO_ID));

  await renderAll();
}

function itemHtml(g) {
  const isEntradaFixa = g.tipo === "fixo" && (g.quem_pagou === null || g.quem_pagou === undefined);
  const isEntradaManual = g.tipo === "entrada";
  const isEntrada = isEntradaFixa || isEntradaManual;

  if (isEntrada) {
    const dia = g.data_entrada
      ? new Date(g.data_entrada + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
      : (g.data_gasto ? new Date(g.data_gasto + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "fixo");

    const nomesMes = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const terminoStr = isEntradaFixa
      ? (g.fim_ano ? `até ${nomesMes[(g.fim_mes || 1) - 1]}/${g.fim_ano}` : "permanente")
      : dia;

    const deleteFn = isEntradaFixa ? "deletarFixo" : "deletarEntrada";

    return `
      <div class="item">
        <div class="item-ico" style="background:#072030">
          <i class="ti ti-arrow-up" style="color:#60a5fa;font-size:15px"></i>
        </div>
        <div class="item-info">
          <div class="item-desc">${esc(g.descricao)}</div>
          <div class="item-meta">
            <span class="badge entrada">entrada</span>
            ${isEntradaFixa ? `<span class="badge fixo">fixo</span>` : ""}
            ${terminoStr}
          </div>
        </div>
        <div class="item-val" style="color:var(--success)">+${fmt(g.valor)}</div>
        <button class="item-del" onclick="${deleteFn}(${g.id})">
          <i class="ti ti-x"></i>
        </button>
      </div>
    `;
  }

  const c = catInfo(g.categoria_id);
  const isFixo = g.tipo === "fixo";

  let dia = "fixo";
  if (g.data_gasto) {
    dia = new Date(g.data_gasto + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit"
    });
  }

  const nomesMesG = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const terminoGasto = isFixo
    ? (g.fim_ano ? ` · até ${nomesMesG[(g.fim_mes || 1) - 1]}/${g.fim_ano}` : " · permanente")
    : "";

  return `
    <div class="item">
      <div class="item-ico" style="background:${esc(c.cor)}22">
        <i class="ti ${esc(c.icone)}" style="color:${esc(c.cor)};font-size:15px"></i>
      </div>

      <div class="item-info">
        <div class="item-desc">${esc(g.descricao)}</div>
        <div class="item-meta">
          <span class="badge ${g.quem_pagou === "eu" ? "meu" : "mae"}">${g.quem_pagou === "eu" ? "Meu" : "Mãe"}</span>
          ${isFixo ? `<span class="badge fixo">fixo</span>` : ""}
          ${esc(c.nome)}${g.data_gasto ? " - " + dia : ""}${terminoGasto}
        </div>
      </div>

      <div class="item-val" style="color:var(--danger)">${fmt(g.valor)}</div>

      <button class="item-del" onclick="${isFixo ? "deletarFixo" : "deletarGasto"}(${g.id})">
        <i class="ti ti-x"></i>
      </button>
    </div>
  `;
}

async function deletarEntrada(id) {
  if (!confirm("Remover esta entrada?")) return;

  await supa(
    sFrom("entradas")
      .delete()
      .eq("id", id)
      .eq("usuario_id", USUARIO_ID)
  );

  await renderAll();
}

async function renderAll() {
  if (!configurado()) return;

  // ensure categories loaded (cached) first, then fetch other data in parallel
  await getCategorias();

  const [mesConf, variaveis, fixosMes, fixosTodos, entradas] = await Promise.all([
    getMesConfig(),
    getGastosVariaveis(),
    getFixosDoMes(),
    getFixosTodos(),
    getEntradas()
  ]);

  const todosMes = [
    ...fixosMes.filter(f => f.quem_pagou !== null && f.quem_pagou !== undefined).map(f => ({ ...f, tipo: "fixo" })),
    ...variaveis.map(g => ({ ...g, tipo: "variavel" }))
  ];

  const fixosEntradaMes = fixosMes.filter(f => !f.quem_pagou);

  // soma entradas: manuais + entradas fixas do mês
  const somaEntradas = entradas.reduce((a, e) => a + Number(e.valor || 0), 0);
  const somaFixosEntrada = fixosEntradaMes.reduce((a, f) => a + Number(f.valor || 0), 0);
  const entrada = Number(mesConf.entrada_extra || 0) + somaEntradas + somaFixosEntrada;

  // cache para o filtro de histórico
  const entradasMes = [
    ...entradas.map(e => ({ ...e, tipo: "entrada" })),
    ...fixosEntradaMes.map(f => ({ ...f, tipo: "fixo" }))
  ];
  _cacheHistData = { todosMes, entradasMes };

  const tAM = variaveis.filter(g => g.quem_pagou === "eu").reduce((a, g) => a + Number(g.valor), 0);
  const tAMae = variaveis.filter(g => g.quem_pagou === "mae").reduce((a, g) => a + Number(g.valor), 0);
  const tFM = fixosMes.filter(f => f.quem_pagou === "eu").reduce((a, f) => a + Number(f.valor), 0);
  const tFMae = fixosMes.filter(f => f.quem_pagou === "mae").reduce((a, f) => a + Number(f.valor), 0);
  const totalEu = tAM + tFM;
  const totalMae = tAMae + tFMae;
  const saldo = entrada - totalEu;

  const mesStr = nomeMes(mesSel, anoSel);

  ["ml1", "ml2"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = mesStr;
  });
  const mesAnoEl = document.getElementById('mesAno');
  if (mesAnoEl) {
    mesAnoEl.addEventListener('change', function () {
      console.log(this.value); // Ex: 2026-06
    });
  }

  const sv = document.getElementById("saldo-val");
  if (sv) {
    sv.textContent = fmt(saldo);
    sv.className = "saldo-val" + (saldo < 0 ? " neg" : "");
  }

  document.getElementById("sub-entra").textContent = fmt(entrada);
  document.getElementById("sub-saida").textContent = fmt(totalEu);
  document.getElementById("tot-meu").textContent = fmt(totalEu);
  document.getElementById("tot-mae").textContent = fmt(totalMae);

  const barrasEl = document.getElementById("barras");

  if (barrasEl) {
    if (totalEu === 0) {
      barrasEl.innerHTML = `<p class="empty">Nenhum movimento registrado ainda</p>`;
    } else {
      const meus = [
        ...variaveis.filter(g => g.quem_pagou === "eu"),
        ...fixosMes.filter(f => f.quem_pagou === "eu")
      ];

      barrasEl.innerHTML = CATS.map(c => {
        const tot = meus
          .filter(g => g.categoria_id === c.id)
          .reduce((a, g) => a + Number(g.valor), 0);

        if (tot === 0) return "";

        const pct = Math.min(100, Math.round((tot / totalEu) * 100));

        return `
          <div class="barra-wrap">
            <div class="barra-lbl">
              <span>${esc(c.nome)}</span>
              <span>${fmt(tot)}</span>
            </div>
            <div class="barra-bg">
              <div class="barra-fill" style="width:${pct}%;background:${esc(c.cor)}"></div>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  const lr = document.getElementById("lista-rec");
  if (lr) {
    const recentes = [
      ...entradasMes.slice(0, 3).map(e => ({ ...e, tipo: e.tipo || "entrada" })),
      ...todosMes.slice(0, 6)
    ].slice(0, 6);
    lr.innerHTML = recentes.length === 0
      ? `<p class="empty">Sem movimento neste mês</p>`
      : recentes.map(itemHtml).join("");
  }

  renderListaHist();

  const fl = document.getElementById("fixos-lista");
  if (fl) {
    const lista = fixosTodos.map(f => ({ ...f, tipo: "fixo" }));

    fl.innerHTML = lista.length === 0
      ? `<p class="empty">Nenhum fixo cadastrado ainda</p>`
      : lista.map(itemHtml).join("");
  }

  const cfgMN = document.getElementById("cfg-mes-nome");
  if (cfgMN) cfgMN.textContent = mesStr;

  const cev = document.getElementById("cfg-extra-val");
  if (cev) cev.textContent = fmt(mesConf.entrada_extra);

  renderCatGrid("cat-grid", catSel, "selCat");
  renderCatGrid("ff-cat", fixoCatSel, "selFixoCat");
}

document.addEventListener("DOMContentLoaded", () => {
  if (!window.supabase) {
    console.error('Supabase UMD não encontrado', window.supabase);
    alert('Erro: biblioteca do Supabase não carregou. Verifique o CDN em index.html. Veja console para detalhes.');
    return;
  }

  // atualiza preview de parcelas quando o valor mudar
  const fValor = document.getElementById("f-valor");
  if (fValor) fValor.addEventListener("input", atualizaParcelas);

  if (configurado()) {
    renderAll().catch(err => {
      console.error('Erro ao executar renderAll:', err);
      const msg = err && err.message ? err.message : String(err);
      alert('Erro ao carregar: ' + msg + '\nVerifique console e se o SQL foi executado no Supabase.');
    });
  }
});