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
import { Package, Filter, Plus, Edit, Printer, Users, ChevronDown, FileText, Truck, Phone, Store, Calendar, Eye, ClipboardList, Check, CheckCircle } from 'lucide-react';
import OrderFormModal from '@/components/OrderFormModal';
import OrderDetailsModal from '@/components/OrderDetailsModal';

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
  const [tipoFilter, setTipoFilter] = useState('Todos'); // Novo filtro de tipo
  const [searchText, setSearchText] = useState('');
  
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [orderType, setOrderType] = useState('encomenda');
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  
  // Estado para mostrar modal de sucesso após criação
  const [createdOrder, setCreatedOrder] = useState(null);
  const [showCreatedModal, setShowCreatedModal] = useState(false);
  const [isEditSuccess, setIsEditSuccess] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchColaboradores();
  }, []);

  useEffect(() => {
    let filtered = orders;
    
    // Filtro por status
    if (statusFilter !== 'Todos') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // Filtro por colaborador
    if (colaboradorFilter !== 'Todos') {
      filtered = filtered.filter(order => order.colaborador_id === colaboradorFilter);
    }
    
    // Filtro por tipo (encomenda/orçamento)
    if (tipoFilter !== 'Todos') {
      if (tipoFilter === 'Encomendas') {
        filtered = filtered.filter(order => order.tipo !== 'orcamento');
      } else if (tipoFilter === 'Orçamentos') {
        filtered = filtered.filter(order => order.tipo === 'orcamento');
      }
    }
    
    // Filtro por texto
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(order => 
        order.nome_cliente.toLowerCase().includes(search) ||
        (order.nome_colaborador && order.nome_colaborador.toLowerCase().includes(search)) ||
        (order.numero_encomenda && order.numero_encomenda.toLowerCase().includes(search)) ||
        (order.artigos && order.artigos.some(art => 
          (art.codigo && art.codigo.toLowerCase().includes(search)) ||
          (art.designacao && art.designacao.toLowerCase().includes(search))
        ))
      );
    }
    
    setFilteredOrders(filtered);
  }, [statusFilter, colaboradorFilter, tipoFilter, searchText, orders]);

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

  const handleOrderCreated = (newOrder, wasEditing = false) => {
    setOrderFormOpen(false);
    setEditingOrder(null);
    setCreatedOrder(newOrder);
    setIsEditSuccess(wasEditing);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header com sombra suave */}
      <div className="no-print bg-white shadow-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Título */}
            <div className="fade-in">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                Encomendas e Orçamentos
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
                Gestão completa das suas encomendas
              </p>
            </div>
            
            {/* Botões de ação */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <Button
                onClick={() => navigate('/entregas')}
                variant="outline"
                className="flex items-center gap-1.5 border-orange-400 text-orange-600 hover:bg-orange-50 hover:border-orange-500 transition-all flex-1 sm:flex-none justify-center min-h-[38px] text-sm"
              >
                <Truck className="w-4 h-4" />
                <span className="sm:inline">Entregas</span>
              </Button>
              
              <Button
                onClick={() => navigate('/colaboradores')}
                variant="outline"
                className="flex items-center gap-1.5 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-500 transition-all flex-1 sm:flex-none justify-center min-h-[38px] text-sm"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Colaboradores</span>
                <span className="sm:hidden">Equipa</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-testid="btn-nova-encomenda"
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base shadow-lg hover:shadow-xl transition-all min-h-[38px] flex-1 sm:flex-none justify-center"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Criar</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 p-1.5">
                  <DropdownMenuItem 
                    onClick={handleCreateEncomenda} 
                    className="cursor-pointer py-2.5 px-3 text-sm hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Package className="w-4 h-4 mr-2 text-green-600" />
                    Nova Encomenda
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleCreateOrcamento} 
                    className="cursor-pointer py-2.5 px-3 text-sm hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2 text-blue-600" />
                    Novo Orçamento
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Cards de estatísticas - clicáveis para filtrar */}
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <Card 
            onClick={() => setStatusFilter('Todos')}
            className={`bg-white border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer card-hover slide-up ${statusFilter === 'Todos' ? 'ring-2 ring-gray-400' : ''}`} 
            style={{animationDelay: '0ms'}}
          >
            <CardHeader className="pb-1 pt-2 px-2">
              <CardDescription className="text-xs font-medium">Total</CardDescription>
            </CardHeader>
            <CardContent className="pb-2 px-2">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900" data-testid="total-encomendas">{counts.total}</p>
            </CardContent>
          </Card>
          <Card 
            onClick={() => setStatusFilter('Pendente')}
            className={`bg-yellow-50 border-yellow-200 shadow-sm hover:shadow-md transition-all cursor-pointer card-hover slide-up ${statusFilter === 'Pendente' ? 'ring-2 ring-yellow-500' : ''}`} 
            style={{animationDelay: '50ms'}}
          >
            <CardHeader className="pb-1 pt-2 px-2">
              <CardDescription className="text-xs font-medium text-yellow-700">Pendente</CardDescription>
            </CardHeader>
            <CardContent className="pb-2 px-2">
              <p className="text-2xl sm:text-3xl font-bold text-yellow-700">{counts.pendente}</p>
            </CardContent>
          </Card>
          <Card 
            onClick={() => setStatusFilter('Em Preparação')}
            className={`bg-blue-50 border-blue-200 shadow-sm hover:shadow-md transition-all cursor-pointer card-hover slide-up ${statusFilter === 'Em Preparação' ? 'ring-2 ring-blue-500' : ''}`} 
            style={{animationDelay: '100ms'}}
          >
            <CardHeader className="pb-1 pt-2 px-2">
              <CardDescription className="text-xs font-medium text-blue-700">Preparação</CardDescription>
            </CardHeader>
            <CardContent className="pb-2 px-2">
              <p className="text-2xl sm:text-3xl font-bold text-blue-700">{counts.emPreparacao}</p>
            </CardContent>
          </Card>
          <Card 
            onClick={() => setStatusFilter('Pronta para Levantamento')}
            className={`bg-indigo-50 border-indigo-200 shadow-sm hover:shadow-md transition-all cursor-pointer card-hover slide-up ${statusFilter === 'Pronta para Levantamento' ? 'ring-2 ring-indigo-500' : ''}`} 
            style={{animationDelay: '150ms'}}
          >
            <CardHeader className="pb-1 pt-2 px-2">
              <CardDescription className="text-xs font-medium text-indigo-700">Pronto</CardDescription>
            </CardHeader>
            <CardContent className="pb-2 px-2">
              <p className="text-2xl sm:text-3xl font-bold text-indigo-700">{counts.prontaLevantamento}</p>
            </CardContent>
          </Card>
          <Card 
            onClick={() => setStatusFilter('Entregue')}
            className={`bg-green-50 border-green-200 shadow-sm hover:shadow-md transition-all cursor-pointer card-hover slide-up ${statusFilter === 'Entregue' ? 'ring-2 ring-green-500' : ''}`} 
            style={{animationDelay: '200ms'}}
          >
            <CardHeader className="pb-1 pt-2 px-2">
              <CardDescription className="text-xs font-medium text-green-700">Concluído</CardDescription>
            </CardHeader>
            <CardContent className="pb-2 px-2">
              <p className="text-2xl sm:text-3xl font-bold text-green-700">{counts.entregue + counts.levantada}</p>
            </CardContent>
          </Card>
          <Card 
            onClick={() => setStatusFilter('Cancelada')}
            className={`bg-red-50 border-red-200 shadow-sm hover:shadow-md transition-all cursor-pointer card-hover slide-up ${statusFilter === 'Cancelada' ? 'ring-2 ring-red-500' : ''}`} 
            style={{animationDelay: '250ms'}}
          >
            <CardHeader className="pb-1 pt-2 px-2">
              <CardDescription className="text-xs font-medium text-red-700">Cancelado</CardDescription>
            </CardHeader>
            <CardContent className="pb-2 px-2">
              <p className="text-2xl sm:text-3xl font-bold text-red-700">{counts.cancelada}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros com tipo adicionado */}
        <div className="mb-4 flex flex-col gap-3 relative z-10 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 text-gray-700">
            <Filter className="w-4 h-4" />
            <span className="font-medium text-sm">Filtros</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
            {/* Filtro por Tipo */}
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full border-gray-300 min-h-[38px] text-sm" data-testid="filter-tipo">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="Encomendas">Encomendas</SelectItem>
                <SelectItem value="Orçamentos">Orçamentos</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full border-gray-300 min-h-[38px] text-sm" data-testid="filter-status">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="Todos">Todos os Estados</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Em Preparação">Em Preparação</SelectItem>
                <SelectItem value="Pronta para Levantamento">Pronto</SelectItem>
                <SelectItem value="Entregue">Entregue</SelectItem>
                <SelectItem value="Levantada">Levantada</SelectItem>
                <SelectItem value="Cancelada">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          
            <Select value={colaboradorFilter} onValueChange={setColaboradorFilter}>
              <SelectTrigger className="w-full border-gray-300 min-h-[38px] text-sm" data-testid="filter-colaborador">
                <SelectValue placeholder="Colaborador" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="Todos">Todos</SelectItem>
                {colaboradores.map((colab) => (
                  <SelectItem key={colab.id} value={colab.id}>{colab.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          
            <div className="col-span-2">
              <Input
                type="text"
                placeholder="Pesquisar..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="border-gray-300 min-h-[38px] text-sm"
                data-testid="search-input"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="loading-spin rounded-full h-14 w-14 border-4 border-orange-200 border-t-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">A carregar encomendas...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="text-center py-16 bg-white border-gray-200 shadow-sm fade-in">
            <CardContent>
              <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-xl mb-2">Nenhuma encomenda encontrada</p>
              <p className="text-gray-400 mb-6">Comece criando a sua primeira encomenda</p>
              <Button onClick={handleCreateEncomenda} className="bg-orange-500 hover:bg-orange-600 text-white min-h-[48px] px-6 text-base">
                <Plus className="w-5 h-5 mr-2" />
                Criar Primeira Encomenda
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredOrders.map((order, index) => (
              <Card 
                key={order.id} 
                className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200 card-hover fade-in overflow-hidden"
                style={{animationDelay: `${index * 30}ms`}}
              >
                <CardContent className="p-0">
                  {/* Header com número grande e badge */}
                  <div className={`px-3 py-2 flex items-center justify-between gap-2 ${order.tipo === 'orcamento' ? 'bg-blue-50 border-b border-blue-100' : 'bg-green-50 border-b border-green-100'}`}>
                    <span className={`text-lg sm:text-xl font-bold ${order.tipo === 'orcamento' ? 'text-blue-600' : 'text-green-600'}`}>
                      #{order.numero_encomenda}
                    </span>
                    <Badge className={`status-badge ${getStatusColor(order.status)} text-xs py-0.5 px-2`}>
                      {order.status}
                    </Badge>
                  </div>
                  
                  {/* Corpo do card */}
                  <div className="px-3 py-2">
                    {/* Nome do cliente */}
                    <p className="font-semibold text-gray-900 text-sm mb-1">{order.nome_cliente}</p>
                    
                    {/* Contacto e Colaborador */}
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {order.contacto}
                        </span>
                      </div>
                      <span className="text-gray-400">{formatDate(order.data_criacao)}</span>
                    </div>
                    
                    {/* Criado por (Colaborador) */}
                    {order.nome_colaborador && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                        <Users className="w-3 h-3" />
                        <span>Criado por: <span className="font-medium text-gray-700">{order.nome_colaborador}</span></span>
                      </div>
                    )}
                    
                    {/* Linha de tipo, entrega e total */}
                    <div className="flex items-center justify-between gap-2 py-2 border-t border-gray-100">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 font-medium text-gray-700">
                          {order.tem_entrega ? (
                            <><Truck className="w-3.5 h-3.5 text-orange-500" /> Entrega</>
                          ) : (
                            <><Store className="w-3.5 h-3.5 text-purple-500" /> Levantamento</>
                          )}
                        </span>
                        {order.data_entrega_prevista && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Calendar className="w-3 h-3" /> {order.data_entrega_prevista}
                          </span>
                        )}
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="font-bold text-orange-600 text-sm">€{order.total_final.toFixed(2)}</span>
                        {order.total_final > 0 && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await fetch(`${API_BASE_URL}/orders/${order.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ pago_totalidade: !order.pago_totalidade })
                                });
                                fetchOrders();
                                toast.success(order.pago_totalidade ? 'Marcado como não pago' : 'Marcado como pago');
                              } catch (error) {
                                toast.error('Erro ao atualizar pagamento');
                              }
                            }}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full transition-all ${
                              order.pago_totalidade 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                            }`}
                          >
                            {order.pago_totalidade ? (
                              <span className="flex items-center gap-0.5"><Check className="w-3 h-3" />Pago</span>
                            ) : (
                              'Não Pago'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Observações (colapsável) */}
                    {order.observacoes && (
                      <div className="py-1.5 border-t border-gray-100">
                        <p className="text-xs text-gray-600 truncate" title={order.observacoes}>
                          <FileText className="w-3 h-3 text-yellow-500 inline mr-1" />
                          {order.observacoes}
                        </p>
                      </div>
                    )}
                    
                    {/* Botões compactos */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingOrder(order)}
                        className="flex items-center gap-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-7 px-2 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detalhes
                      </Button>
                      
                      <Button
                        variant="ghost"
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
                        className={`flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-7 px-2 text-xs ${!canEdit(order) ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <Edit className="w-3.5 h-3.5" /> Editar
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1 text-orange-600 hover:text-orange-800 hover:bg-orange-50 h-7 px-2 text-xs"
                          >
                            <Printer className="w-3.5 h-3.5" /> Imprimir
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => handlePrintCliente(order)} className="cursor-pointer py-1.5 text-xs">
                            <FileText className="w-3 h-3 mr-2" /> Cliente
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrintInterno(order)} className="cursor-pointer py-1.5 text-xs">
                            <Package className="w-3 h-3 mr-2" /> Interno
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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

      {/* Modal de Sucesso após Criação/Edição */}
      <Dialog open={showCreatedModal} onOpenChange={setShowCreatedModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2 text-xl">
              <Package className="w-6 h-6" />
              {isEditSuccess 
                ? (createdOrder?.tipo === 'orcamento' ? 'Orçamento alterado!' : 'Encomenda alterada!')
                : (createdOrder?.tipo === 'orcamento' ? 'Orçamento criado!' : 'Encomenda criada!')
              }
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
                  Total: <strong className="text-orange-600 text-lg">€{createdOrder?.total_final?.toFixed(2)}</strong>
                </span>
                {createdOrder?.total_final > 0 && (
                  createdOrder?.pago_totalidade ? (
                    <span className="block text-green-700 font-bold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Pago na totalidade
                    </span>
                  ) : (
                    <span className="block text-red-600 font-bold">
                      Por Pagar: €{createdOrder?.total_final?.toFixed(2)}
                    </span>
                  )
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={`mt-4 ${!isEditSuccess ? 'flex flex-col sm:flex-row gap-2' : ''}`}>
            {!isEditSuccess && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handlePrintCliente(createdOrder)}
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Cliente
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePrintInterno(createdOrder)}
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Interno
                </Button>
              </>
            )}
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
