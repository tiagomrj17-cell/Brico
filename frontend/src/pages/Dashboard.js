import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Package, Filter, Plus, Edit, Printer, Users, ChevronDown, FileText, Trash2 } from 'lucide-react';
import OrderFormModal from '@/components/OrderFormModal';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [colaboradorFilter, setColaboradorFilter] = useState('Todos');
  const [searchText, setSearchText] = useState('');
  
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [orderType, setOrderType] = useState('encomenda');
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(null);
  
  // Estado para mostrar modal de sucesso após criação
  const [createdOrder, setCreatedOrder] = useState(null);
  const [showCreatedModal, setShowCreatedModal] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchColaboradores();
  }, []);

  useEffect(() => {
    let filtered = orders;
    
    if (statusFilter !== 'Todos') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    if (colaboradorFilter !== 'Todos') {
      filtered = filtered.filter(order => order.colaborador_id === colaboradorFilter);
    }
    
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(order => 
        order.nome_cliente.toLowerCase().includes(search) ||
        (order.nome_colaborador && order.nome_colaborador.toLowerCase().includes(search)) ||
        (order.numero_encomenda && order.numero_encomenda.toLowerCase().includes(search))
      );
    }
    
    setFilteredOrders(filtered);
  }, [statusFilter, colaboradorFilter, searchText, orders]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
      setFilteredOrders(response.data);
    } catch (error) {
      toast.error('Erro ao carregar encomendas');
    } finally {
      setLoading(false);
    }
  };

  const fetchColaboradores = async () => {
    try {
      const response = await axios.get(`${API}/colaboradores`);
      setColaboradores(response.data);
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
    }
  };

  const handleDeleteOrder = async () => {
    if (!deletingOrder) return;

    try {
      await axios.delete(`${API}/orders/${deletingOrder.id}`);
      toast.success('Eliminado com sucesso!');
      setDeletingOrder(null);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao eliminar');
    }
  };

  const handlePrintInterno = (order) => {
    window.open(`/print-interno/${order.id}`, '_blank', 'noopener,noreferrer');
  };

  const handlePrintCliente = (order) => {
    window.open(`/print-cliente/${order.id}`, '_blank', 'noopener,noreferrer');
  };

  const handleCreateEncomenda = () => {
    setEditingOrder(null);
    setOrderType('encomenda');
    setOrderFormOpen(true);
  };

  const handleCreateOrcamento = () => {
    setEditingOrder(null);
    setOrderType('orcamento');
    setOrderFormOpen(true);
  };

  const handleOrderCreated = (newOrder) => {
    setOrderFormOpen(false);
    setEditingOrder(null);
    setCreatedOrder(newOrder);
    setShowCreatedModal(true);
    fetchOrders();
    fetchColaboradores();
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

  const getStatusCounts = () => {
    return {
      total: orders.length,
      pendente: orders.filter(o => o.status === 'Pendente').length,
      emPreparacao: orders.filter(o => o.status === 'Em Preparação').length,
      prontaLevantamento: orders.filter(o => o.status === 'Pronta para Levantamento').length,
      entregue: orders.filter(o => o.status === 'Entregue').length,
      levantada: orders.filter(o => o.status === 'Levantada').length,
      cancelada: orders.filter(o => o.status === 'Cancelada').length
    };
  };

  // Verificar se pode editar (não pode se Levantada, Entregue ou Cancelada)
  const canEdit = (order) => {
    return !['Levantada', 'Entregue', 'Cancelada'].includes(order.status);
  };

  const counts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="no-print bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Encomendas e Orçamentos</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate('/colaboradores')}
                variant="outline"
                className="flex items-center gap-2 border-purple-300 text-purple-600 hover:bg-purple-50"
              >
                <Users className="w-4 h-4" />
                Gerir Colaboradores
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-testid="btn-nova-encomenda"
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white flex items-center gap-2 px-6 py-6 text-lg"
                  >
                    <Plus className="w-5 h-5" />
                    Criar Novo
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleCreateEncomenda} className="cursor-pointer">
                    <Package className="w-4 h-4 mr-2" />
                    Nova Encomenda
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCreateOrcamento} className="cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />
                    Novo Orçamento
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900" data-testid="total-encomendas">{counts.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Pendente</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-700">{counts.pendente}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Em Preparação</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-700">{counts.emPreparacao}</p>
            </CardContent>
          </Card>
          <Card className="bg-indigo-50 border-indigo-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Pronto</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-indigo-700">{counts.prontaLevantamento}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Concluído</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-700">{counts.entregue + counts.levantada}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Cancelado</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-700">{counts.cancelada}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-52 border-gray-300" data-testid="filter-status">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="Todos">Todos os Estados</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Em Preparação">Em Preparação</SelectItem>
                <SelectItem value="Pronta para Levantamento">Pronto para Levantamento</SelectItem>
                <SelectItem value="Entregue">Entregue</SelectItem>
                <SelectItem value="Levantada">Levantada</SelectItem>
                <SelectItem value="Cancelada">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <Select value={colaboradorFilter} onValueChange={setColaboradorFilter}>
              <SelectTrigger className="w-52 border-purple-300" data-testid="filter-colaborador">
                <SelectValue placeholder="Filtrar por colaborador" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="Todos">Todos os Colaboradores</SelectItem>
                {colaboradores.map((colab) => (
                  <SelectItem key={colab.id} value={colab.id}>{colab.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Pesquisar por cliente, colaborador ou nº..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="border-gray-300"
              data-testid="search-input"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">A carregar...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="text-center py-12 bg-white border-gray-200">
            <CardContent>
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-4">Nenhuma encomenda encontrada</p>
              <Button onClick={handleCreateEncomenda} className="bg-orange-500 hover:bg-orange-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Encomenda
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {/* Título: Número + Nome do Cliente */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {order.numero_encomenda && (
                          <span className={`text-lg font-bold ${order.tipo === 'orcamento' ? 'text-blue-700' : 'text-green-700'}`}>
                            #{order.numero_encomenda}
                          </span>
                        )}
                        <span className="text-lg font-bold text-gray-900">{order.nome_cliente}</span>
                        {order.tipo === 'orcamento' ? (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">Orçamento</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 text-xs">Encomenda</Badge>
                        )}
                      </div>
                      
                      {/* Colaborador primeiro */}
                      {order.nome_colaborador && (
                        <p className="text-sm text-gray-700 font-medium">
                          Colaborador: {order.nome_colaborador}
                        </p>
                      )}
                      
                      {/* Contacto */}
                      <p className="text-sm text-gray-600">Contacto: {order.contacto}</p>
                      
                      {/* Data/Hora abaixo do contacto */}
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.data_criacao)}</p>
                    </div>
                    <Badge className={`status-badge ${getStatusColor(order.status)}`}>
                      {order.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                      <p className="text-gray-600">Tipo</p>
                      <p className="font-semibold">{order.tem_entrega ? 'Entrega' : 'Levantamento'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total</p>
                      <p className="font-semibold text-orange-600 text-base">€{order.total_final.toFixed(2)}</p>
                      {order.total_final > 0 && (
                        <>
                          <p className="text-xs text-green-600">Pago: €{(order.adiantamento || 0).toFixed(2)}</p>
                          {order.pago_totalidade ? (
                            <p className="text-xs text-green-600 font-bold">
                              ✓ Pago na totalidade
                            </p>
                          ) : (
                            <p className="text-xs text-red-600 font-bold">
                              Falta: €{(order.total_final - (order.adiantamento || 0)).toFixed(2)}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {order.data_entrega_prevista && (
                    <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
                      <p className="text-blue-800">
                        <span className="font-medium">Entrega Prevista:</span> {order.data_entrega_prevista}
                      </p>
                    </div>
                  )}

                  {order.observacoes && (
                    <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                      <p className="text-gray-600 font-medium">Observações:</p>
                      <p className="text-gray-700">{order.observacoes}</p>
                    </div>
                  )}

                  {order.historico && order.historico.length > 0 && (
                    <div className="mb-3 p-2 bg-blue-50 rounded text-sm border border-blue-200">
                      <p className="text-blue-800 font-medium mb-1">Últimas Alterações:</p>
                      <div className="text-xs text-blue-700 space-y-1">
                        {order.historico.slice(-3).reverse().map((alt, idx) => {
                          const nomeCampo = {
                            'status': 'Estado',
                            'observacoes': 'Observações',
                            'data_entrega_prevista': 'Data Prevista',
                            'data_levantada': 'Levantamento',
                            'artigos': 'Artigos',
                            'artigos_separados': 'Artigos Separados',
                            'pago_totalidade': 'Pago na Totalidade'
                          }[alt.campo_alterado] || alt.campo_alterado;
                          
                          // Formatar valor para campos especiais
                          let valorFormatado = alt.valor_novo;
                          
                          // Tentar fazer parse se for string JSON
                          let valorParsed = alt.valor_novo;
                          if (typeof alt.valor_novo === 'string') {
                            try {
                              valorParsed = JSON.parse(alt.valor_novo.replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false'));
                            } catch (e) {
                              valorParsed = alt.valor_novo;
                            }
                          }
                          
                          if (alt.campo_alterado === 'artigos_separados') {
                            valorFormatado = `✓ ${alt.valor_novo}`;
                          } else if (alt.campo_alterado === 'artigos' && Array.isArray(valorParsed)) {
                            valorFormatado = valorParsed.map(a => `${a.designacao || a.codigo} (x${a.quantidade})`).join(', ');
                          } else if (alt.campo_alterado === 'pago_totalidade') {
                            valorFormatado = (valorParsed === true || valorParsed === 'True' || valorParsed === 'true') ? 'Sim' : 'Não';
                          } else if (Array.isArray(valorParsed)) {
                            valorFormatado = valorParsed.map(a => a.designacao || a.codigo || JSON.stringify(a)).join(', ');
                          } else if (typeof valorParsed === 'object' && valorParsed !== null) {
                            valorFormatado = valorParsed.designacao || valorParsed.codigo || JSON.stringify(valorParsed);
                          }
                          
                          return (
                            <p key={idx} className={`truncate ${alt.campo_alterado === 'artigos_separados' ? 'text-green-700' : ''}`}>
                              <span className="font-medium">{nomeCampo}:</span> {valorFormatado}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-200 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingOrder(order)}
                      className="flex items-center gap-2 border-gray-300"
                    >
                      Ver Detalhes
                    </Button>
                    
                    {/* Botão Editar - desativado se Levantada, Entregue ou Cancelada */}
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="btn-editar"
                      onClick={() => {
                        if (!canEdit(order)) {
                          toast.error('Não é possível editar encomendas finalizadas');
                          return;
                        }
                        setEditingOrder(order);
                        setOrderType(order.tipo || 'encomenda');
                        setOrderFormOpen(true);
                      }}
                      disabled={!canEdit(order)}
                      className={`flex items-center gap-2 border-gray-300 ${!canEdit(order) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </Button>
                    
                    {/* Botão Eliminar - sempre ativo */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingOrder(order)}
                      className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </Button>
                    
                    {/* Dropdown de Impressão */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 border-orange-300 text-orange-600 hover:bg-orange-50"
                        >
                          <Printer className="w-4 h-4" />
                          Imprimir
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePrintCliente(order)} className="cursor-pointer">
                          <FileText className="w-4 h-4 mr-2" />
                          Versão Cliente
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrintInterno(order)} className="cursor-pointer">
                          <Package className="w-4 h-4 mr-2" />
                          Versão Interna
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <OrderFormModal
        open={orderFormOpen}
        onClose={() => {
          setOrderFormOpen(false);
          setEditingOrder(null);
        }}
        onSave={handleOrderCreated}
        order={editingOrder}
        orderType={orderType}
        colaboradores={colaboradores}
      />

      <OrderDetailsModal
        open={!!viewingOrder}
        onClose={() => setViewingOrder(null)}
        order={viewingOrder}
      />

      <DeleteConfirmDialog
        open={!!deletingOrder}
        onClose={() => setDeletingOrder(null)}
        onConfirm={handleDeleteOrder}
        orderName={deletingOrder ? `${deletingOrder.numero_encomenda ? '#' + deletingOrder.numero_encomenda + ' - ' : ''}${deletingOrder.nome_cliente}` : ''}
      />

      {/* Modal de Sucesso após Criação */}
      <Dialog open={showCreatedModal} onOpenChange={setShowCreatedModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2 text-xl">
              <Package className="w-6 h-6" />
              {createdOrder?.tipo === 'orcamento' ? 'Orçamento criado!' : 'Encomenda criada!'}
            </DialogTitle>
            {createdOrder?.numero_encomenda && (
              <p className={`text-3xl font-bold mt-2 ${createdOrder?.tipo === 'orcamento' ? 'text-blue-700' : 'text-green-700'}`}>
                #{createdOrder.numero_encomenda}
              </p>
            )}
            <DialogDescription asChild>
              <div className="space-y-2 mt-4">
                <span className="block text-gray-600">
                  Cliente: <strong>{createdOrder?.nome_cliente}</strong>
                </span>
                <span className="block text-gray-600">
                  Colaborador: <strong className="text-gray-800">{createdOrder?.nome_colaborador}</strong>
                </span>
                <span className="block text-gray-600">
                  Total: <strong className="text-orange-600 text-lg">€{createdOrder?.total_final?.toFixed(2)}</strong>
                </span>
                {createdOrder?.pago_totalidade ? (
                  <span className="block text-green-700 font-bold flex items-center gap-2">
                    ✓ Pago na totalidade
                  </span>
                ) : (
                  <>
                    <span className="block text-green-700">
                      Adiantamento: <strong>€{(createdOrder?.adiantamento || 0).toFixed(2)}</strong>
                    </span>
                    <span className="block text-red-600 font-bold">
                      Falta Pagar: €{(createdOrder?.total_final - (createdOrder?.adiantamento || 0)).toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                handlePrintCliente(createdOrder);
              }}
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir Cliente
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                handlePrintInterno(createdOrder);
              }}
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir Interno
            </Button>
            <Button
              onClick={() => setShowCreatedModal(false)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
