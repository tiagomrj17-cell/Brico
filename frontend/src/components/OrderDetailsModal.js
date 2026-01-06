import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

const OrderDetailsModal = ({ open, onClose, order }) => {
  if (!order) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const statusMap = {
      'Pendente': 'status-pendente',
      'Em Preparação': 'status-em-preparacao',
      'Pronta para Levantamento': 'status-pronta-levantamento',
      'Entregue': 'status-entregue',
      'Levantada': 'status-levantada',
      'Cancelada': 'status-cancelada'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  const tipoDoc = order.tipo === 'orcamento' ? 'Orçamento' : 'Encomenda';
  const adiantamento = order.adiantamento || 0;
  const faltaPagar = order.total_final - adiantamento;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Detalhes {order.tipo === 'orcamento' ? 'do Orçamento' : 'da Encomenda'}</DialogTitle>
          <DialogDescription>
            {order.numero_encomenda && <span className={`font-bold ${order.tipo === 'orcamento' ? 'text-blue-700' : 'text-green-700'}`}>#{order.numero_encomenda}</span>} - {order.nome_cliente}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            <Badge className={`status-badge ${getStatusColor(order.status)} text-base px-4 py-2`}>
              {order.status}
            </Badge>
            {order.tipo === 'orcamento' && (
              <Badge className="bg-blue-100 text-blue-800">Orçamento</Badge>
            )}
          </div>

          {/* Histórico de Alterações */}
          {order.historico && order.historico.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">Histórico de Alterações</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {order.historico.map((alt, idx) => {
                  const nomeCampo = {
                    'status': 'Estado',
                    'observacoes': 'Observações',
                    'data_entrega_prevista': 'Data de Entrega Prevista',
                    'data_levantada': 'Data de Levantamento',
                    'pago_totalidade': 'Pago na Totalidade'
                  }[alt.campo_alterado] || alt.campo_alterado;
                  
                  return (
                    <div key={idx} className="text-sm bg-white p-3 rounded border border-blue-100">
                      <p className="font-medium text-blue-900">{formatDate(alt.data_hora)}</p>
                      <p className="text-gray-700 mt-1">
                        <span className="font-semibold text-blue-800">{nomeCampo}</span>
                      </p>
                      <div className="mt-1 pl-2 border-l-2 border-blue-300">
                        <p className="text-red-600 text-xs">Antes: {alt.valor_anterior || '(vazio)'}</p>
                        <p className="text-green-700 text-xs font-medium">Agora: {alt.valor_novo}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cliente */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">Informações do Cliente</h3>
            <div className="space-y-2">
              <p><span className="font-medium text-gray-600">Nome:</span> {order.nome_cliente}</p>
              <p><span className="font-medium text-gray-600">Contacto:</span> {order.contacto}</p>
              {order.nome_colaborador && (
                <p><span className="font-medium text-gray-600">Colaborador:</span> <span className="text-gray-900 font-semibold">{order.nome_colaborador}</span></p>
              )}
            </div>
          </div>

          {/* Datas */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">Datas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Criada em:</p>
                <p className="font-medium">{formatDate(order.data_criacao)}</p>
              </div>
              {order.data_entrega_prevista && (
                <div>
                  <p className="text-sm text-gray-600">Entrega Prevista:</p>
                  <p className="font-medium">{formatDateOnly(order.data_entrega_prevista)}</p>
                </div>
              )}
              {order.data_levantada && (
                <div>
                  <p className="text-sm text-gray-600">Data de Levantamento:</p>
                  <p className="font-medium text-purple-700">{formatDate(order.data_levantada)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Entrega */}
          {order.tem_entrega ? (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-lg mb-3">Informações de Entrega</h3>
              <div className="space-y-2">
                <p><span className="font-medium text-gray-600">Morada:</span> {order.morada_entrega}</p>
                <p><span className="font-medium text-gray-600">Distância:</span> {order.distancia_kms} km</p>
                <p><span className="font-medium text-gray-600">Colaboradores:</span> {order.num_colaboradores}</p>
              </div>
            </div>
          ) : (
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-lg">Levantamento</h3>
              <p className="text-gray-600 mt-1">Cliente irá levantar a encomenda</p>
            </div>
          )}

          {/* Artigos */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Artigos</h3>
            <div className="space-y-3">
              {order.artigos.map((artigo, idx) => (
                <div key={idx} className="bg-white border border-gray-200 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-lg">{artigo.designacao}</p>
                      <p className="text-sm text-gray-600">Código: {artigo.codigo}</p>
                      {artigo.separado && (
                        <p className="text-xs text-green-700 font-medium mt-1 bg-green-50 inline-block px-2 py-1 rounded">
                          ✓ Separado
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-sm">x{artigo.quantidade}</Badge>
                  </div>
                  <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-200">
                    <span className="text-gray-600">Preço Unitário: €{artigo.preco_unitario.toFixed(2)}</span>
                    <span className="font-semibold text-orange-600">Total: €{artigo.preco_total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Observações */}
          {order.observacoes && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-lg mb-2">Observações</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{order.observacoes}</p>
            </div>
          )}

          {/* Resumo Financeiro */}
          <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
            <h3 className="font-semibold text-lg mb-3">Resumo de Custos</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Subtotal Artigos:</span>
                <span className="font-semibold">€{order.subtotal_artigos.toFixed(2)}</span>
              </div>
              {order.tem_entrega && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Custo de Entrega:</span>
                  <span className="font-semibold">€{order.custo_entrega.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t-2 border-orange-300 pt-2 mt-2">
                <div className="flex justify-between text-xl">
                  <span className="font-bold text-gray-900">Total Final:</span>
                  <span className="font-bold text-orange-600">€{order.total_final.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Informação de Pagamento */}
          <div className={`p-4 rounded-lg border-2 ${order.pago_totalidade ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className="font-semibold text-lg mb-3">Informação de Pagamento</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Valor Pago pelo Cliente:</span>
                <span className="font-semibold text-green-700">€{adiantamento.toFixed(2)}</span>
              </div>
              
              {order.pago_totalidade ? (
                <div className="bg-green-100 p-3 rounded-lg mt-2">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-bold text-lg">PAGO NA TOTALIDADE</span>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 p-3 rounded-lg mt-2 border border-red-200">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-red-700">Falta Pagar:</span>
                    <span className="font-bold text-red-600 text-xl">€{faltaPagar.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;
