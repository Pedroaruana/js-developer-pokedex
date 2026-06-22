const grid = document.getElementById("pokemon-grid");
const loader = document.getElementById("loader");
const loadMoreButton = document.getElementById("load-more-button");
const statusMessage = document.getElementById("status-message");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const clearButton = document.getElementById("clear-button");
const typeFiltersContainer = document.getElementById("type-filters");

const modalOverlay = document.getElementById("modal-overlay");
const modalContent = document.getElementById("modal-content");
const modalCloseButton = document.getElementById("modal-close");

const ITENS_POR_PAGINA = 20;

let estado = {
  offset: 0,
  tipoSelecionado: "all",
  termoBusca: "",
  carregando: false,
};

document.addEventListener("DOMContentLoaded", iniciarAplicacao);

async function iniciarAplicacao() {
  await carregarFiltrosDeTipo();
  await carregarMaisPokemon();
}

async function carregarMaisPokemon() {
  if (estado.carregando) return;
  definirCarregando(true);
  try {
    const listaResumida = await buscarListaDePokemon(ITENS_POR_PAGINA, estado.offset);
    if (listaResumida.length === 0) {
      loadMoreButton.hidden = true;
      mostrarStatus("Não há mais Pokémon para carregar.");
      return;
    }
    const detalhes = await buscarDetalhesEmLote(listaResumida);
    detalhes.forEach(renderizarCard);
    estado.offset += ITENS_POR_PAGINA;
  } catch (erro) {
    mostrarStatus("Algo deu errado ao buscar os Pokémon. Tente novamente em instantes.");
    console.error(erro);
  } finally {
    definirCarregando(false);
  }
}

async function carregarFiltrosDeTipo() {
  try {
    const tipos = await buscarTiposDePokemon();
    tipos.forEach((tipo) => {
      const botao = document.createElement("button");
      botao.className = "filter-chip";
      botao.textContent = tipo;
      botao.dataset.type = tipo;
      typeFiltersContainer.appendChild(botao);
    });
  } catch (erro) {
    console.error("Não foi possível carregar os filtros de tipo:", erro);
  }
}

typeFiltersContainer.addEventListener("click", async (evento) => {
  const botao = evento.target.closest(".filter-chip");
  if (!botao) return;

  const tipoClicado = botao.dataset.type;
  if (tipoClicado === estado.tipoSelecionado) return;

  typeFiltersContainer
    .querySelectorAll(".filter-chip")
    .forEach((chip) => chip.classList.remove("filter-chip--active"));
  botao.classList.add("filter-chip--active");

  estado.tipoSelecionado = tipoClicado;
  estado.termoBusca = "";
  searchInput.value = "";
  clearButton.hidden = true;

  await aplicarFiltroDeTipo(tipoClicado);
});

async function aplicarFiltroDeTipo(tipo) {
  grid.innerHTML = "";
  esconderStatus();
  definirCarregando(true);
  loadMoreButton.hidden = true;

  try {
    if (tipo === "all") {
      estado.offset = 0;
      loadMoreButton.hidden = false;
      await carregarMaisPokemon();
      return;
    }

    const listaDoTipo = await buscarPokemonPorTipo(tipo);

    if (listaDoTipo.length === 0) {
      mostrarStatus("Nenhum Pokémon encontrado para esse tipo.");
      return;
    }

    const detalhes = await buscarDetalhesEmLote(listaDoTipo.slice(0, 30));
    detalhes.forEach(renderizarCard);
  } catch (erro) {
    mostrarStatus("Não foi possível filtrar por esse tipo agora.");
    console.error(erro);
  } finally {
    definirCarregando(false);
  }
}

searchForm.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const termo = searchInput.value.trim();
  if (!termo) return;

  estado.termoBusca = termo;
  clearButton.hidden = false;
  loadMoreButton.hidden = true;

  grid.innerHTML = "";
  esconderStatus();
  definirCarregando(true);

  try {
    const pokemon = await buscarDetalhesDoPokemon(termo);
    renderizarCard(pokemon);
  } catch (erro) {
    mostrarStatus(`Nenhum Pokémon encontrado para "${termo}". Tente outro nome ou número.`);
  } finally {
    definirCarregando(false);
  }
});

clearButton.addEventListener("click", () => {
  searchInput.value = "";
  estado.termoBusca = "";
  clearButton.hidden = true;
  esconderStatus();

  grid.innerHTML = "";
  estado.offset = 0;
  loadMoreButton.hidden = false;
  carregarMaisPokemon();
});

loadMoreButton.addEventListener("click", carregarMaisPokemon);

function renderizarCard(pokemon) {
  const item = document.createElement("li");
  item.className = "pokemon-card";
  item.tabIndex = 0;
  item.setAttribute("role", "button");
  item.setAttribute("aria-label", `Ver detalhes de ${pokemon.name}`);

  const imagemUrl =
    pokemon.sprites?.other?.["official-artwork"]?.front_default ||
    pokemon.sprites?.front_default ||
    "https://placehold.co/120x120?text=?";

  const tiposHtml = pokemon.types
    .map((t) => `<span class="type-badge" style="background:${corDoTipo(t.type.name)}">${t.type.name}</span>`)
    .join("");

  item.innerHTML = `
    <p class="pokemon-card__number">Nº ${String(pokemon.id).padStart(3, "0")}</p>
    <img class="pokemon-card__image" src="${imagemUrl}" alt="${pokemon.name}" loading="lazy" />
    <p class="pokemon-card__name">${pokemon.name}</p>
    <div class="pokemon-card__types">${tiposHtml}</div>
  `;

  item.addEventListener("click", () => abrirModalDeDetalhes(pokemon));
  item.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      abrirModalDeDetalhes(pokemon);
    }
  });

  grid.appendChild(item);
}

function abrirModalDeDetalhes(pokemon) {
  const imagemUrl =
    pokemon.sprites?.other?.["official-artwork"]?.front_default ||
    pokemon.sprites?.front_default ||
    "https://placehold.co/200x200?text=?";

  const tiposHtml = pokemon.types
    .map((t) => `<span class="type-badge" style="background:${corDoTipo(t.type.name)}">${t.type.name}</span>`)
    .join("");

  const statsHtml = pokemon.stats
    .map((statItem) => {
      const valor = statItem.base_stat;
      const porcentagem = Math.min(100, Math.round((valor / 180) * 100));
      return `
        <span class="modal__stat-label">${nomeAmigavelDoStat(statItem.stat.name)}</span>
        <span class="modal__stat-bar-track">
          <span class="modal__stat-bar-fill" style="width:${porcentagem}%"></span>
        </span>
        <span class="modal__stat-value">${valor}</span>
      `;
    })
    .join("");

  modalContent.innerHTML = `
    <div class="modal__header">
      <p class="modal__number">Nº ${String(pokemon.id).padStart(3, "0")}</p>
      <img class="modal__image" src="${imagemUrl}" alt="${pokemon.name}" />
      <h2 class="modal__name" id="modal-title">${pokemon.name}</h2>
      <div class="modal__types">${tiposHtml}</div>
    </div>
    <div class="modal__stats">${statsHtml}</div>
    <div class="modal__meta">
      <div>
        <p class="modal__meta-value">${(pokemon.height / 10).toFixed(1)} m</p>
        <p class="modal__meta-label">Altura</p>
      </div>
      <div>
        <p class="modal__meta-value">${(pokemon.weight / 10).toFixed(1)} kg</p>
        <p class="modal__meta-label">Peso</p>
      </div>
      <div>
        <p class="modal__meta-value">${pokemon.abilities[0]?.ability.name.replace("-", " ") ?? "—"}</p>
        <p class="modal__meta-label">Habilidade</p>
      </div>
    </div>
  `;

  modalOverlay.hidden = false;
  modalCloseButton.focus();
  document.body.style.overflow = "hidden";
}

function fecharModal() {
  modalOverlay.hidden = true;
  document.body.style.overflow = "";
}

modalCloseButton.addEventListener("click", fecharModal);
modalOverlay.addEventListener("click", (evento) => {
  if (evento.target === modalOverlay) fecharModal();
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && !modalOverlay.hidden) fecharModal();
});

function definirCarregando(valor) {
  estado.carregando = valor;
  loader.classList.toggle("loader--visible", valor);
  loadMoreButton.disabled = valor;
}

function mostrarStatus(mensagem) {
  statusMessage.textContent = mensagem;
  statusMessage.hidden = false;
}

function esconderStatus() {
  statusMessage.hidden = true;
}

function nomeAmigavelDoStat(nomeOriginal) {
  const mapa = {
    hp: "HP",
    attack: "Ataque",
    defense: "Defesa",
    "special-attack": "Ataque Esp.",
    "special-defense": "Defesa Esp.",
    speed: "Velocidade",
  };
  return mapa[nomeOriginal] ?? nomeOriginal;
}

function corDoTipo(tipo) {
  const variavelCss = `--type-${tipo}`;
  return `var(${variavelCss}, var(--type-normal))`;
}
