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
import { Trash2, Plus, CheckSquare } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OrderFormModal = ({ open, onClose, onSave, order, orderType = 'encomenda', colaboradores = [] }) => {
  const isEditing = !!order;
  const tipoLabel = orderType === 'orcamento' ? 'Orçamento' : 'Encomenda';
  
  const [formData, setFormData] = useState({
    nome_cliente: '',
    contacto: '',
    tem_entrega: false,
    morada_entrega: '',
    distancia_kms: '',
    num_colaboradores: 1,
    observacoes: '',
    data_entrega_prevista: '',
    colaborador_id: ''
  });

  const [artigos, setArtigos] = useState([
    { codigo: '', designacao: '', quantidade: 1, preco_unitario: 0, preco_total: 0, separado: false }
  ]);

  const [submitting, setSubmitting] = useState(false);

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
        status: order.status
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
      colaborador_id: ''
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

  // Marcar todos os artigos como separados
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
      
      // Nova fórmula: 10€ se distância < 10km
      // Se >= 10km: 10€ + 2€ por cada km acima de 10km
      if (distancia < 10) {
        custo_entrega = 10;
      } else {
        custo_entrega = 10 + ((distancia - 10) * 2);
      }
      
      // Adicionar custo de colaboradores adicionais
      if (colaboradoresEntrega > 1) {
        custo_entrega += (colaboradoresEntrega - 1) * 15;
      }
    }

    const total_final = subtotal_artigos + custo_entrega;

    return { subtotal_artigos, custo_entrega, total_final };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitting(true);

    try {
      if (isEditing) {
        // Para edição, apenas enviar campos que podem ser editados
        const updateData = {
          status: formData.status,
          observacoes: formData.observacoes || null,
          data_entrega_prevista: formData.data_entrega_prevista || null,
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
        // Para criar nova encomenda/orçamento
        if (!formData.nome_cliente || !formData.contacto || !formData.colaborador_id) {
          toast.error('Por favor, preencha nome do cliente, contacto e selecione um colaborador');
          setSubmitting(false);
          return;
        }

        if (artigos.some(art => !art.codigo || !art.designacao)) {
          toast.error('Por favor, preencha todos os artigos');
          setSubmitting(false);
          return;
        }

        if (formData.tem_entrega && (!formData.morada_entrega || !formData.distancia_kms)) {
          toast.error('Por favor, preencha os dados de entrega');
          setSubmitting(false);
          return;
        }

        const { subtotal_artigos, custo_entrega, total_final } = calculateTotals();

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
          tipo: orderType
        };

        const response = await axios.post(`${API}/orders`, orderData);
        toast.success(`${tipoLabel} criado com sucesso!`);
        onSave(response.data);
      }
    } catch (error) {
      toast.error(`Erro ao guardar ${tipoLabel.toLowerCase()}: ` + (error.response?.data?.detail || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const { subtotal_artigos, custo_entrega, total_final } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEditing ? `Editar ${tipoLabel}` : (orderType === 'orcamento' ? 'Novo Orçamento' : 'Nova Encomenda')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? `Atualize os dados do ${tipoLabel.toLowerCase()}` : `Preencha os dados do novo ${tipoLabel.toLowerCase()}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {isEditing && (
            <>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  <strong>Nota:</strong> Em modo de edição, apenas pode alterar o <strong>estado</strong>, <strong>observações</strong>, <strong>data de entrega prevista</strong> e marcar artigos como <strong>separados</strong>. 
                  Os dados do cliente e artigos não podem ser modificados.
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
                        'data_levantada': 'Data de Levantamento'
                      }[alt.campo_alterado] || alt.campo_alterado;
                      
                      return (
                        <div key={idx} className="text-xs bg-white p-2 rounded border border-blue-100">
                          <div className="font-medium text-blue-900">{new Date(alt.data_hora).toLocaleString('pt-PT')}</div>
                          <div className="text-gray-700 mt-1">
                            <span className="font-semibold text-blue-800">{nomeCampo}:</span>
                            <div className="mt-0.5">
                              <span className="text-red-600">Antes: {alt.valor_anterior || '(vazio)'}</span>
                              <span className="mx-2">→</span>
                              <span className="text-green-700 font-medium">Agora: {alt.valor_novo}</span>
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
                <Label htmlFor="nome_cliente">Nome Completo *</Label>
                <Input
                  id="nome_cliente"
                  name="nome_cliente"
                  data-testid="input-nome-cliente"
                  value={formData.nome_cliente}
                  onChange={handleInputChange}
                  className="mt-1 border-gray-300 focus:border-orange-500"
                  disabled={isEditing}
                  required={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="contacto">Contacto *</Label>
                <Input
                  id="contacto"
                  name="contacto"
                  data-testid="input-contacto"
                  value={formData.contacto}
                  onChange={handleInputChange}
                  className="mt-1 border-gray-300 focus:border-orange-500"
                  disabled={isEditing}
                  required={!isEditing}
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

          {/* Colaborador em modo edição (apenas visualização) */}
          {isEditing && order.nome_colaborador && (
            <div>
              <Label>Colaborador</Label>
              <Input
                value={order.nome_colaborador}
                className="mt-1 border-gray-300 bg-gray-50"
                disabled
              />
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
                  <SelectItem value="Pronta para Levantamento">Pronta para Levantamento</SelectItem>
                  <SelectItem value="Entregue">Entregue</SelectItem>
                  <SelectItem value="Levantada">Levantada</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
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
                data-testid="input-data-prevista"
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
                    data-testid="input-morada-entrega"
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
                      data-testid="input-distancia-kms"
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
                      data-testid="input-num-colaboradores"
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
                    data-testid="input-data-prevista"
                    value={formData.data_entrega_prevista}
                    onChange={handleInputChange}
                    className="mt-1 border-gray-300 focus:border-orange-500"
                  />
                  {!formData.data_entrega_prevista && (
                    <p className="text-xs text-gray-500 mt-1">
                      Se não tiver data, deixe em branco para combinar com o cliente posteriormente
                    </p>
                  )}
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
                data-testid="btn-adicionar-artigo"
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
                      data-testid={`btn-remover-artigo-${index}`}
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
                    <Label htmlFor={`codigo-${index}`}>Código *</Label>
                    <Input
                      id={`codigo-${index}`}
                      data-testid={`input-codigo-${index}`}
                      value={artigo.codigo}
                      onChange={(e) => handleArtigoChange(index, 'codigo', e.target.value)}
                      className="mt-1 border-gray-300"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`designacao-${index}`}>Designação *</Label>
                    <Input
                      id={`designacao-${index}`}
                      data-testid={`input-designacao-${index}`}
                      value={artigo.designacao}
                      onChange={(e) => handleArtigoChange(index, 'designacao', e.target.value)}
                      className="mt-1 border-gray-300"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`quantidade-${index}`}>Quantidade *</Label>
                    <Input
                      id={`quantidade-${index}`}
                      data-testid={`input-quantidade-${index}`}
                      type="number"
                      min="1"
                      value={artigo.quantidade}
                      onChange={(e) => handleArtigoChange(index, 'quantidade', e.target.value)}
                      className="mt-1 border-gray-300"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`preco_unitario-${index}`}>Preço Unitário (€) *</Label>
                    <Input
                      id={`preco_unitario-${index}`}
                      data-testid={`input-preco-unitario-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={artigo.preco_unitario}
                      onChange={(e) => handleArtigoChange(index, 'preco_unitario', e.target.value)}
                      className="mt-1 border-gray-300"
                      required
                    />
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Preço Total:</span>
                    <span className="text-lg font-bold text-orange-600" data-testid={`preco-total-${index}`}>
                      €{artigo.preco_total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}

          {/* Artigos em edição - marcar como separado */}
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

          {/* Observações */}
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              data-testid="textarea-observacoes"
              value={formData.observacoes}
              onChange={handleInputChange}
              placeholder={`Adicione notas ou observações sobre ${orderType === 'orcamento' ? 'o orçamento' : 'a encomenda'}...`}
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
              <span className="font-semibold" data-testid="subtotal-artigos">€{subtotal_artigos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Custo de Entrega:</span>
              <span className="font-semibold" data-testid="custo-entrega">€{custo_entrega.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-orange-300 pt-2 mt-2">
              <div className="flex justify-between items-center text-xl">
                <span className="font-bold text-gray-900">Total Final:</span>
                <span className="font-bold text-orange-600" data-testid="total-final">€{total_final.toFixed(2)}</span>
              </div>
            </div>
          </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              data-testid="btn-cancelar"
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              data-testid="btn-guardar"
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
