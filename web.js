const SUPABASE_URL = "https://tjgrcszthhddrqraokhy.supabase.co";
const SUPABASE_KEY ="sb_publishable_ALGM-6bn6uCfLliAMw3qRA_wg26Komf";
const USUARIO_ID = 1;

let sb = null;
let CATS = [];

let mesSel = new Date().getMonth();
let anoSel = new Date().getFullYear();

let quemSel = "eu";
let catSel = "alimentacao";
let fixoQuemSel = "eu";
let fixoCatSel = "moradia";

function configurado() {
  return SUPABASE_URL && 
    SUPABASE_KEY && 
    SUPABASE_URL.trim() !== "" && 
    SUPABASE_KEY.trim() !== "";
}

if (configurado()) {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
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
    sb.from("meses_financeiros")
      .upsert({
        usuario_id: USUARIO_ID,
        ano: anoSel,
        mes: mesBanco(),
        renda_base: 700,
        entrada_extra: 0
      }, {
        onConflict: "usuario_id,ano,mes",
        ignoreDuplicates: true
      })
  );
}

async function getMesConfig() {
  await ensureMonth();

  const rows = await supa(
    sb.from("meses_financeiros")
      .select("*")
      .eq("usuario_id", USUARIO_ID)
      .eq("ano", anoSel)
      .eq("mes", mesBanco())
      .limit(1)
  );

  return rows[0] || {
    renda_base: 700,
    entrada_extra: 0
  };
}

async function getCategorias() {
  if (CATS.length) return CATS;

  CATS = await supa(
    sb.from("categorias")
      .select("*")
      .eq("ativo", true)
      .order("ordem", { ascending: true })
  );

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
    sb.from("gastos")
      .select("*")
      .eq("usuario_id", USUARIO_ID)
      .eq("ano", anoSel)
      .eq("mes", mesBanco())
      .order("id", { ascending: false })
  );
}

async function getFixosDoMes() {
  const todos = await supa(
    sb.from("gastos_fixos")
      .select("*")
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
    sb.from("gastos_fixos")
      .select("*")
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
  document.getElementById("fixos-form").style.display = aba === "add" ? "block" : "none";
  document.getElementById("tab-lista").className = "tab" + (aba === "lista" ? " active" : "");
  document.getElementById("tab-add").className = "tab" + (aba === "add" ? " active" : "");

  if (aba === "add") renderCatGrid("ff-cat", fixoCatSel, "selFixoCat");
}

async function salvarGasto() {
  const desc = document.getElementById("f-desc").value.trim();
  const valor = parseFloat(document.getElementById("f-valor").value);

  if (!desc || isNaN(valor) || valor <= 0) {
    alert("Preencha descrição e valor.");
    return;
  }

  const data = `${anoSel}-${String(mesBanco()).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

  await supa(
    sb.from("gastos").insert({
      usuario_id: USUARIO_ID,
      descricao: desc,
      valor,
      quem_pagou: quemSel,
      categoria_id: catSel,
      data_gasto: data,
      ano: anoSel,
      mes: mesBanco()
    })
  );

  document.getElementById("f-desc").value = "";
  document.getElementById("f-valor").value = "";

  quemSel = "eu";
  catSel = "alimentacao";
  selQuem("eu");
  renderCatGrid("cat-grid", catSel, "selCat");

  await irPara("s-home");
}

async function deletarGasto(id) {
  if (!confirm("Remover este gasto?")) return;

  await supa(
    sb.from("gastos")
      .delete()
      .eq("id", id)
      .eq("usuario_id", USUARIO_ID)
  );

  await renderAll();
}

async function salvarFixo() {
  const desc = document.getElementById("ff-desc").value.trim();
  const valor = parseFloat(document.getElementById("ff-valor").value);

  if (!desc || isNaN(valor) || valor <= 0) {
    alert("Preencha descrição e valor.");
    return;
  }

  await supa(
    sb.from("gastos_fixos").insert({
      usuario_id: USUARIO_ID,
      descricao: desc,
      valor,
      quem_pagou: fixoQuemSel,
      categoria_id: fixoCatSel,
      dia_vencimento: 1,
      ativo: true,
      inicio_ano: anoSel,
      inicio_mes: mesBanco()
    })
  );

  document.getElementById("ff-desc").value = "";
  document.getElementById("ff-valor").value = "";

  fixoQuemSel = "eu";
  fixoCatSel = "moradia";
  fixoQuem("eu");

  abaFixos("lista");
  await renderAll();
}

async function deletarFixo(id) {
  if (!confirm("Remover gasto fixo?")) return;

  await supa(
    sb.from("gastos_fixos")
      .delete()
      .eq("id", id)
      .eq("usuario_id", USUARIO_ID)
  );

  await renderAll();
}

async function salvarBase() {
  const v = parseFloat(document.getElementById("inp-base").value);

  if (isNaN(v) || v < 0) {
    alert("Informe um valor válido.");
    return;
  }

  await ensureMonth();

  await supa(
    sb.from("meses_financeiros")
      .update({
        renda_base: v,
        atualizado_em: new Date().toISOString()
      })
      .eq("usuario_id", USUARIO_ID)
      .eq("ano", anoSel)
      .eq("mes", mesBanco())
  );

  document.getElementById("inp-base").value = "";
  await renderAll();
}

async function salvarExtra() {
  const v = parseFloat(document.getElementById("inp-extra").value);

  if (isNaN(v) || v < 0) {
    alert("Informe um valor válido.");
    return;
  }

  await ensureMonth();

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

  document.getElementById("inp-extra").value = "";
  await renderAll();
}

async function limparTudo() {
  if (!confirm("Apagar todos os dados?")) return;

  await supa(sb.from("gastos").delete().eq("usuario_id", USUARIO_ID));
  await supa(sb.from("gastos_fixos").delete().eq("usuario_id", USUARIO_ID));
  await supa(sb.from("meses_financeiros").delete().eq("usuario_id", USUARIO_ID));

  await renderAll();
}

function itemHtml(g) {
  const c = catInfo(g.categoria_id);
  const isFixo = g.tipo === "fixo";

  let dia = "fixo";

  if (g.data_gasto) {
    dia = new Date(g.data_gasto + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit"
    });
  }

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
          ${esc(c.nome)}${g.data_gasto ? " - " + dia : ""}
        </div>
      </div>

      <div class="item-val">${fmt(g.valor)}</div>

      <button class="item-del" onclick="${isFixo ? "deletarFixo" : "deletarGasto"}(${g.id})">
        <i class="ti ti-x"></i>
      </button>
    </div>
  `;
}

async function renderAll() {
  if (!configurado()) return;

  await getCategorias();

  const mesConf = await getMesConfig();
  const variaveis = await getGastosVariaveis();
  const fixosMes = await getFixosDoMes();
  const fixosTodos = await getFixosTodos();

  const todosMes = [
    ...fixosMes.map(f => ({ ...f, tipo: "fixo" })),
    ...variaveis.map(g => ({ ...g, tipo: "variavel" }))
  ];

  const tAM = variaveis
    .filter(g => g.quem_pagou === "eu")
    .reduce((a, g) => a + Number(g.valor), 0);

  const tAMae = variaveis
    .filter(g => g.quem_pagou === "mae")
    .reduce((a, g) => a + Number(g.valor), 0);

  const tFM = fixosMes
    .filter(f => f.quem_pagou === "eu")
    .reduce((a, f) => a + Number(f.valor), 0);

  const tFMae = fixosMes
    .filter(f => f.quem_pagou === "mae")
    .reduce((a, f) => a + Number(f.valor), 0);

  const totalEu = tAM + tFM;
  const totalMae = tAMae + tFMae;
  const entrada = Number(mesConf.renda_base || 0) + Number(mesConf.entrada_extra || 0);
  const saldo = entrada - totalEu;

  const mesStr = nomeMes(mesSel, anoSel);

  ["ml1", "ml2"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = mesStr;
  });

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
      barrasEl.innerHTML = `<p class="empty">Nenhum gasto registrado ainda</p>`;
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
    lr.innerHTML = todosMes.length === 0
      ? `<p class="empty">Sem gastos neste mês</p>`
      : todosMes.slice(0, 6).map(itemHtml).join("");
  }

  const lh = document.getElementById("lista-hist");
  if (lh) {
    lh.innerHTML = todosMes.length === 0
      ? `<p class="empty">Sem gastos neste mês</p>`
      : todosMes.map(itemHtml).join("");
  }

  const fl = document.getElementById("fixos-lista");
  if (fl) {
    const lista = fixosTodos.map(f => ({ ...f, tipo: "fixo" }));

    fl.innerHTML = lista.length === 0
      ? `<p class="empty">Nenhum gasto fixo cadastrado ainda</p>`
      : lista.map(itemHtml).join("");
  }

  const cfgMN = document.getElementById("cfg-mes-nome");
  if (cfgMN) cfgMN.textContent = mesStr;

  const cbv = document.getElementById("cfg-base-val");
  if (cbv) cbv.textContent = fmt(mesConf.renda_base);

  const cev = document.getElementById("cfg-extra-val");
  if (cev) cev.textContent = fmt(mesConf.entrada_extra);

  renderCatGrid("cat-grid", catSel, "selCat");
  renderCatGrid("ff-cat", fixoCatSel, "selFixoCat");
}

document.addEventListener("DOMContentLoaded", () => {
  if (configurado()) {
    renderAll().catch(err => {
      console.error(err);
      alert("Erro ao carregar. Confira se o SQL foi executado no Supabase e se as chaves estão corretas.");
    });
  }
});