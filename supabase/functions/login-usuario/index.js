import { criarLoginUsuario } from './handler.js';

// Usa as chaves injetadas pelo Supabase e as origens autorizadas para o ambiente.
function chavePadrao(atual, legada) {
  const configuracao = Deno.env.get(atual);
  return (configuracao ? JSON.parse(configuracao).default : null) ?? Deno.env.get(legada);
}

const origens = Deno.env.get('VISIONCHEF_LOGIN_ORIGINS') ?? 'http://127.0.0.1:4173';
Deno.serve(criarLoginUsuario({
  url: Deno.env.get('SUPABASE_URL'),
  chavePublica: chavePadrao('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'),
  chaveServidor: chavePadrao('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'),
  origens: new Set(origens.split(',').map((origem) => origem.trim()).filter(Boolean)),
}));
