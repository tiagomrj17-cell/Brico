import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, LogOut, Eye, Filter } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StaffDashboard = () => {
  const { staff, logout, token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (statusFilter === 'Todos') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.status === statusFilter));
    }
  }, [statusFilter, orders]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
      setFilteredOrders(response.data);
    } catch (error) {
      toast.error('Erro ao carregar encomendas');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await axios.patch(
        `${API}/orders/${orderId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Status atualizado com sucesso!');
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/staff/login');
    toast.success('Logout efetuado com sucesso');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Entregue':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Levantada':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Staff</h1>
              <p className="text-gray-600 mt-1">Bem-vindo, {staff?.nome}</p>
            </div>
            <Button
              onClick={handleLogout}
              data-testid="btn-logout"
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardDescription>Total Encomendas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900" data-testid="total-encomendas">{orders.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardDescription>Pendentes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-700" data-testid="total-pendentes">
                {orders.filter(o => o.status === 'Pendente').length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardDescription>Entregues</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-700" data-testid="total-entregues">
                {orders.filter(o => o.status === 'Entregue').length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardDescription>Levantadas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-700" data-testid="total-levantadas">
                {orders.filter(o => o.status === 'Levantada').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-4 relative z-10">
          <Filter className="w-5 h-5 text-gray-600" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="filter-status">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="Todos" data-testid="filter-option-todos">Todos</SelectItem>
              <SelectItem value="Pendente" data-testid="filter-option-pendente">Pendente</SelectItem>
              <SelectItem value="Entregue" data-testid="filter-option-entregue">Entregue</SelectItem>
              <SelectItem value="Levantada" data-testid="filter-option-levantada">Levantada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">A carregar encomendas...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Nenhuma encomenda encontrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="glassmorphism border-0 hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900" data-testid={`order-nome-${order.id}`}>
                        {order.nome_cliente}
                      </h3>
                      <p className="text-gray-600" data-testid={`order-contacto-${order.id}`}>{order.contacto}</p>
                      <p className="text-sm text-gray-500 mt-1">{formatDate(order.data_criacao)}</p>
                    </div>
                    <Badge className={`${getStatusColor(order.status)} border`} data-testid={`order-status-${order.id}`}>
                      {order.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Tipo</p>
                      <p className="font-semibold" data-testid={`order-tipo-${order.id}`}>
                        {order.tem_entrega ? 'Entrega' : 'Levantamento'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Artigos</p>
                      <p className="font-semibold">{order.artigos.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="font-semibold text-purple-600 text-lg" data-testid={`order-total-${order.id}`}>
                        €{order.total_final.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                    <Dialog open={dialogOpen && selectedOrder?.id === order.id} onOpenChange={(open) => {
                      setDialogOpen(open);
                      if (!open) setSelectedOrder(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`btn-ver-detalhes-${order.id}`}
                          onClick={() => {
                            setSelectedOrder(order);
                            setDialogOpen(true);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Detalhes
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-2xl">Detalhes da Encomenda</DialogTitle>
                          <DialogDescription>
                            Encomenda de {selectedOrder?.nome_cliente}
                          </DialogDescription>
                        </DialogHeader>
                        {selectedOrder && (
                          <div className="space-y-4 mt-4">
                            <div>
                              <h4 className="font-semibold mb-2">Informações do Cliente</h4>
                              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                <p><span className="font-medium">Nome:</span> {selectedOrder.nome_cliente}</p>
                                <p><span className="font-medium">Contacto:</span> {selectedOrder.contacto}</p>
                              </div>
                            </div>

                            {selectedOrder.tem_entrega && (
                              <div>
                                <h4 className="font-semibold mb-2">Informações de Entrega</h4>
                                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                  <p><span className="font-medium">Morada:</span> {selectedOrder.morada_entrega}</p>
                                  <p><span className="font-medium">Distância:</span> {selectedOrder.distancia_kms} km</p>
                                  <p><span className="font-medium">Colaboradores:</span> {selectedOrder.num_colaboradores}</p>
                                </div>
                              </div>
                            )}

                            <div>
                              <h4 className="font-semibold mb-2">Artigos</h4>
                              <div className="space-y-3">
                                {selectedOrder.artigos.map((artigo, idx) => (
                                  <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <p className="font-semibold">{artigo.designacao}</p>
                                        <p className="text-sm text-gray-600">Código: {artigo.codigo}</p>
                                      </div>
                                      <Badge variant="secondary">x{artigo.quantidade}</Badge>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span>Preço Unitário: €{artigo.preco_unitario.toFixed(2)}</span>
                                      <span className="font-semibold">Total: €{artigo.preco_total.toFixed(2)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">Resumo de Custos</h4>
                              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                  <span>Subtotal Artigos:</span>
                                  <span className="font-semibold">€{selectedOrder.subtotal_artigos.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Custo de Entrega:</span>
                                  <span className="font-semibold">€{selectedOrder.custo_entrega.toFixed(2)}</span>
                                </div>
                                <div className="border-t border-gray-300 pt-2 mt-2">
                                  <div className="flex justify-between text-lg">
                                    <span className="font-bold">Total Final:</span>
                                    <span className="font-bold text-purple-600">€{selectedOrder.total_final.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Select
                      value={order.status}
                      onValueChange={(value) => handleStatusChange(order.id, value)}
                    >
                      <SelectTrigger className="w-48" data-testid={`select-status-${order.id}`}>
                        <SelectValue placeholder="Alterar status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Entregue">Entregue</SelectItem>
                        <SelectItem value="Levantada">Levantada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;