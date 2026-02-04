import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Truck, 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Phone, 
  User, 
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Navigation,
  Eye,
  CalendarPlus,
  Filter
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EntregasPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [colaboradorFilter, setColaboradorFilter] = useState('Todos');
  const [searchText, setSearchText] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // Modal de agendamento
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newDate, setNewDate] = useState('');
  
  // Modal de detalhes
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
    fetchColaboradores();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [statusFilter, colaboradorFilter, searchText, dateFilter, orders]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      // Filtrar apenas encomendas com entrega
      const deliveryOrders = response.data.filter(order => order.tem_entrega);
      setOrders(deliveryOrders);
    } catch (error) {
      toast.error('Erro ao carregar entregas');
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

  const getDeliveryStatus = (order) => {
    // Se já foi entregue ou levantada
    if (order.status === 'Entregue') return 'Entregue';
    if (order.status === 'Cancelada') return 'Cancelada';
    
    // Se tem data de entrega prevista
    if (order.data_entrega_prevista) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deliveryDate = new Date(order.data_entrega_prevista);
      deliveryDate.setHours(0, 0, 0, 0);
      
      // Se a data é hoje, está em trânsito
      if (deliveryDate.getTime() === today.getTime()) {
        return 'Em Trânsito';
      }
      // Se a data já passou e não foi entregue
      if (deliveryDate < today) {
        return 'Atrasada';
      }
      return 'Agendada';
    }
    
    return 'Por Agendar';
  };

  const filterOrders = () => {
    let filtered = orders;
    
    // Filtro por estado de entrega
    if (statusFilter !== 'Todos') {
      filtered = filtered.filter(order => getDeliveryStatus(order) === statusFilter);
    }
    
    // Filtro por colaborador
    if (colaboradorFilter !== 'Todos') {
      filtered = filtered.filter(order => order.colaborador_id === colaboradorFilter);
    }
    
    // Filtro por data
    if (dateFilter) {
      filtered = filtered.filter(order => 
        order.data_entrega_prevista && order.data_entrega_prevista.startsWith(dateFilter)
      );
    }
    
    // Filtro por texto (cliente, número, morada)
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(order => 
        order.nome_cliente.toLowerCase().includes(search) ||
        (order.numero_encomenda && order.numero_encomenda.toLowerCase().includes(search)) ||
        (order.morada_entrega && order.morada_entrega.toLowerCase().includes(search)) ||
        (order.contacto && order.contacto.toLowerCase().includes(search))
      );
    }
    
    // Ordenar por data de entrega (mais próximas primeiro)
    filtered.sort((a, b) => {
      if (!a.data_entrega_prevista && !b.data_entrega_prevista) return 0;
      if (!a.data_entrega_prevista) return 1;
      if (!b.data_entrega_prevista) return -1;
      return new Date(a.data_entrega_prevista) - new Date(b.data_entrega_prevista);
    });
    
    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status) => {
    const config = {
      'Por Agendar': { color: 'bg-gray-100 text-gray-700 border-gray-300', icon: AlertCircle },
      'Agendada': { color: 'bg-blue-100 text-blue-700 border-blue-300', icon: Calendar },
      'Em Trânsito': { color: 'bg-orange-100 text-orange-700 border-orange-300', icon: Navigation },
      'Entregue': { color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle },
      'Atrasada': { color: 'bg-red-100 text-red-700 border-red-300', icon: Clock },
      'Cancelada': { color: 'bg-red-100 text-red-600 border-red-300', icon: AlertCircle }
    };
    
    const { color, icon: Icon } = config[status] || config['Por Agendar'];
    
    return (
      <Badge className={`${color} border flex items-center gap-1 px-2 py-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getCounts = () => {
    return {
      total: orders.length,
      porAgendar: orders.filter(o => getDeliveryStatus(o) === 'Por Agendar').length,
      agendada: orders.filter(o => getDeliveryStatus(o) === 'Agendada').length,
      emTransito: orders.filter(o => getDeliveryStatus(o) === 'Em Trânsito').length,
      entregue: orders.filter(o => getDeliveryStatus(o) === 'Entregue').length,
      atrasada: orders.filter(o => getDeliveryStatus(o) === 'Atrasada').length
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleSchedule = (order) => {
    setSelectedOrder(order);
    setNewDate(order.data_entrega_prevista || '');
    setScheduleModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!selectedOrder) return;
    
    try {
      await axios.put(`${API}/orders/${selectedOrder.id}`, {
        data_entrega_prevista: newDate || null
      });
      toast.success('Data de entrega atualizada!');
      setScheduleModalOpen(false);
      fetchOrders();
    } catch (error) {
      toast.error('Erro ao atualizar data de entrega');
    }
  };

  const handleMarkDelivered = async (order) => {
    try {
      await axios.put(`${API}/orders/${order.id}`, {
        status: 'Entregue'
      });
      toast.success('Entrega marcada como concluída!');
      fetchOrders();
    } catch (error) {
      toast.error('Erro ao atualizar estado');
    }
  };

  const handleViewDetails = (order) => {
    setViewingOrder(order);
    setDetailsModalOpen(true);
  };

  const counts = getCounts();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center fade-in">
          <Truck className="w-16 h-16 text-orange-500 loading-pulse mx-auto mb-4" />
          <p className="text-gray-600 text-lg">A carregar entregas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header responsivo */}
      <div className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 min-h-[36px] -ml-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </Button>
            <div className="fade-in">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
                Gestão de Entregas
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm">Acompanhe e gira todas as entregas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-5">
        {/* Stats Cards - responsivos com cores de fundo */}
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg card-hover slide-up bg-white border-gray-200 ${statusFilter === 'Todos' ? 'ring-2 ring-gray-400 shadow-md' : ''}`}
            onClick={() => setStatusFilter('Todos')}
            style={{animationDelay: '0ms'}}
          >
            <CardContent className="p-2 sm:p-3 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{counts.total}</p>
              <p className="text-xs text-gray-500 font-medium">Total</p>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg card-hover slide-up bg-gray-50 border-gray-300 ${statusFilter === 'Por Agendar' ? 'ring-2 ring-gray-500 shadow-md' : ''}`}
            onClick={() => setStatusFilter('Por Agendar')}
            style={{animationDelay: '50ms'}}
          >
            <CardContent className="p-2 sm:p-3 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-gray-700">{counts.porAgendar}</p>
              <p className="text-xs text-gray-600 font-medium">Por Agendar</p>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg card-hover slide-up bg-blue-50 border-blue-200 ${statusFilter === 'Agendada' ? 'ring-2 ring-blue-500 shadow-md' : ''}`}
            onClick={() => setStatusFilter('Agendada')}
            style={{animationDelay: '100ms'}}
          >
            <CardContent className="p-2 sm:p-3 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-blue-700">{counts.agendada}</p>
              <p className="text-xs text-blue-600 font-medium">Agendadas</p>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg card-hover slide-up bg-orange-50 border-orange-200 ${statusFilter === 'Em Trânsito' ? 'ring-2 ring-orange-500 shadow-md' : ''}`}
            onClick={() => setStatusFilter('Em Trânsito')}
            style={{animationDelay: '150ms'}}
          >
            <CardContent className="p-2 sm:p-3 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-orange-700">{counts.emTransito}</p>
              <p className="text-xs text-orange-600 font-medium">Em Trânsito</p>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg card-hover slide-up bg-red-50 border-red-200 ${statusFilter === 'Atrasada' ? 'ring-2 ring-red-500 shadow-md' : ''}`}
            onClick={() => setStatusFilter('Atrasada')}
            style={{animationDelay: '200ms'}}
          >
            <CardContent className="p-2 sm:p-3 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-red-700">{counts.atrasada}</p>
              <p className="text-xs text-red-600 font-medium">Atrasadas</p>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg card-hover slide-up bg-green-50 border-green-200 ${statusFilter === 'Entregue' ? 'ring-2 ring-green-500 shadow-md' : ''}`}
            onClick={() => setStatusFilter('Entregue')}
            style={{animationDelay: '250ms'}}
          >
            <CardContent className="p-2 sm:p-3 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-green-700">{counts.entregue}</p>
              <p className="text-xs text-green-600 font-medium">Entregues</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters - melhorados para mobile */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Pesquisar</Label>
              <Input
                placeholder="Cliente, nº, morada..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="border-gray-300 min-h-[36px] text-sm"
              />
            </div>
            
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Data de Entrega</Label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border-gray-300 min-h-[36px] text-sm"
              />
            </div>
            
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Colaborador</Label>
              <Select value={colaboradorFilter} onValueChange={setColaboradorFilter}>
                <SelectTrigger className="border-gray-300 min-h-[36px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {colaboradores.map((colab) => (
                    <SelectItem key={colab.id} value={colab.id}>{colab.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('Todos');
                  setColaboradorFilter('Todos');
                  setSearchText('');
                  setDateFilter('');
                }}
                className="w-full border-gray-300 min-h-[36px] text-sm"
              >
                Limpar
              </Button>
            </div>
          </div>
        </div>

        {/* Delivery Cards */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center fade-in">
            <Truck className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma entrega encontrada</h3>
            <p className="text-gray-500 text-sm">Não há entregas que correspondam aos filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredOrders.map((order, index) => {
              const deliveryStatus = getDeliveryStatus(order);
              const isDelivered = deliveryStatus === 'Entregue';
              const isCancelled = deliveryStatus === 'Cancelada';
              
              return (
                <Card 
                  key={order.id} 
                  className={`overflow-hidden transition-all duration-200 hover:shadow-lg card-hover fade-in ${
                    isDelivered ? 'bg-green-50 border-green-200' :
                    isCancelled ? 'bg-red-50 border-red-200 opacity-60' :
                    deliveryStatus === 'Atrasada' ? 'bg-red-50 border-red-200' :
                    deliveryStatus === 'Em Trânsito' ? 'bg-orange-50 border-orange-200' :
                    'bg-white'
                  }`}
                  style={{animationDelay: `${index * 30}ms`}}
                >
                  <CardContent className="p-0">
                    {/* Header compacto */}
                    <div className="px-3 py-2 bg-green-50 border-b border-green-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-green-600">#{order.numero_encomenda}</span>
                        <span className="text-sm font-semibold text-gray-800 truncate">{order.nome_cliente}</span>
                      </div>
                      {getStatusBadge(deliveryStatus)}
                    </div>
                    
                    {/* Corpo compacto */}
                    <div className="px-3 py-2">
                      {/* Info linha 1 */}
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {order.contacto}
                          </span>
                          {order.nome_colaborador && (
                            <span className="hidden sm:flex items-center gap-1 text-gray-500">
                              <Package className="w-3 h-3" /> {order.nome_colaborador}
                            </span>
                          )}
                        </div>
                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                          <Calendar className="w-3 h-3" />
                          {order.data_entrega_prevista ? formatDate(order.data_entrega_prevista) : 'Sem data'}
                        </span>
                      </div>
                      
                      {/* Morada */}
                      <div className="flex items-center justify-between py-1.5 border-t border-gray-100 text-xs">
                        <span className="flex items-center gap-1 text-gray-700">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" />
                          <span className="truncate max-w-[200px] sm:max-w-none">{order.morada_entrega}</span>
                        </span>
                        {order.distancia_kms && (
                          <Badge variant="outline" className="text-xs py-0 px-1.5 h-5 bg-white">
                            {order.distancia_kms} km
                          </Badge>
                        )}
                      </div>
                      
                      {/* Botões compactos */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(order)}
                          className="flex items-center gap-1 text-gray-600 hover:bg-gray-100 h-7 px-2 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detalhes
                        </Button>
                        
                        {!isDelivered && !isCancelled && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSchedule(order)}
                              className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 h-7 px-2 text-xs"
                            >
                              <CalendarPlus className="w-3.5 h-3.5" />
                              {order.data_entrega_prevista ? 'Reagendar' : 'Agendar'}
                              </span>
                            </Button>
                            
                            <Button
                              size="sm"
                              onClick={() => handleMarkDelivered(order)}
                              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white h-7 px-2.5 text-xs"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Entregue
                            </Button>
                          </>
                        )}
                        
                        {/* Total inline */}
                        <div className="ml-auto flex items-center gap-2 text-xs">
                          <span className="text-gray-500">{order.artigos?.length || 0} art.</span>
                          <span className="font-bold text-orange-600 text-sm">€{order.total_final?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Agendamento */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              {selectedOrder?.data_entrega_prevista ? 'Reagendar Entrega' : 'Agendar Entrega'}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.numero_encomenda} - {selectedOrder?.nome_cliente}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="delivery-date" className="text-sm font-medium">
              Data de Entrega
            </Label>
            <Input
              id="delivery-date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-2"
              min={new Date().toISOString().split('T')[0]}
            />
            
            {selectedOrder?.morada_entrega && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Morada de entrega:</p>
                <p className="text-sm text-gray-700">{selectedOrder.morada_entrega}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveSchedule}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-600" />
              Detalhes da Entrega
            </DialogTitle>
          </DialogHeader>
          
          {viewingOrder && (
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-green-600">
                  #{viewingOrder.numero_encomenda}
                </span>
                {getStatusBadge(getDeliveryStatus(viewingOrder))}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Cliente</p>
                  <p className="font-medium">{viewingOrder.nome_cliente}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Contacto</p>
                  <p className="font-medium">{viewingOrder.contacto}</p>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-gray-500">Morada de Entrega</p>
                <p className="font-medium">{viewingOrder.morada_entrega}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Distância: {viewingOrder.distancia_kms} km • 
                  Colaboradores: {viewingOrder.num_colaboradores || 1}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Data Prevista</p>
                  <p className="font-medium">
                    {viewingOrder.data_entrega_prevista 
                      ? formatDate(viewingOrder.data_entrega_prevista)
                      : 'Não agendada'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Colaborador</p>
                  <p className="font-medium">{viewingOrder.nome_colaborador || '-'}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-xs text-gray-500 mb-2">Artigos ({viewingOrder.artigos?.length || 0})</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {viewingOrder.artigos?.map((art, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                      <span>{art.codigo} - {art.designacao}</span>
                      <span className="font-medium">x{art.quantidade}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t pt-4 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500">Custo de Entrega</p>
                  <p className="font-medium">€{viewingOrder.custo_entrega?.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total da Encomenda</p>
                  <p className="text-2xl font-bold text-orange-600">
                    €{viewingOrder.total_final?.toFixed(2)}
                  </p>
                </div>
              </div>
              
              {viewingOrder.observacoes && (
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 mb-1">Observações</p>
                  <p className="text-sm bg-yellow-50 p-3 rounded border border-yellow-200">
                    {viewingOrder.observacoes}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
              Fechar
            </Button>
            <Button 
              onClick={() => {
                setDetailsModalOpen(false);
                navigate(`/print-interno/${viewingOrder.id}`);
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EntregasPage;
