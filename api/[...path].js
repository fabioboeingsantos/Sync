import { tratarApi } from './handler.js';

// A função de borda HTTP do Node entrega uma rota same-origin para todas as operações privadas.
export default {
  async fetch(requisicao) {
    return tratarApi(requisicao);
  },
};
