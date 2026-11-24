import { criarLoginUsuario } from './handler.js';

// Usa segredos gerenciados pelo Supabase e limita a função ao domínio configurado.
function chavePadrao(atual, legada) {
  const configuracao = Deno.env.get(atual);
  return (configuracao ? JSON.parse(configuracao).default : null) ?? Deno.env.get(legada);
}

const origens = Deno.env.get('VISIONCHEF_LOGIN_ORIGINS') ?? 'http://127.0.0.1:8080';
Deno.serve(criarLoginUsuario({
  url: Deno.env.get('SUPABASE_URL'),
  chavePublica: chavePadrao('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'),
  chaveServidor: chavePadrao('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'),
  chaveAssinatura: Deno.env.get('JWT_SECRET_KEY'),
  origens: new Set(origens.split(',').map((origem) => origem.trim()).filter(Boolean)),
}));
