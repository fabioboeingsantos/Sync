import crypto from 'node:crypto';
import { promisify } from 'node:util';

// Parâmetros mínimos recomendados pela OWASP para Argon2id (m=19 MiB, t=2, p=1, chave de 32 bytes).
export const PARAMETROS_ARGON2ID = Object.freeze({
  memory: 19456,
  passes: 2,
  parallelism: 1,
  tagLength: 32,
});

// Fallback OWASP para ambientes Node 24 anteriores à versão 24.7 (quando crypto.argon2 ainda não está exposto).
export const PARAMETROS_SCRYPT = Object.freeze({
  N: 32768,
  r: 8,
  p: 1,
  keylen: 32,
  maxmem: 64 * 1024 * 1024,
});

const MAXIMO_SENHA = 256;
const argon2Async = typeof crypto.argon2 === 'function' ? promisify(crypto.argon2) : null;
const scryptAsync = promisify(crypto.scrypt);
let hashFicticioPromessa = null;

// Informa qual KDF nativo está ativo no runtime atual (argon2id no Node >=24.7 ou scrypt como fallback).
export function algoritmoPadraoSenha() {
  return argon2Async ? 'argon2id' : 'scrypt';
}

function validarSenhaEntrada(senha) {
  if (typeof senha !== 'string' || senha.length === 0 || senha.length > MAXIMO_SENHA) {
    throw new RangeError('Senha inválida para derivação de hash.');
  }
}

// Gera um hash de senha no formato PHC auto-descritivo com sal criptográfico único de 16 bytes.
export async function gerarHashSenha(senha, parametros = PARAMETROS_ARGON2ID) {
  validarSenhaEntrada(senha);
  const sal = crypto.randomBytes(16);
  if (argon2Async) {
    const { memory, passes, parallelism, tagLength } = { ...PARAMETROS_ARGON2ID, ...parametros };
    const derivado = await argon2Async('argon2id', {
      message: senha,
      nonce: sal,
      memory,
      passes,
      parallelism,
      tagLength,
    });
    return `$argon2id$v=19$m=${memory},t=${passes},p=${parallelism}$${sal.toString('base64url')}$${derivado.toString('base64url')}`;
  }
  const { N, r, p, keylen, maxmem } = PARAMETROS_SCRYPT;
  const derivado = await scryptAsync(senha, sal, keylen, { N, r, p, maxmem });
  return `$scrypt$n=${N},r=${r},p=${p}$${sal.toString('base64url')}$${derivado.toString('base64url')}`;
}

function interpretarPhc(hashArmazenado) {
  if (typeof hashArmazenado !== 'string') return null;
  const partes = hashArmazenado.split('$');
  // Formato Argon2id: ['', 'argon2id', 'v=19', 'm=...,t=...,p=...', '<salt>', '<hash>']
  if (partes.length === 6 && partes[1] === 'argon2id' && partes[2] === 'v=19') {
    const mapa = Object.fromEntries(partes[3].split(',').map((par) => par.split('=')));
    const memory = Number(mapa.m);
    const passes = Number(mapa.t);
    const parallelism = Number(mapa.p);
    if (!Number.isInteger(memory) || !Number.isInteger(passes) || !Number.isInteger(parallelism)) return null;
    if (memory < 1024 || passes < 1 || parallelism < 1) return null;
    const sal = Buffer.from(partes[4], 'base64url');
    const chave = Buffer.from(partes[5], 'base64url');
    if (sal.length < 8 || chave.length < 16) return null;
    return { algoritmo: 'argon2id', memory, passes, parallelism, sal, chave };
  }
  // Formato Scrypt: ['', 'scrypt', 'n=...,r=...,p=...', '<salt>', '<hash>']
  if (partes.length === 5 && partes[1] === 'scrypt') {
    const mapa = Object.fromEntries(partes[2].split(',').map((par) => par.split('=')));
    const N = Number(mapa.n);
    const r = Number(mapa.r);
    const p = Number(mapa.p);
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || N < 1024 || r < 1 || p < 1) return null;
    const sal = Buffer.from(partes[3], 'base64url');
    const chave = Buffer.from(partes[4], 'base64url');
    if (sal.length < 8 || chave.length < 16) return null;
    return { algoritmo: 'scrypt', N, r, p, sal, chave };
  }
  return null;
}

// Verifica a senha em tempo constante (timingSafeEqual), retornando false para qualquer hash inválido.
export async function verificarSenha(hashArmazenado, senha) {
  if (typeof senha !== 'string' || senha.length === 0 || senha.length > MAXIMO_SENHA) return false;
  const dados = interpretarPhc(hashArmazenado);
  if (!dados) return false;
  try {
    let derivado;
    if (dados.algoritmo === 'argon2id') {
      if (!argon2Async) return false;
      derivado = await argon2Async('argon2id', {
        message: senha,
        nonce: dados.sal,
        memory: dados.memory,
        passes: dados.passes,
        parallelism: dados.parallelism,
        tagLength: dados.chave.length,
      });
    } else {
      derivado = await scryptAsync(senha, dados.sal, dados.chave.length, {
        N: dados.N,
        r: dados.r,
        p: dados.p,
        maxmem: Math.max(64 * 1024 * 1024, 256 * dados.N * dados.r),
      });
    }
    return derivado.length === dados.chave.length && crypto.timingSafeEqual(derivado, dados.chave);
  } catch {
    return false;
  }
}

// Executa verificação contra um hash fictício quando o usuário não existe para reduzir diferenças de tempo.
export async function verificarSenhaFicticia(senha) {
  hashFicticioPromessa ??= gerarHashSenha('senha-ficticia-para-equalizacao-de-tempo');
  const hashFicticio = await hashFicticioPromessa;
  await verificarSenha(hashFicticio, typeof senha === 'string' && senha ? senha : 'x');
  return false;
}

// Detecta se o hash armazenado usa algoritmo antigo ou parâmetros abaixo do piso atual (lazy rehash no login).
export function precisaAtualizarHash(hashArmazenado, parametros = PARAMETROS_ARGON2ID) {
  const dados = interpretarPhc(hashArmazenado);
  if (!dados) return true;
  if (argon2Async) {
    if (dados.algoritmo !== 'argon2id') return true;
    const alvo = { ...PARAMETROS_ARGON2ID, ...parametros };
    return dados.memory < alvo.memory
      || dados.passes < alvo.passes
      || dados.parallelism !== alvo.parallelism
      || dados.chave.length < alvo.tagLength;
  }
  if (dados.algoritmo !== 'scrypt') return true;
  return dados.N < PARAMETROS_SCRYPT.N || dados.r < PARAMETROS_SCRYPT.r || dados.p < PARAMETROS_SCRYPT.p;
}
