import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Filter, Plus, Edit, Trash2, Printer } from 'lucide-react';
import OrderFormModal from '@/components/OrderFormModal';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import PrintView from '@/components/PrintView';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Todos');
  
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [printingOrder, setPrintingOrder] = useState(null);

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
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
      setFilteredOrders(response.data);
    } catch (error) {
      toast.error('Erro ao carregar encomendas');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!deletingOrder) return;

    try {
      await axios.delete(`${API}/orders/${deletingOrder.id}`);
      toast.success('Encomenda eliminada com sucesso!');
      setDeletingOrder(null);
      fetchOrders();
    } catch (error) {
      toast.error('Erro ao eliminar encomenda');
    }
  };

  const handlePrint = (order) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
    }, 100);
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

  const counts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print View */}
      {printingOrder && <PrintView order={printingOrder} />}

      {/* Header */}
      <div className="no-print bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className=\"text-4xl font-bold text-gray-900\">Gestão de Encomendas</h1>
              <p className=\"text-gray-600 mt-2\">Sistema de gestão completo</p>
            </div>
            <Button
              onClick={() => {
                setEditingOrder(null);
                setOrderFormOpen(true);
              }}
              data-testid=\"btn-nova-encomenda\"
              className=\"bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white flex items-center gap-2 px-6 py-6 text-lg\"
            >
              <Plus className=\"w-5 h-5\" />
              Nova Encomenda
            </Button>
          </div>
        </div>
      </div>

      <div className=\"no-print max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8\">
        {/* Stats Cards */}
        <div className=\"grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8\">
          <Card className=\"bg-white border-gray-200 shadow-sm\">
            <CardHeader className=\"pb-2\">
              <CardDescription className=\"text-xs\">Total</CardDescription>
            </CardHeader>
            <CardContent>
              <p className=\"text-2xl font-bold text-gray-900\" data-testid=\"total-encomendas\">{counts.total}</p>
            </CardContent>
          </Card>
          <Card className=\"bg-yellow-50 border-yellow-200 shadow-sm\">
            <CardHeader className=\"pb-2\">
              <CardDescription className=\"text-xs\">Pendente</CardDescription>
            </CardHeader>
            <CardContent>
              <p className=\"text-2xl font-bold text-yellow-700\">{counts.pendente}</p>
            </CardContent>
          </Card>
          <Card className=\"bg-blue-50 border-blue-200 shadow-sm\">
            <CardHeader className=\"pb-2\">
              <CardDescription className=\"text-xs\">Em Preparação</CardDescription>
            </CardHeader>
            <CardContent>
              <p className=\"text-2xl font-bold text-blue-700\">{counts.emPreparacao}</p>
            </CardContent>
          </Card>
          <Card className=\"bg-indigo-50 border-indigo-200 shadow-sm\">
            <CardHeader className=\"pb-2\">
              <CardDescription className=\"text-xs\">Pronta</CardDescription>
            </CardHeader>
            <CardContent>
              <p className=\"text-2xl font-bold text-indigo-700\">{counts.prontaLevantamento}</p>
            </CardContent>
          </Card>
          <Card className=\"bg-green-50 border-green-200 shadow-sm\">
            <CardHeader className=\"pb-2\">
              <CardDescription className=\"text-xs\">Concluídas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className=\"text-2xl font-bold text-green-700\">{counts.entregue + counts.levantada}</p>
            </CardContent>
          </Card>
          <Card className=\"bg-red-50 border-red-200 shadow-sm\">
            <CardHeader className=\"pb-2\">
              <CardDescription className=\"text-xs\">Cancelada</CardDescription>
            </CardHeader>
            <CardContent>
              <p className=\"text-2xl font-bold text-red-700\">{counts.cancelada}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className=\"mb-6 flex items-center gap-4 relative z-10\">
          <Filter className=\"w-5 h-5 text-gray-600\" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className=\"w-64 border-gray-300\" data-testid=\"filter-status\">
              <SelectValue placeholder=\"Filtrar por status\" />
            </SelectTrigger>
            <SelectContent className=\"z-50\">
              <SelectItem value=\"Todos\">Todos</SelectItem>
              <SelectItem value=\"Pendente\">Pendente</SelectItem>
              <SelectItem value=\"Em Preparação\">Em Preparação</SelectItem>
              <SelectItem value=\"Pronta para Levantamento\">Pronta para Levantamento</SelectItem>
              <SelectItem value=\"Entregue\">Entregue</SelectItem>
              <SelectItem value=\"Levantada\">Levantada</SelectItem>
              <SelectItem value=\"Cancelada\">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className=\"text-center py-12\">
            <div className=\"animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto\"></div>
            <p className=\"mt-4 text-gray-600\">A carregar encomendas...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className=\"text-center py-12 bg-white border-gray-200\">
            <CardContent>
              <Package className=\"w-16 h-16 text-gray-400 mx-auto mb-4\" />
              <p className=\"text-gray-600 text-lg mb-4\">Nenhuma encomenda encontrada</p>
              <Button onClick={() => setOrderFormOpen(true)} className=\"bg-orange-500 hover:bg-orange-600 text-white\">
                <Plus className=\"w-4 h-4 mr-2\" />
                Criar Primeira Encomenda
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className=\"grid grid-cols-1 gap-4\">
            {filteredOrders.map((order) => (
              <Card key={order.id} className=\"bg-white border-gray-200 hover:shadow-md transition-shadow\">
                <CardContent className=\"p-5\">
                  <div className=\"flex items-start justify-between mb-3\">
                    <div className=\"flex-1\">
                      <h3 className=\"text-lg font-bold text-gray-900\">{order.nome_cliente}</h3>
                      <p className=\"text-sm text-gray-600\">{order.contacto}</p>
                      <p className=\"text-xs text-gray-500 mt-1\">Criada: {formatDate(order.data_criacao)}</p>
                      {order.data_atualizacao && order.data_atualizacao !== order.data_criacao && (
                        <p className=\"text-xs text-orange-600 font-medium mt-0.5\">
                          Última atualização: {formatDate(order.data_atualizacao)}
                        </p>
                      )}
                    </div>
                    <Badge className={`status-badge ${getStatusColor(order.status)}`}>
                      {order.status}
                    </Badge>
                  </div>

                  <div className=\"grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm\">
                    <div>
                      <p className=\"text-gray-600\">Tipo</p>
                      <p className=\"font-semibold\">{order.tem_entrega ? 'Entrega' : 'Levantamento'}</p>
                    </div>
                    <div>
                      <p className=\"text-gray-600\">Artigos</p>
                      <p className=\"font-semibold\">{order.artigos.length}</p>
                    </div>
                    <div>
                      <p className=\"text-gray-600\">Entrega Prevista</p>
                      <p className=\"font-semibold\">{order.data_entrega_prevista || '-'}</p>
                    </div>
                    <div>
                      <p className=\"text-gray-600\">Total</p>
                      <p className=\"font-semibold text-orange-600 text-base\">€{order.total_final.toFixed(2)}</p>
                    </div>
                  </div>

                  {order.observacoes && (
                    <div className=\"mb-3 p-2 bg-gray-50 rounded text-sm\">
                      <p className=\"text-gray-600 font-medium\">Observações:</p>
                      <p className=\"text-gray-700\">{order.observacoes}</p>
                    </div>
                  )}

                  <div className=\"flex items-center gap-2 pt-3 border-t border-gray-200\">
                    <Button
                      variant=\"outline\"
                      size=\"sm\"
                      onClick={() => setViewingOrder(order)}
                      className=\"flex items-center gap-2 border-gray-300\"
                    >
                      Ver Detalhes
                    </Button>
                    <Button
                      variant=\"outline\"
                      size=\"sm\"
                      onClick={() => {
                        setEditingOrder(order);
                        setOrderFormOpen(true);
                      }}
                      className=\"flex items-center gap-2 border-gray-300\"
                    >
                      <Edit className=\"w-4 h-4\" />
                      Editar
                    </Button>
                    <Button
                      variant=\"outline\"
                      size=\"sm\"
                      onClick={() => handlePrint(order)}
                      className=\"flex items-center gap-2 border-orange-300 text-orange-600 hover:bg-orange-50\"
                    >
                      <Printer className=\"w-4 h-4\" />
                      Imprimir
                    </Button>
                    <Button
                      variant=\"outline\"
                      size=\"sm\"
                      onClick={() => setDeletingOrder(order)}
                      className=\"flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50\"
                    >
                      <Trash2 className=\"w-4 h-4\" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <OrderFormModal
        open={orderFormOpen}
        onClose={() => {
          setOrderFormOpen(false);
          setEditingOrder(null);
        }}
        onSave={() => {
          setOrderFormOpen(false);
          setEditingOrder(null);
          fetchOrders();
        }}
        order={editingOrder}
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
        orderName={deletingOrder?.nome_cliente}
      />
    </div>
  );
};

export default Dashboard;