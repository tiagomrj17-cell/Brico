import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, CheckSquare, CheckCircle, Hash } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OrderFormModal = ({ open, onClose, onSave, order, orderType = 'encomenda', colaboradores = [] }) => {
  const isEditing = !!order;
  const tipoLabel = orderType === 'orcamento' ? 'Orçamento' : 'Encomenda';
  const tipoLabelFeminino = orderType === 'orcamento' ? 'o orçamento' : 'a encomenda';
  
  const [nextNumber, setNextNumber] = useState(null);
  
  const [formData, setFormData] = useState({
    nome_cliente: '',
    contacto: '',
    tem_entrega: false,
    morada_entrega: '',
    distancia_kms: '',
    num_colaboradores: 1,
    observacoes: '',
    data_entrega_prevista: '',
    colaborador_id: '',
    adiantamento: '',
    pago_totalidade: false
  });

  const [artigos, setArtigos] = useState([
    { codigo: '', designacao: '', quantidade: 1, preco_unitario: 0, preco_total: 0, separado: false }
  ]);

  const [submitting, setSubmitting] = useState(false);

  // Buscar próximo número quando modal abre para criação
  useEffect(() => {
    if (open && !order) {
      fetchNextNumber();
    }
  }, [open, order, orderType]);

  const fetchNextNumber = async () => {
    try {
      const response = await axios.get(`${API}/orders/next-number/${orderType}`);
      setNextNumber(response.data.next_number);
    } catch (error) {
      console.error('Erro ao buscar próximo número:', error);
    }
  };

  useEffect(() => {
    if (order) {
      setFormData({
        nome_cliente: order.nome_cliente,
        contacto: order.contacto,
        tem_entrega: order.tem_entrega,
        morada_entrega: order.morada_entrega || '',
        distancia_kms: order.distancia_kms || '',
        num_colaboradores: order.num_colaboradores || 1,
        observacoes: order.observacoes || '',
        data_entrega_prevista: order.data_entrega_prevista || '',
        colaborador_id: order.colaborador_id || '',
        status: order.status,
        adiantamento: order.adiantamento || '',
        pago_totalidade: order.pago_totalidade || false
      });
      setArtigos(order.artigos || [{ codigo: '', designacao: '', quantidade: 1, preco_unitario: 0, preco_total: 0, separado: false }]);
    } else {
      resetForm();
    }
  }, [order, open]);

  const resetForm = () => {
    setFormData({
      nome_cliente: '',
      contacto: '',
      tem_entrega: false,
      morada_entrega: '',
      distancia_kms: '',
      num_colaboradores: 1,
      observacoes: '',
      data_entrega_prevista: '',
      colaborador_id: '',
      adiantamento: '',
      pago_totalidade: false
    });
    setArtigos([{ codigo: '', designacao: '', quantidade: 1, preco_unitario: 0, preco_total: 0, separado: false }]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked) => {
    setFormData(prev => ({ ...prev, tem_entrega: checked }));
  };

  const handlePagoTotalidadeChange = (checked) => {
    setFormData(prev => ({ ...prev, pago_totalidade: checked }));
  };

  const handleArtigoChange = (index, field, value) => {
    const newArtigos = [...artigos];
    newArtigos[index][field] = value;

    if (field === 'quantidade' || field === 'preco_unitario') {
      const quantidade = parseFloat(newArtigos[index].quantidade) || 0;
      const preco_unitario = parseFloat(newArtigos[index].preco_unitario) || 0;
      newArtigos[index].preco_total = quantidade * preco_unitario;
    }

    setArtigos(newArtigos);
  };

  const addArtigo = () => {
    setArtigos([...artigos, { codigo: '', designacao: '', quantidade: 1, preco_unitario: 0, preco_total: 0, separado: false }]);
  };

  const removeArtigo = (index) => {
    if (artigos.length > 1) {
      setArtigos(artigos.filter((_, i) => i !== index));
    }
  };

  const handleTudoSeparado = () => {
    const newArtigos = artigos.map(art => ({ ...art, separado: true }));
    setArtigos(newArtigos);
    toast.success('Todos os artigos marcados como separados');
  };

  const calculateTotals = () => {
    const subtotal_artigos = artigos.reduce((sum, art) => sum + (parseFloat(art.preco_total) || 0), 0);
    
    let custo_entrega = 0;
    if (formData.tem_entrega) {
      const distancia = parseFloat(formData.distancia_kms) || 0;
      const colaboradoresEntrega = parseInt(formData.num_colaboradores) || 1;
      
      if (distancia < 10) {
        custo_entrega = 10;
      } else {
        custo_entrega = 10 + ((distancia - 10) * 2);
      }
      
      if (colaboradoresEntrega > 1) {
        custo_entrega += (colaboradoresEntrega - 1) * 15;
      }
    }

    const total_final = subtotal_artigos + custo_entrega;
    const adiantamento = parseFloat(formData.adiantamento) || 0;
    const falta_pagar = total_final - adiantamento;
    const pago_total = adiantamento >= total_final && total_final > 0;

    return { subtotal_artigos, custo_entrega, total_final, adiantamento, falta_pagar, pago_total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isEditing) {
        const updateData = {
          status: formData.status,
          observacoes: formData.observacoes || null,
          data_entrega_prevista: formData.data_entrega_prevista || null,
          pago_totalidade: formData.pago_totalidade,
          artigos: artigos.map(art => ({
            codigo: art.codigo,
            designacao: art.designacao,
            quantidade: parseInt(art.quantidade),
            preco_unitario: parseFloat(art.preco_unitario),
            preco_total: parseFloat(art.preco_total),
            separado: art.separado || false
          }))
        };
        
        const response = await axios.put(`${API}/orders/${order.id}`, updateData);
        toast.success(`${tipoLabel} atualizado com sucesso!`);
        onSave(response.data);
      } else {
        // Validações - Orçamento tem menos campos obrigatórios
        if (!formData.nome_cliente || !formData.colaborador_id) {
          toast.error('Por favor, preencha nome do cliente e selecione um colaborador');
          setSubmitting(false);
          return;
        }

        // Contacto obrigatório apenas para encomendas
        if (orderType !== 'orcamento' && !formData.contacto) {
          toast.error('Por favor, preencha o contacto do cliente');
          setSubmitting(false);
          return;
        }

        // Artigos obrigatórios apenas para encomendas
        if (orderType !== 'orcamento') {
          if (artigos.some(art => !art.codigo || !art.designacao)) {
            toast.error('Por favor, preencha todos os artigos');
            setSubmitting(false);
            return;
          }

          if (artigos.some(art => parseFloat(art.preco_unitario) < 0.01)) {
            toast.error('O preço unitário deve ser pelo menos €0.01');
            setSubmitting(false);
            return;
          }
        } else {
          // Para orçamentos, preço pode ser 0
          if (artigos.some(art => parseFloat(art.preco_unitario) < 0)) {
            toast.error('O preço unitário não pode ser negativo');
            setSubmitting(false);
            return;
          }
        }

        if (formData.tem_entrega && (!formData.morada_entrega || !formData.distancia_kms)) {
          toast.error('Por favor, preencha os dados de entrega');
          setSubmitting(false);
          return;
        }

        const { subtotal_artigos, custo_entrega, total_final, pago_total } = calculateTotals();
        const adiantamentoValue = parseFloat(formData.adiantamento) || 0;

        // Validação: Adiantamento obrigatório
        if (adiantamentoValue < 0) {
          toast.error('O adiantamento não pode ser negativo.');
          setSubmitting(false);
          return;
        }

        // Validação: Adiantamento não pode ser maior que o total
        if (adiantamentoValue > total_final) {
          toast.error(`O adiantamento (€${adiantamentoValue.toFixed(2)}) não pode ser superior ao total (€${total_final.toFixed(2)})`);
          setSubmitting(false);
          return;
        }

        const orderData = {
          nome_cliente: formData.nome_cliente,
          contacto: formData.contacto,
          tem_entrega: formData.tem_entrega,
          morada_entrega: formData.tem_entrega ? formData.morada_entrega : null,
          distancia_kms: formData.tem_entrega ? parseFloat(formData.distancia_kms) : null,
          num_colaboradores: formData.tem_entrega ? parseInt(formData.num_colaboradores) : null,
          artigos: artigos.map(art => ({
            codigo: art.codigo,
            designacao: art.designacao,
            quantidade: parseInt(art.quantidade),
            preco_unitario: parseFloat(art.preco_unitario),
            preco_total: parseFloat(art.preco_total),
            separado: art.separado || false
          })),
          subtotal_artigos,
          custo_entrega,
          total_final,
          observacoes: formData.observacoes || null,
          data_entrega_prevista: formData.data_entrega_prevista || null,
          colaborador_id: formData.colaborador_id,
          tipo: orderType,
          adiantamento: adiantamentoValue,
          pago_totalidade: pago_total
        };

        const response = await axios.post(`${API}/orders`, orderData);
        toast.success(`${tipoLabel} criada com sucesso!`);
        onSave(response.data);
      }
    } catch (error) {
      toast.error(`Erro ao guardar ${tipoLabelFeminino}: ` + (error.response?.data?.detail || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const { subtotal_artigos, custo_entrega, total_final, adiantamento, falta_pagar, pago_total } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEditing ? `Editar ${tipoLabel}` : (orderType === 'orcamento' ? 'Novo Orçamento' : 'Nova Encomenda')}
          </DialogTitle>
          {!isEditing && nextNumber && (
            <div className={`mt-2 p-3 rounded-lg border-2 ${orderType === 'orcamento' ? 'bg-blue-50 border-blue-300' : 'bg-green-50 border-green-300'}`}>
              <div className="flex items-center gap-2">
                <Hash className={`w-5 h-5 ${orderType === 'orcamento' ? 'text-blue-600' : 'text-green-600'}`} />
                <span className={`text-2xl font-bold ${orderType === 'orcamento' ? 'text-blue-700' : 'text-green-700'}`}>
                  {nextNumber}
                </span>
              </div>
            </div>
          )}
          <DialogDescription>
            {isEditing ? `Atualize os dados d${tipoLabelFeminino}` : `Preencha os dados da nova ${orderType === 'orcamento' ? 'orçamento' : 'encomenda'}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {isEditing && (
            <>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  <strong>Nota:</strong> Em modo de edição, apenas pode alterar o <strong>estado</strong>, <strong>observações</strong>, <strong>data de entrega prevista</strong>, <strong>pago na totalidade</strong> e marcar artigos como <strong>separados</strong>.
                </p>
              </div>
              
              {order.historico && order.historico.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-2 text-blue-900">Histórico de Alterações</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {order.historico.map((alt, idx) => {
                      const nomeCampo = {
                        'status': 'Estado',
                        'observacoes': 'Observações',
                        'data_entrega_prevista': 'Data de Entrega Prevista',
                        'data_levantada': 'Data de Levantamento',
                        'pago_totalidade': 'Pago na Totalidade',
                        'artigos': 'Artigos',
                        'artigos_separados': 'Artigos Separados'
                      }[alt.campo_alterado] || alt.campo_alterado;
                      
                      // Formatar valores para campos especiais
                      let valorAnterior = alt.valor_anterior || '(vazio)';
                      let valorNovo = alt.valor_novo;
                      
                      // Tentar fazer parse se for string JSON
                      const formatarValor = (valor) => {
                        if (!valor || valor === '(vazio)') return valor;
                        try {
                          const parsed = JSON.parse(valor.replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false'));
                          if (Array.isArray(parsed)) {
                            return parsed.map(a => `${a.designacao || a.codigo} (x${a.quantidade})`).join(', ');
                          }
                          return valor;
                        } catch (e) {
                          // Verificar se é True/False simples
                          if (valor === 'True' || valor === 'true') return 'Sim';
                          if (valor === 'False' || valor === 'false') return 'Não';
                          return valor;
                        }
                      };
                      
                      if (alt.campo_alterado === 'artigos_separados') {
                        valorAnterior = '';
                        valorNovo = `✓ ${alt.valor_novo}`;
                      } else if (alt.campo_alterado === 'artigos' || alt.campo_alterado === 'pago_totalidade') {
                        valorAnterior = formatarValor(alt.valor_anterior);
                        valorNovo = formatarValor(alt.valor_novo);
                      }
                      
                      return (
                        <div key={idx} className={`text-xs bg-white p-2 rounded border ${alt.campo_alterado === 'artigos_separados' ? 'border-green-200 bg-green-50' : 'border-blue-100'}`}>
                          <div className="font-medium text-blue-900">{new Date(alt.data_hora).toLocaleString('pt-PT')}</div>
                          <div className="text-gray-700 mt-1">
                            <span className={`font-semibold ${alt.campo_alterado === 'artigos_separados' ? 'text-green-700' : 'text-blue-800'}`}>{nomeCampo}:</span>
                            <div className="mt-0.5">
                              {valorAnterior && valorAnterior !== '(vazio)' && alt.campo_alterado !== 'artigos_separados' && (
                                <>
                                  <span className="text-red-600">Antes: {valorAnterior}</span>
                                  <span className="mx-2">→</span>
                                </>
                              )}
                              <span className={`font-medium ${alt.campo_alterado === 'artigos_separados' ? 'text-green-700' : 'text-green-700'}`}>
                                {alt.campo_alterado === 'artigos_separados' ? valorNovo : `Agora: ${valorNovo}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Dados do Cliente */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Dados do Cliente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome_cliente">Nome Completo {orderType !== 'orcamento' || isEditing ? '*' : ''}</Label>
                <Input
                  id="nome_cliente"
                  name="nome_cliente"
                  data-testid="input-nome-cliente"
                  value={formData.nome_cliente}
                  onChange={handleInputChange}
                  className="mt-1 border-gray-300 focus:border-orange-500"
                  disabled={isEditing}
                  required={!isEditing && orderType !== 'orcamento'}
                />
              </div>
              <div>
                <Label htmlFor="contacto">Contacto {orderType !== 'orcamento' ? '*' : ''}</Label>
                <Input
                  id="contacto"
                  name="contacto"
                  data-testid="input-contacto"
                  value={formData.contacto}
                  onChange={handleInputChange}
                  className="mt-1 border-gray-300 focus:border-orange-500"
                  disabled={isEditing}
                  required={!isEditing && orderType !== 'orcamento'}
                />
              </div>
            </div>
          </div>

          {/* Colaborador - Dropdown */}
          {!isEditing && (
            <div>
              <Label htmlFor="colaborador_id">Colaborador *</Label>
              {colaboradores.length === 0 ? (
                <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Nenhum colaborador cadastrado. Por favor, adicione colaboradores primeiro em "Gerir Colaboradores".
                  </p>
                </div>
              ) : (
                <Select 
                  value={formData.colaborador_id} 
                  onValueChange={(value) => setFormData(prev => ({...prev, colaborador_id: value}))}
                >
                  <SelectTrigger className="mt-1 border-gray-300" data-testid="select-colaborador">
                    <SelectValue placeholder="Selecione um colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((colab) => (
                      <SelectItem key={colab.id} value={colab.id}>{colab.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Colaborador em modo edição */}
          {isEditing && order.nome_colaborador && (
            <div>
              <Label>Colaborador</Label>
              <Input value={order.nome_colaborador} className="mt-1 border-gray-300 bg-gray-50" disabled />
            </div>
          )}

          {/* Estado - apenas em edição */}
          {isEditing && (
            <div>
              <Label htmlFor="status">Estado *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({...prev, status: value}))}>
                <SelectTrigger className="mt-1 border-gray-300" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Em Preparação">Em Preparação</SelectItem>
                  <SelectItem value="Pronta para Levantamento">Pronto para Levantamento</SelectItem>
                  <SelectItem value="Entregue">Entregue</SelectItem>
                  <SelectItem value="Levantada">Levantada</SelectItem>
                  <SelectItem value="Cancelada">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Pago na Totalidade - apenas em edição e se total > 0 */}
          {isEditing && calculateTotals().total_final > 0 && (
            <div className={`p-4 rounded-lg border ${formData.pago_totalidade ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="pago_totalidade" className={`text-base font-semibold cursor-pointer ${formData.pago_totalidade ? 'text-green-800' : 'text-gray-700'}`}>
                    Pago na Totalidade
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">Marcar se o cliente já pagou o valor total</p>
                </div>
                <Switch
                  id="pago_totalidade"
                  checked={formData.pago_totalidade}
                  onCheckedChange={handlePagoTotalidadeChange}
                />
              </div>
              {formData.pago_totalidade && (
                <div className="mt-2 flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Valor total pago pelo cliente</span>
                </div>
              )}
            </div>
          )}

          {/* Data de entrega prevista - apenas em edição se tem entrega */}
          {isEditing && order.tem_entrega && (
            <div>
              <Label htmlFor="data_entrega_prevista">Data de Entrega Prevista</Label>
              <Input
                type="date"
                id="data_entrega_prevista"
                name="data_entrega_prevista"
                value={formData.data_entrega_prevista}
                onChange={handleInputChange}
                className="mt-1 border-gray-300 focus:border-orange-500"
              />
            </div>
          )}

          {/* Opção de Entrega */}
          {!isEditing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="tem_entrega" className="text-base font-semibold cursor-pointer">
                    Necessita de Entrega?
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">10€ até 10km, depois +2€/km adicional</p>
                </div>
                <Switch
                  id="tem_entrega"
                  data-testid="switch-tem-entrega"
                  checked={formData.tem_entrega}
                  onCheckedChange={handleSwitchChange}
                />
              </div>

              {formData.tem_entrega && (
                <div className="space-y-4 pl-4 border-l-2 border-orange-500">
                  <div>
                    <Label htmlFor="morada_entrega">Morada de Entrega *</Label>
                    <Input
                      id="morada_entrega"
                      name="morada_entrega"
                      value={formData.morada_entrega}
                      onChange={handleInputChange}
                      className="mt-1 border-gray-300 focus:border-orange-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="distancia_kms">Distância (KMs) *</Label>
                      <Input
                        id="distancia_kms"
                        name="distancia_kms"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.distancia_kms}
                        onChange={handleInputChange}
                        className="mt-1 border-gray-300 focus:border-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="num_colaboradores">Nº Colaboradores Entrega *</Label>
                      <Input
                        id="num_colaboradores"
                        name="num_colaboradores"
                        type="number"
                        min="1"
                        value={formData.num_colaboradores}
                        onChange={handleInputChange}
                        className="mt-1 border-gray-300 focus:border-orange-500"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="data_entrega_prevista">Data de Entrega Prevista</Label>
                    <Input
                      type="date"
                      id="data_entrega_prevista"
                      name="data_entrega_prevista"
                      value={formData.data_entrega_prevista}
                      onChange={handleInputChange}
                      className="mt-1 border-gray-300 focus:border-orange-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Artigos - criação */}
          {!isEditing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Artigos</h3>
                <Button
                  type="button"
                  onClick={addArtigo}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </Button>
              </div>
              {artigos.map((artigo, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-700">Artigo #{index + 1}</span>
                    {artigos.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeArtigo(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Código {orderType !== 'orcamento' ? '*' : ''}</Label>
                      <Input
                        value={artigo.codigo}
                        onChange={(e) => handleArtigoChange(index, 'codigo', e.target.value)}
                        className="mt-1 border-gray-300"
                        required={orderType !== 'orcamento'}
                      />
                    </div>
                    <div>
                      <Label>Designação {orderType !== 'orcamento' ? '*' : ''}</Label>
                      <Input
                        value={artigo.designacao}
                        onChange={(e) => handleArtigoChange(index, 'designacao', e.target.value)}
                        className="mt-1 border-gray-300"
                        required={orderType !== 'orcamento'}
                      />
                    </div>
                    <div>
                      <Label>Quantidade {orderType !== 'orcamento' ? '*' : ''}</Label>
                      <Input
                        type="number"
                        min="1"
                        value={artigo.quantidade}
                        onChange={(e) => handleArtigoChange(index, 'quantidade', e.target.value)}
                        className="mt-1 border-gray-300"
                        required={orderType !== 'orcamento'}
                      />
                    </div>
                    <div>
                      <Label>Preço Unitário (€) {orderType !== 'orcamento' ? '*' : ''}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={orderType === 'orcamento' ? "0" : "0.01"}
                        value={artigo.preco_unitario}
                        onChange={(e) => handleArtigoChange(index, 'preco_unitario', e.target.value)}
                        className="mt-1 border-gray-300"
                        required={orderType !== 'orcamento'}
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-300">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Preço Total:</span>
                      <span className="text-lg font-bold text-orange-600">€{artigo.preco_total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Artigos em edição */}
          {isEditing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Artigos</h3>
                <Button
                  type="button"
                  onClick={handleTudoSeparado}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50"
                >
                  <CheckSquare className="w-4 h-4" />
                  Tudo Separado
                </Button>
              </div>
              {artigos.map((artigo, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{artigo.codigo} - {artigo.designacao}</p>
                      <p className="text-sm text-gray-600">Qtd: {artigo.quantidade} × €{artigo.preco_unitario.toFixed(2)} = €{artigo.preco_total.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`separado-${index}`}
                        checked={artigo.separado || false}
                        onChange={(e) => handleArtigoChange(index, 'separado', e.target.checked)}
                        className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <Label htmlFor={`separado-${index}`} className="text-sm cursor-pointer font-medium">
                        Separado
                      </Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Adiantamento - em criação */}
          {!isEditing && (
            <div className={`p-4 rounded-lg border ${adiantamento > total_final ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-200'}`}>
              <Label htmlFor="adiantamento" className={`text-base font-semibold ${adiantamento > total_final ? 'text-red-800' : 'text-green-800'}`}>
                Adiantamento (€) {orderType !== 'orcamento' ? '*' : ''}
              </Label>
              <p className="text-sm text-green-700 mb-2">Valor pago pelo cliente (0€ se nenhum adiantamento)</p>
              <Input
                id="adiantamento"
                name="adiantamento"
                type="number"
                step="0.01"
                min="0"
                max={total_final}
                value={formData.adiantamento}
                onChange={handleInputChange}
                placeholder="0.00"
                required={orderType !== 'orcamento'}
                className={`mt-1 ${adiantamento > total_final ? 'border-red-500 focus:border-red-500' : 'border-green-300 focus:border-green-500'}`}
              />
              {adiantamento > total_final && (
                <p className="text-sm text-red-600 font-semibold mt-2">
                  ⚠️ O adiantamento não pode ser superior ao total (€{total_final.toFixed(2)})
                </p>
              )}
            </div>
          )}

          {/* Observações */}
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              value={formData.observacoes}
              onChange={handleInputChange}
              placeholder={`Adicione notas ou observações...`}
              className="mt-1 border-gray-300 focus:border-orange-500"
              rows={3}
            />
          </div>

          {/* Resumo de Custos */}
          {!isEditing && (
            <div className="p-4 bg-orange-50 rounded-lg space-y-2">
              <h3 className="font-semibold text-lg mb-2">Resumo de Custos</h3>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Subtotal Artigos:</span>
                <span className="font-semibold">€{subtotal_artigos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Custo de Entrega:</span>
                <span className="font-semibold">€{custo_entrega.toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-orange-300 pt-2 mt-2">
                <div className="flex justify-between items-center text-xl">
                  <span className="font-bold text-gray-900">Total Final:</span>
                  <span className="font-bold text-orange-600">€{total_final.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Adiantamento e estado de pagamento */}
              <div className="border-t border-green-300 pt-2 mt-2 bg-green-100 -mx-4 px-4 py-2 rounded-b-lg">
                <div className="flex justify-between items-center">
                  <span className="text-green-800">Adiantamento:</span>
                  <span className="font-semibold text-green-700">€{adiantamento.toFixed(2)}</span>
                </div>
                {pago_total ? (
                  <div className="flex justify-between items-center text-lg mt-1 bg-green-200 -mx-4 px-4 py-2 rounded-b-lg">
                    <span className="font-bold text-green-800 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Pago na Totalidade
                    </span>
                    <span className="font-bold text-green-700">✓</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-lg mt-1 bg-red-100 -mx-4 px-4 py-2 rounded-b-lg">
                    <span className="font-bold text-red-700">Falta Pagar:</span>
                    <span className="font-bold text-red-600">€{falta_pagar.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" onClick={onClose} variant="outline" className="border-gray-300">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || (!isEditing && colaboradores.length === 0)}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              {submitting ? 'A guardar...' : isEditing ? `Atualizar ${tipoLabel}` : `Criar ${tipoLabel}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OrderFormModal;
