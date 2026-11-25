import { tratarApi } from './handler.js';

// Ponto de entrada único da API Node na Vercel; o vercel.json reescreve /api/:rota* para esta função.
export default {
  async fetch(requisicao) {
    return tratarApi(requisicao);
  },
};
