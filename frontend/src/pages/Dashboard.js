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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Título */}
            <div className="fade-in">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                Encomendas e Orçamentos
              </h1>
              <p className="text-sm text-gray-500 mt-1 hidden sm:block">
                Gestão completa das suas encomendas
              </p>
            </div>
            
            {/* Botões de ação */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
              <Button
                onClick={() => navigate('/entregas')}
                variant="outline"
                className="flex items-center gap-2 border-orange-400 text-orange-600 hover:bg-orange-50 hover:border-orange-500 transition-all flex-1 sm:flex-none justify-center min-h-[44px]"
              >
                <Truck className="w-5 h-5" />
                <span className="sm:inline">Entregas</span>
              </Button>
              
              <Button
                onClick={() => navigate('/colaboradores')}
                variant="outline"
                className="flex items-center gap-2 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-500 transition-all flex-1 sm:flex-none justify-center min-h-[44px]"
              >
                <Users className="w-5 h-5" />
                <span className="hidden sm:inline">Colaboradores</span>
                <span className="sm:hidden">Equipa</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-testid="btn-nova-encomenda"
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all min-h-[48px] flex-1 sm:flex-none justify-center"
                  >
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>Criar</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2">
                  <DropdownMenuItem 
                    onClick={handleCreateEncomenda} 
                    className="cursor-pointer py-3 px-4 text-base hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Package className="w-5 h-5 mr-3 text-green-600" />
                    Nova Encomenda
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleCreateOrcamento} 
                    className="cursor-pointer py-3 px-4 text-base hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <FileText className="w-5 h-5 mr-3 text-blue-600" />
                    Novo Orçamento
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Cards de estatísticas - clicáveis para filtrar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card 
            onClick={() => setStatusFilter('Todos')}
            className={`bg-white border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer card-hover slide-up ${statusFilter === 'Todos' ? 'ring-2 ring-gray-400' : ''}`} 
            style={{animationDelay: '0ms'}}
          >
            <CardHeader className="pb-2 pt-4">
              <CardDescription className="text-xs sm:text-sm font-medium">Total</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-3xl sm:text-4xl font-bold text-gray-900" data-testid="total-encomendas">{counts.total}</p>
            </CardContent>
          </Card>
          <Card 
            onClick={() => setStatusFilter('Pendente')}
            className={`bg-yellow-50 border-yellow-200 shadow-sm hover:shadow-md transition-all cursor-pointer card-hover slide-up ${statusFilter === 'Pendente' ? 'ring-2 ring-yellow-500' : ''}`} 
            style={{animationDelay: '50ms'}}
          >
            <CardHeader className="pb-2 pt-4">
              <CardDescription className="text-xs sm:text-sm font-medium text-yellow-700">Pendente</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-3xl sm:text-4xl font-bold text-yellow-700">{counts.pendente}</p>
            </CardContent>
          </Card>
          <Card 
            onClick={() => setStatusFilter('Em Preparação')}
            className={`bg-blue-50 border-blue-200 shadow-sm hover:shadow-md transition-all cursor-pointer card-hover slide-up ${statusFilter === 'Em Preparação' ? 'ring-2 ring-blue-500' : ''}`} 
            style={{animationDelay: '100ms'}}
          >
            <CardHeader className="pb-2 pt-4">
              <CardDescription className="text-xs sm:text-sm font-medium text-blue-700">Em Preparação</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-3xl sm:text-4xl font-bold text-blue-700">{counts.emPreparacao}</p>
            </CardContent>
          </Card>
          <Card 
            onClick={() => setStatusFilter('Pronta para Levantamento')}
            className={`bg-indigo-50 border-indigo-200 shadow-sm hover:shadow-md transition-all cursor-pointer card-hover slide-up ${statusFilter === 'Pronta para Levantamento' ? 'ring-2 ring-indigo-500' : ''}`} 
            style={{animationDelay: '150ms'}}
          >
            <CardHeader className="pb-2 pt-4">
              <CardDescription className="text-xs sm:text-sm font-medium text-indigo-700">Pronto</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-3xl sm:text-4xl font-bold text-indigo-700">{counts.prontaLevantamento}</p>
            </CardContent>
          </Card>
          <Card 
            onClick={() => setStatusFilter('Entregue')}
            className={`bg-green-50 border-green-200 shadow-sm hover:shadow-md transition-all cursor-pointer card-hover slide-up ${statusFilter === 'Entregue' ? 'ring-2 ring-green-500' : ''}`} 
            style={{animationDelay: '200ms'}}
          >
            <CardHeader className="pb-2 pt-4">
              <CardDescription className="text-xs sm:text-sm font-medium text-green-700">Concluído</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-3xl sm:text-4xl font-bold text-green-700">{counts.entregue + counts.levantada}</p>
            </CardContent>
          </Card>
          <Card 
            onClick={() => setStatusFilter('Cancelada')}
            className={`bg-red-50 border-red-200 shadow-sm hover:shadow-md transition-all cursor-pointer card-hover slide-up ${statusFilter === 'Cancelada' ? 'ring-2 ring-red-500' : ''}`} 
            style={{animationDelay: '250ms'}}
          >
            <CardHeader className="pb-2 pt-4">
              <CardDescription className="text-xs sm:text-sm font-medium text-red-700">Cancelado</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-3xl sm:text-4xl font-bold text-red-700">{counts.cancelada}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros com tipo adicionado */}
        <div className="mb-6 flex flex-col gap-4 relative z-10 bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <Filter className="w-5 h-5" />
            <span className="font-medium">Filtros</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Filtro por Tipo */}
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full border-gray-300 min-h-[44px]" data-testid="filter-tipo">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="Encomendas">Encomendas</SelectItem>
                <SelectItem value="Orçamentos">Orçamentos</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full border-gray-300 min-h-[44px]" data-testid="filter-status">
                <SelectValue placeholder="Estado" />
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
          
            <Select value={colaboradorFilter} onValueChange={setColaboradorFilter}>
              <SelectTrigger className="w-full border-gray-300 min-h-[44px]" data-testid="filter-colaborador">
                <SelectValue placeholder="Colaborador" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="Todos">Todos os Colaboradores</SelectItem>
                {colaboradores.map((colab) => (
                  <SelectItem key={colab.id} value={colab.id}>{colab.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          
            <div className="sm:col-span-2">
              <Input
                type="text"
                placeholder="Pesquisar por nº, cliente, código..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="border-gray-300 min-h-[44px]"
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
          <div className="grid grid-cols-1 gap-4">
            {filteredOrders.map((order, index) => (
              <Card 
                key={order.id} 
                className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200 card-hover fade-in"
                style={{animationDelay: `${index * 50}ms`}}
              >
                <CardContent className="p-3 sm:p-4">
                  {/* Header do card */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      {/* Número + Nome */}
                      <div className="flex items-center gap-2 mb-1">
                        {order.numero_encomenda && (
                          <p className={`text-lg sm:text-xl font-bold ${order.tipo === 'orcamento' ? 'text-blue-600' : 'text-green-600'}`}>
                            #{order.numero_encomenda}
                          </p>
                        )}
                      </div>
                      
                      {/* Nome do Cliente */}
                      <p className="text-base font-bold text-gray-900 mb-0.5 truncate">{order.nome_cliente}</p>
                      
                      {/* Contacto */}
                      <p className="text-sm text-gray-700">
                        <span className="text-gray-500">Contacto: </span>
                        {order.contacto}
                      </p>
                      
                      {/* Colaborador */}
                      {order.nome_colaborador && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Colaborador: {order.nome_colaborador}
                        </p>
                      )}
                      
                      {/* Data */}
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.data_criacao)}</p>
                    </div>
                    
                    {/* Badge único */}
                    <Badge className={`status-badge ${getStatusColor(order.status)} shrink-0`}>
                      {order.status}
                    </Badge>
                  </div>

                  {/* Info grid - responsivo */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-gray-500 text-xs mb-1">Tipo</p>
                      <p className="font-semibold text-gray-900 flex items-center gap-1">
                        {order.tem_entrega ? (
                          <><Truck className="w-4 h-4 text-orange-500" /> Entrega</>
                        ) : (
                          <><Store className="w-4 h-4 text-purple-500" /> Levantamento</>
                        )}
                      </p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <p className="text-gray-500 text-xs mb-1">Total</p>
                      <p className="font-bold text-orange-600 text-lg">€{order.total_final.toFixed(2)}</p>
                      {order.total_final > 0 && (
                        <>
                          {order.pago_totalidade ? (
                            <p className="text-xs text-green-600 font-semibold mt-1 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Pago
                            </p>
                          ) : (
                            <p className="text-xs text-red-600 font-semibold mt-1">
                              Falta: €{(order.total_final - (order.adiantamento || 0)).toFixed(2)}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {order.data_entrega_prevista && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm border border-blue-100">
                      <p className="text-blue-800 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">Entrega Prevista:</span> {order.data_entrega_prevista}
                      </p>
                    </div>
                  )}

                  {order.observacoes && (
                    <div className="mb-4 p-3 bg-yellow-50 rounded-lg text-sm border border-yellow-100">
                      <p className="text-gray-700 font-medium mb-1 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-yellow-600" /> Observações:
                      </p>
                      <p className="text-gray-600">{order.observacoes}</p>
                    </div>
                  )}

                  {order.historico && order.historico.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm border border-blue-200">
                      <p className="text-blue-800 font-medium mb-2 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" /> Últimas Alterações:
                      </p>
                      <div className="text-xs text-blue-700 space-y-1">
                        {order.historico
                          .filter(alt => alt.campo_alterado !== 'artigos_separados')
                          .slice(-3).reverse().map((alt, idx) => {
                          const nomeCampo = {
                            'status': 'Estado',
                            'observacoes': 'Observações',
                            'data_entrega_prevista': 'Data Prevista',
                            'data_levantada': 'Levantamento',
                            'artigos': 'Artigos',
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
                          
                          if (alt.campo_alterado === 'artigos' && Array.isArray(valorParsed)) {
                            valorFormatado = valorParsed.map(a => `${a.designacao || a.codigo} (x${a.quantidade})`).join(', ');
                          } else if (alt.campo_alterado === 'pago_totalidade') {
                            valorFormatado = (valorParsed === true || valorParsed === 'True' || valorParsed === 'true') ? 'Sim' : 'Não';
                          } else if (Array.isArray(valorParsed)) {
                            valorFormatado = valorParsed.map(a => a.designacao || a.codigo || JSON.stringify(a)).join(', ');
                          } else if (typeof valorParsed === 'object' && valorParsed !== null) {
                            valorFormatado = valorParsed.designacao || valorParsed.codigo || JSON.stringify(valorParsed);
                          }
                          
                          return (
                            <p key={idx} className="truncate">
                              <span className="font-medium">{nomeCampo}:</span> {valorFormatado}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Botões de ação - responsivos */}
                  <div className="flex items-center gap-2 sm:gap-3 pt-4 border-t border-gray-200 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingOrder(order)}
                      className="flex items-center gap-2 border-gray-300 hover:bg-gray-100 min-h-[40px] text-sm"
                    >
                      <Eye className="w-4 h-4" /> <span className="hidden sm:inline">Ver </span>Detalhes
                    </Button>
                    
                    {/* Botão Editar */}
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
                      className={`flex items-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50 min-h-[40px] text-sm ${!canEdit(order) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Edit className="w-4 h-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                    
                    {/* Dropdown de Impressão */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 border-orange-300 text-orange-600 hover:bg-orange-50 min-h-[40px] text-sm"
                        >
                          <Printer className="w-4 h-4" />
                          <span className="hidden sm:inline">Imprimir</span>
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handlePrintCliente(order)} className="cursor-pointer py-3 hover:bg-gray-50">
                          <FileText className="w-4 h-4 mr-3" />
                          Versão Cliente
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrintInterno(order)} className="cursor-pointer py-3 hover:bg-gray-50">
                          <Package className="w-4 h-4 mr-3" />
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
                      Falta Pagar: €{(createdOrder?.total_final - (createdOrder?.adiantamento || 0)).toFixed(2)}
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
