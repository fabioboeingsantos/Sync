import { createClient } from './supabase.js';
import { chavePublica, url } from './config.js';

// Na versão integrada, a sessão fica disponível na aba e sobrevive ao recarregamento da página.
const supabase = createClient(url, chavePublica, { auth: { storage: window.sessionStorage } });

function retornar({ data, error }) {
  if (error) throw error;
  return data;
}

async function entrar(identificador, senha) {
  const nome = identificador.trim().toLowerCase();
  if (nome.includes('@')) {
    return retornar(await supabase.auth.signInWithPassword({ email: nome, password: senha }));
  }

  // A resolução do nome usa a função do servidor. A chave administrativa fica fora do navegador.
  const resposta = await fetch(new URL('/functions/v1/login-usuario', url), {
    method: 'POST',
    headers: { apikey: chavePublica, 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, senha }),
  });
  if (!resposta.ok) throw Object.assign(new Error('Falha ao autenticar.'), { status: resposta.status });
  return retornar(await supabase.auth.setSession(await resposta.json()));
}

// As leituras passam pelas regras de acesso. As gravações usam funções transacionais do banco.
export const api = {
  modoLocal: false,
  entrar,
  sair: async () => retornar(await supabase.auth.signOut({ scope: 'local' })),
  restaurantes: async () => {
    const { session } = retornar(await supabase.auth.getSession());
    if (!session) return null;
    return retornar(await supabase.from('restaurantes').select('id,nome').order('nome').order('id'));
  },
  estoque: async (restaurante) => retornar(await supabase.from('estoque')
    .select('lote_id,parte_id,insumo,codigo_fabricante,validade_aplicavel,medida,saldo,situacao,revisao_validade,data_abertura,validade_abertura,validade_embalagem')
    .eq('restaurante_id', restaurante).order('validade_aplicavel').order('insumo').order('parte_id')),
  cadastrar: async (lote) => retornar(await supabase.rpc('cadastrar_lote', lote)),
  corrigirValidade: async (correcao) => retornar(await supabase.rpc('corrigir_validade', correcao)),
  registrarAbertura: async (abertura) => retornar(await supabase.rpc('registrar_abertura', abertura)),
};
