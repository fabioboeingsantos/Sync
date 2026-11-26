// Catálogo fictício único: o navegador usa fotos e filtros; o servidor local semeia os mesmos 20 perecíveis.
export const catalogoProdutos = [
  { nome: 'Alface', categoria: 'Hortifruti', medida: 'un', saldoInicial: 12, minimo: 4, diasValidade: 2, local: 'Geladeira · gaveta de verduras', imagem: 'alface-editorial.jpg' },
  { nome: 'Tomate', categoria: 'Hortifruti', medida: 'kg', saldoInicial: 18, minimo: 5, diasValidade: 4, local: 'Câmara fria · prateleira 1', imagem: 'tomate-editorial.jpg' },
  { nome: 'Cenoura', categoria: 'Hortifruti', medida: 'kg', saldoInicial: 10, minimo: 3, diasValidade: 10, local: 'Câmara fria · gaveta de legumes', imagem: 'cenoura-editorial.jpg' },
  { nome: 'Batata', categoria: 'Hortifruti', medida: 'kg', saldoInicial: 25, minimo: 8, diasValidade: 18, local: 'Despensa · prateleira baixa', imagem: 'batata-editorial.jpg' },
  { nome: 'Cebola', categoria: 'Hortifruti', medida: 'kg', saldoInicial: 14, minimo: 5, diasValidade: 25, local: 'Despensa · cesto ventilado', imagem: 'cebola-editorial.jpg' },
  { nome: 'Couve', categoria: 'Hortifruti', medida: 'kg', saldoInicial: 5, minimo: 3, diasValidade: 3, local: 'Geladeira · gaveta de verduras', imagem: 'couve-editorial.jpg' },
  { nome: 'Beterraba', categoria: 'Hortifruti', medida: 'kg', saldoInicial: 7, minimo: 3, diasValidade: 8, local: 'Câmara fria · gaveta de legumes', imagem: 'beterraba-editorial.jpg' },
  { nome: 'Abobrinha', categoria: 'Hortifruti', medida: 'kg', saldoInicial: 8, minimo: 3, diasValidade: 6, local: 'Câmara fria · prateleira 2', imagem: 'abobrinha-editorial.jpg' },
  { nome: 'Chuchu', categoria: 'Hortifruti', medida: 'kg', saldoInicial: 9, minimo: 3, diasValidade: 7, local: 'Câmara fria · gaveta de legumes', imagem: 'chuchu-editorial.jpg' },
  { nome: 'Pimentão', categoria: 'Hortifruti', medida: 'kg', saldoInicial: 6, minimo: 3, diasValidade: 2, local: 'Câmara fria · prateleira 2', imagem: 'pimentao-editorial.jpg' },
  { nome: 'Pepino', categoria: 'Hortifruti', medida: 'kg', saldoInicial: 9, minimo: 4, diasValidade: 5, local: 'Câmara fria · gaveta de legumes', imagem: 'pepino-editorial.jpg' },
  { nome: 'Mandioca', categoria: 'Hortifruti', medida: 'kg', saldoInicial: 12, minimo: 4, diasValidade: 12, local: 'Câmara fria · prateleira inferior', imagem: 'mandioca-editorial.jpg' },
  { nome: 'Leite condensado', categoria: 'Laticínios', medida: 'un', saldoInicial: 14, minimo: 5, diasValidade: 45, local: 'Despensa · prateleira 3', imagem: 'leite-condensado.jpg' },
  { nome: 'Leite', categoria: 'Laticínios', medida: 'L', saldoInicial: 12, minimo: 5, diasValidade: 5, local: 'Geladeira · prateleira 1', imagem: 'leite.jpg' },
  { nome: 'Queijo mussarela', categoria: 'Laticínios', medida: 'kg', saldoInicial: 9, minimo: 3, diasValidade: 3, local: 'Geladeira · gaveta de frios', imagem: 'queijo-mussarela.jpg' },
  { nome: 'Iogurte natural', categoria: 'Laticínios', medida: 'un', saldoInicial: 18, minimo: 6, diasValidade: 8, local: 'Geladeira · prateleira 2', imagem: 'iogurte-natural.jpg' },
  { nome: 'Manteiga', categoria: 'Laticínios', medida: 'un', saldoInicial: 8, minimo: 3, diasValidade: 28, local: 'Geladeira · gaveta de frios', imagem: 'manteiga.jpg' },
  { nome: 'Frango resfriado', categoria: 'Proteínas', medida: 'kg', saldoInicial: 10, minimo: 4, diasValidade: -1, local: 'Geladeira · prateleira inferior', imagem: 'frango.jpg' },
  { nome: 'Presunto fatiado', categoria: 'Proteínas', medida: 'kg', saldoInicial: 6, minimo: 3, diasValidade: 0, local: 'Geladeira · gaveta de frios', imagem: 'presunto.jpg' },
  { nome: 'Ovos', categoria: 'Proteínas', medida: 'un', saldoInicial: 24, minimo: 8, diasValidade: 14, local: 'Geladeira · prateleira 3', imagem: 'ovos.jpg' },
];

// Normaliza nomes para relacionar lotes repetidos ao cartão agregado sem perder o nome apresentado.
export function chaveProdutoEstoque(nome) {
  return String(nome ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');
}
