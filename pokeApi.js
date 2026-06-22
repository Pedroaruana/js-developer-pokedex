const POKE_API_BASE_URL = "https://pokeapi.co/api/v2";

async function buscarListaDePokemon(limit = 20, offset = 0) {
  const resposta = await fetch(`${POKE_API_BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);
  if (!resposta.ok) {
    throw new Error("Não foi possível carregar a lista de Pokémon.");
  }
  const dados = await resposta.json();
  return dados.results;
}

async function buscarDetalhesDoPokemon(nomeOuId) {
  const nomeNormalizado = String(nomeOuId).toLowerCase().trim();
  const resposta = await fetch(`${POKE_API_BASE_URL}/pokemon/${nomeNormalizado}`);
  if (!resposta.ok) {
    throw new Error(`Pokémon "${nomeOuId}" não encontrado.`);
  }
  return resposta.json();
}

async function buscarDetalhesEmLote(listaResumida) {
  const promessas = listaResumida.map((pokemon) => buscarDetalhesDoPokemon(pokemon.name));
  return Promise.all(promessas);
}

async function buscarTiposDePokemon() {
  const resposta = await fetch(`${POKE_API_BASE_URL}/type`);
  if (!resposta.ok) {
    throw new Error("Não foi possível carregar os tipos de Pokémon.");
  }
  const dados = await resposta.json();
  const tiposIgnorados = ["unknown", "shadow"];
  return dados.results
    .map((tipo) => tipo.name)
    .filter((nome) => !tiposIgnorados.includes(nome));
}

async function buscarPokemonPorTipo(tipo) {
  const resposta = await fetch(`${POKE_API_BASE_URL}/type/${tipo}`);
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar Pokémon do tipo "${tipo}".`);
  }
  const dados = await resposta.json();
  return dados.pokemon.map((entrada) => entrada.pokemon);
}
