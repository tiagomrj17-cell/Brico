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
import { Plus, CheckSquare, CheckCircle, Hash, ChevronRight, ChevronLeft, User, Truck, Package, FileText, Trash2, Check } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OrderFormModal = ({ open, onClose, onSave, order, orderType = 'encomenda', colaboradores = [], fullEdit = false }) => {
  const isEditing = !!order;
  const tipoLabel = orderType === 'orcamento' ? 'Orçamento' : 'Encomenda';
  const tipoLabelFeminino = orderType === 'orcamento' ? 'o orçamento' : 'a encomenda';
  
  const [nextNumber, setNextNumber] = useState(null);
  const [fullEditMode, setFullEditMode] = useState(fullEdit);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
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
    pago_totalidade: false
  });

  const [artigos, setArtigos] = useState([
    { codigo: '', designacao: '', quantidade: 1, preco_unitario: 0, preco_total: 0, separado: false, status: 'Pendente' }
  ]);

  const [submitting, setSubmitting] = useState(false);

  // Reset step quando modal fecha
  useEffect(() => {
    if (!open) {
      setFullEditMode(fullEdit);
      setCurrentStep(1);
    }
  }, [open, fullEdit]);

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
      pago_totalidade: false
    });
    setArtigos([{ codigo: '', designacao: '', quantidade: 1, preco_unitario: 0, preco_total: 0, separado: false, status: 'Pendente' }]);
    setCurrentStep(1);
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
    setArtigos([...artigos, { codigo: '', designacao: '', quantidade: 1, preco_unitario: 0, preco_total: 0, separado: false, status: 'Pendente' }]);
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

  const handleTudoEntregue = () => {
    const newArtigos = artigos.map(art => ({ ...art, status: 'Entregue' }));
    setArtigos(newArtigos);
    toast.success('Todos os artigos marcados como entregues');
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

    return { subtotal_artigos, custo_entrega, total_final };
  };

  // Validação por fase
  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.nome_cliente) {
        toast.error('Por favor, preencha o nome do cliente');
        return false;
      }
      if (orderType !== 'orcamento' && !formData.contacto) {
        toast.error('Por favor, preencha o contacto do cliente');
        return false;
      }
      if (!formData.colaborador_id) {
        toast.error('Por favor, selecione um colaborador');
        return false;
      }
      if (formData.tem_entrega) {
        if (!formData.morada_entrega) {
          toast.error('Por favor, preencha a morada de entrega');
          return false;
        }
        if (!formData.distancia_kms) {
          toast.error('Por favor, preencha a distância em km');
          return false;
        }
      }
      return true;
    }
    if (step === 2) {
      if (orderType !== 'orcamento') {
        if (artigos.some(art => !art.codigo || !art.designacao)) {
          toast.error('Por favor, preencha todos os artigos (código e designação)');
          return false;
        }
        if (artigos.some(art => parseFloat(art.preco_unitario) < 0.01)) {
          toast.error('O preço unitário deve ser pelo menos €0.01');
          return false;
        }
      }
      return true;
    }
    return true;
  };

  const nextStep = (e) => {
    // Prevenir qualquer propagação de eventos que possa causar submit
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Só permite submissão na fase 3 (última fase)
    if (currentStep < totalSteps) {
      // Se estiver numa fase anterior, apenas avança para a próxima
      nextStep();
      return;
    }
    
    if (!validateStep(currentStep)) return;
    
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
            separado: art.separado || false,
            status: art.status || 'Pendente'
          }))
        };
        
        const response = await axios.put(`${API}/orders/${order.id}`, updateData);
        toast.success(`${tipoLabel} atualizado com sucesso!`);
        onSave(response.data, true);
      } else {
        const { subtotal_artigos, custo_entrega, total_final } = calculateTotals();

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
            separado: art.separado || false,
            status: art.status || 'Pendente'
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
        onSave(response.data, false);
      }
    } catch (error) {
      toast.error(`Erro ao guardar ${tipoLabelFeminino}: ` + (error.response?.data?.detail || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const { subtotal_artigos, custo_entrega, total_final, adiantamento, falta_pagar, pago_total } = calculateTotals();

  // Componentes de cada fase
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3].map((step, index) => (
        <React.Fragment key={step}>
          <div 
            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
              currentStep === step 
                ? 'bg-orange-500 border-orange-500 text-white' 
                : currentStep > step 
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-gray-100 border-gray-300 text-gray-500'
            }`}
          >
            {currentStep > step ? (
              <CheckCircle className="w-5 h-5" />
            ) : step === 1 ? (
              <User className="w-5 h-5" />
            ) : step === 2 ? (
              <Package className="w-5 h-5" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
          </div>
          {index < 2 && (
            <div className={`w-16 h-1 mx-2 rounded ${currentStep > step ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStepTitle = () => {
    const titles = {
      1: 'Dados do Cliente e Entrega',
      2: 'Artigos',
      3: 'Observações e Finalização'
    };
    return (
      <h3 className="text-lg font-semibold text-gray-800 text-center mb-4">
        Fase {currentStep}: {titles[currentStep]}
      </h3>
    );
  };

  // Fase 1: Dados do Cliente, Colaborador e Entrega
  const renderStep1 = () => (
    <div className="space-y-5">
      {/* Dados do Cliente */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-700">
          <User className="w-5 h-5" />
          <span className="font-medium">Dados do Cliente</span>
        </div>
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
              placeholder="Nome do cliente"
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
              placeholder="Telefone ou email"
            />
          </div>
        </div>
      </div>

      {/* Colaborador */}
      <div>
        <Label htmlFor="colaborador_id">Colaborador *</Label>
        {colaboradores.length === 0 ? (
          <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Nenhum colaborador cadastrado. Adicione colaboradores em "Gerir Colaboradores".
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

      {/* Entrega */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-3">
            <Truck className={`w-6 h-6 ${formData.tem_entrega ? 'text-orange-500' : 'text-gray-400'}`} />
            <div>
              <Label htmlFor="tem_entrega" className="text-base font-semibold cursor-pointer">
                Necessita de Entrega?
              </Label>
              <p className="text-sm text-gray-500">10€ até 10km, depois +2€/km</p>
            </div>
          </div>
          <Switch
            id="tem_entrega"
            data-testid="switch-tem-entrega"
            checked={formData.tem_entrega}
            onCheckedChange={handleSwitchChange}
          />
        </div>

        {formData.tem_entrega && (
          <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div>
              <Label htmlFor="morada_entrega">Morada de Entrega *</Label>
              <Input
                id="morada_entrega"
                name="morada_entrega"
                value={formData.morada_entrega}
                onChange={handleInputChange}
                className="mt-1 border-gray-300 focus:border-orange-500"
                placeholder="Rua, número, cidade"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="distancia_kms">Distância (KM) *</Label>
                <Input
                  id="distancia_kms"
                  name="distancia_kms"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.distancia_kms}
                  onChange={handleInputChange}
                  className="mt-1 border-gray-300 focus:border-orange-500"
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="num_colaboradores">Nº Colaboradores *</Label>
                <Input
                  id="num_colaboradores"
                  name="num_colaboradores"
                  type="number"
                  min="1"
                  value={formData.num_colaboradores}
                  onChange={handleInputChange}
                  className="mt-1 border-gray-300 focus:border-orange-500"
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
            
            {/* Preço da entrega calculado */}
            <div className="p-3 bg-white rounded border border-orange-300">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Custo de Entrega:</span>
                <span className="text-xl font-bold text-orange-600">€{custo_entrega.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Fase 2: Artigos
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700">
          <Package className="w-5 h-5" />
          <span className="font-medium">Lista de Artigos</span>
        </div>
        <Button
          type="button"
          onClick={addArtigo}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
        >
          <Plus className="w-4 h-4" />
          Adicionar Artigo
        </Button>
      </div>

      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
        {artigos.map((artigo, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">Artigo #{index + 1}</span>
              {artigos.length > 1 && (
                <Button
                  type="button"
                  onClick={() => removeArtigo(index)}
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
                  placeholder="REF001"
                />
              </div>
              <div>
                <Label>Designação {orderType !== 'orcamento' ? '*' : ''}</Label>
                <Input
                  value={artigo.designacao}
                  onChange={(e) => handleArtigoChange(index, 'designacao', e.target.value)}
                  className="mt-1 border-gray-300"
                  placeholder="Nome do artigo"
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
                />
              </div>
              <div>
                <Label>Preço Unit. (€) {orderType !== 'orcamento' ? '*' : ''}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={orderType === 'orcamento' ? "0" : "0.01"}
                  value={artigo.preco_unitario}
                  onChange={(e) => handleArtigoChange(index, 'preco_unitario', e.target.value)}
                  className="mt-1 border-gray-300"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="text-lg font-bold text-orange-600">€{artigo.preco_total.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Resumo parcial */}
      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700">Subtotal Artigos:</span>
          <span className="text-xl font-bold text-orange-600">€{subtotal_artigos.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );

  // Fase 3: Observações e Finalização
  const renderStep3 = () => (
    <div className="space-y-5">
      {/* Pago na Totalidade - Toggle */}
      <div className={`p-4 rounded-lg border ${formData.pago_totalidade ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <Label className={`text-base font-semibold ${formData.pago_totalidade ? 'text-green-800' : 'text-gray-700'}`}>
              Estado do Pagamento
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              {formData.pago_totalidade ? 'Cliente pagou o valor total' : 'Pagamento pendente'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, pago_totalidade: !prev.pago_totalidade }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              formData.pago_totalidade 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {formData.pago_totalidade ? (
              <><CheckCircle className="w-5 h-5" /> Pago</>
            ) : (
              <>Não Pago</>
            )}
          </button>
        </div>
      </div>

      {/* Observações */}
      <div>
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          name="observacoes"
          value={formData.observacoes}
          onChange={handleInputChange}
          placeholder="Adicione notas ou observações..."
          className="mt-1 border-gray-300 focus:border-orange-500"
          rows={3}
        />
      </div>

      {/* Resumo Final */}
      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 space-y-2">
        <h3 className="font-semibold text-lg mb-3 text-gray-800">Resumo Final</h3>
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
        
        {formData.pago_totalidade ? (
          <div className="flex justify-between items-center text-lg mt-2 p-2 bg-green-200 rounded">
            <span className="font-bold text-green-800 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Pago na Totalidade
            </span>
            <span className="font-bold text-green-700"><Check className="w-5 h-5" /></span>
          </div>
        ) : (
          <div className="flex justify-between items-center text-lg mt-2 p-2 bg-red-100 rounded">
            <span className="font-bold text-red-700">Por Pagar:</span>
            <span className="font-bold text-red-600">€{total_final.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render do modo edição (sem fases)
  const renderEditMode = () => (
    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <p className="text-sm text-orange-800">
          <strong>Nota:</strong> Pode alterar o <strong>estado</strong>, <strong>observações</strong>, <strong>data de entrega prevista</strong>, <strong>pago na totalidade</strong> e marcar artigos como <strong>separados</strong>, <strong>entregues</strong> ou <strong>cancelados</strong>.
        </p>
      </div>

      {/* Estado */}
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

      {/* Pago na Totalidade */}
      {calculateTotals().total_final > 0 && (
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
        </div>
      )}

      {/* Data de entrega prevista */}
      {order.tem_entrega && (
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

      {/* Artigos em edição */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Artigos</h3>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleTudoEntregue}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <CheckCircle className="w-4 h-4" />
              Tudo Entregue
            </Button>
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
        </div>
        {artigos.map((artigo, index) => (
          <div key={index} className={`p-3 rounded-lg border ${
            artigo.status === 'Entregue' ? 'bg-green-50 border-green-300' :
            artigo.status === 'Cancelado' ? 'bg-red-50 border-red-300' :
            'bg-yellow-50 border-yellow-300'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium">{artigo.codigo} - {artigo.designacao}</p>
                <p className="text-sm text-gray-600">Qtd: {artigo.quantidade} × €{artigo.preco_unitario.toFixed(2)} = €{artigo.preco_total.toFixed(2)}</p>
              </div>
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                <div className="flex flex-col">
                  <Label className="text-xs text-gray-500 mb-1">Estado</Label>
                  <Select 
                    value={artigo.status || 'Pendente'} 
                    onValueChange={(value) => handleArtigoChange(index, 'status', value)}
                  >
                    <SelectTrigger className={`w-[130px] h-8 text-sm ${
                      artigo.status === 'Entregue' ? 'border-green-500 bg-green-100' :
                      artigo.status === 'Cancelado' ? 'border-red-500 bg-red-100' :
                      'border-yellow-500 bg-yellow-100'
                    }`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Entregue">Entregue</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
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
          </div>
        ))}
      </div>

      {/* Observações */}
      <div>
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          name="observacoes"
          value={formData.observacoes}
          onChange={handleInputChange}
          placeholder="Adicione notas ou observações..."
          className="mt-1 border-gray-300 focus:border-orange-500"
          rows={3}
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" onClick={onClose} variant="outline" className="border-gray-300">
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
        >
          {submitting ? 'A guardar...' : `Atualizar ${tipoLabel}`}
        </Button>
      </div>
    </form>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            {isEditing ? `Atualize os dados d${tipoLabelFeminino}` : `Preencha os dados em ${totalSteps} fases`}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          renderEditMode()
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {renderStepIndicator()}
            {renderStepTitle()}
            
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <Button
                type="button"
                onClick={prevStep}
                variant="outline"
                className={`flex items-center gap-2 ${currentStep === 1 ? 'invisible' : ''}`}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>
              
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={colaboradores.length === 0 && currentStep === 1}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Seguinte
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={submitting || adiantamento > total_final}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  {submitting ? 'A criar...' : `Criar ${tipoLabel}`}
                </Button>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrderFormModal;
