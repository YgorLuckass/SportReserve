// ============================================================
//  API.JS — Camada de comunicação com o JSON Server
//  Todas as chamadas HTTP ficam aqui, separadas da lógica da UI
// ============================================================

const API_BASE = 'http://localhost:3000';

// ── Utilitário interno: faz o fetch e trata erros de rede ──
async function request(method, endpoint, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE}${endpoint}`, options);

  // Se o servidor respondeu com erro HTTP (4xx, 5xx), lança exceção
  if (!response.ok) {
    throw new Error(`Erro ${response.status}: ${response.statusText}`);
  }

  // Resposta 204 (DELETE) não tem corpo, retorna null
  if (response.status === 204) return null;

  return response.json();
}

// ============================================================
//  RESERVAS
// ============================================================

// GET /reservas — busca todas as reservas
async function apiGetReservas() {
  return request('GET', '/reservas');
}

// POST /reservas — cria uma nova reserva
async function apiPostReserva(dados) {
  return request('POST', '/reservas', dados);
}

// PUT /reservas/:id — atualiza uma reserva existente (status, etc.)
async function apiPutReserva(id, dados) {
  return request('PUT', `/reservas/${id}`, dados);
}

// DELETE /reservas/:id — remove uma reserva
async function apiDeleteReserva(id) {
  return request('DELETE', `/reservas/${id}`);
}

// ============================================================
//  USUÁRIOS
// ============================================================

// GET /usuarios/:id — busca um usuário pelo id
async function apiGetUsuario(id) {
  return request('GET', `/usuarios/${id}`);
}

// PUT /usuarios/:id — atualiza dados do perfil
async function apiPutUsuario(id, dados) {
  return request('PUT', `/usuarios/${id}`, dados);
}

// POST /usuarios — cria novo usuário
async function apiPostUsuario(dados) {
  return request('POST', '/usuarios', dados);
}
