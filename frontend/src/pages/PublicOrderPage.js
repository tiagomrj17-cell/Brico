import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Package } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PublicOrderPage = () => {
  const [formData, setFormData] = useState({
    nome_cliente: '',
    contacto: '',
    tem_entrega: false,
    morada_entrega: '',
    distancia_kms: '',
    num_colaboradores: 1
  });

  const [artigos, setArtigos] = useState([
    { codigo: '', designacao: '', quantidade: 1, preco_unitario: 0, preco_total: 0 }
  ]);

  const [submitting, setSubmitting] = useState(false);

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

    // Auto-calculate preco_total
    if (field === 'quantidade' || field === 'preco_unitario') {
      const quantidade = parseFloat(newArtigos[index].quantidade) || 0;
      const preco_unitario = parseFloat(newArtigos[index].preco_unitario) || 0;
      newArtigos[index].preco_total = quantidade * preco_unitario;
    }

    setArtigos(newArtigos);
  };

  const addArtigo = () => {
    setArtigos([...artigos, { codigo: '', designacao: '', quantidade: 1, preco_unitario: 0, preco_total: 0 }]);
  };

  const removeArtigo = (index) => {
    if (artigos.length > 1) {
      setArtigos(artigos.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal_artigos = artigos.reduce((sum, art) => sum + (parseFloat(art.preco_total) || 0), 0);
    
    let custo_entrega = 0;
    if (formData.tem_entrega) {
      const distancia = parseFloat(formData.distancia_kms) || 0;
      const colaboradores = parseInt(formData.num_colaboradores) || 0;
      custo_entrega = (distancia * 2) + (colaboradores * 15);
    }

    const total_final = subtotal_artigos + custo_entrega;

    return { subtotal_artigos, custo_entrega, total_final };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.nome_cliente || !formData.contacto) {
      toast.error('Por favor, preencha nome e contacto');
      return;
    }

    if (artigos.some(art => !art.codigo || !art.designacao)) {
      toast.error('Por favor, preencha todos os artigos');
      return;
    }

    if (formData.tem_entrega && (!formData.morada_entrega || !formData.distancia_kms)) {
      toast.error('Por favor, preencha os dados de entrega');
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
        preco_total: parseFloat(art.preco_total)
      })),
      subtotal_artigos,
      custo_entrega,
      total_final
    };

    setSubmitting(true);

    try {
      await axios.post(`${API}/orders`, orderData);
      toast.success('Encomenda criada com sucesso!');
      
      // Reset form
      setFormData({
        nome_cliente: '',
        contacto: '',
        tem_entrega: false,
        morada_entrega: '',
        distancia_kms: '',
        num_colaboradores: 1
      });
      setArtigos([{ codigo: '', designacao: '', quantidade: 1, preco_unitario: 0, preco_total: 0 }]);
    } catch (error) {
      toast.error('Erro ao criar encomenda: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const { subtotal_artigos, custo_entrega, total_final } = calculateTotals();

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 fade-in">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
            Nova Encomenda
          </h1>
          <p className="text-lg text-gray-600">Preencha os dados da sua encomenda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 fade-in">
          {/* Dados do Cliente */}
          <Card className="glassmorphism border-0">
            <CardHeader>
              <CardTitle className="text-2xl">Dados do Cliente</CardTitle>
              <CardDescription>Informações de contacto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nome_cliente">Nome Completo *</Label>
                <Input
                  id="nome_cliente"
                  name="nome_cliente"
                  data-testid="input-nome-cliente"
                  value={formData.nome_cliente}
                  onChange={handleInputChange}
                  placeholder="João Silva"
                  className="mt-1"
                  required
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
                  placeholder="+351 912 345 678"
                  className="mt-1"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Opção de Entrega */}
          <Card className="glassmorphism border-0">
            <CardHeader>
              <CardTitle className="text-2xl">Opção de Entrega</CardTitle>
              <CardDescription>Escolha entre entrega ou levantamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
                <div>
                  <Label htmlFor="tem_entrega" className="text-lg font-semibold cursor-pointer">
                    Necessita de Entrega?
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">2€/km + 15€/colaborador</p>
                </div>
                <Switch
                  id="tem_entrega"
                  data-testid="switch-tem-entrega"
                  checked={formData.tem_entrega}
                  onCheckedChange={handleSwitchChange}
                />
              </div>

              {formData.tem_entrega && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div>
                    <Label htmlFor="morada_entrega">Morada de Entrega *</Label>
                    <Input
                      id="morada_entrega"
                      name="morada_entrega"
                      data-testid="input-morada-entrega"
                      value={formData.morada_entrega}
                      onChange={handleInputChange}
                      placeholder="Rua Example, 123, Lisboa"
                      className="mt-1"
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
                        placeholder="10.5"
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="num_colaboradores">Nº Colaboradores *</Label>
                      <Input
                        id="num_colaboradores"
                        name="num_colaboradores"
                        data-testid="input-num-colaboradores"
                        type="number"
                        min="1"
                        value={formData.num_colaboradores}
                        onChange={handleInputChange}
                        className="mt-1"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Artigos */}
          <Card className="glassmorphism border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Package className="w-6 h-6" />
                    Artigos
                  </CardTitle>
                  <CardDescription>Lista de produtos da encomenda</CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={addArtigo}
                  data-testid="btn-adicionar-artigo"
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {artigos.map((artigo, index) => (
                <div key={index} className="p-4 bg-white rounded-lg border-2 border-gray-200 space-y-3">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`codigo-${index}`}>Código *</Label>
                      <Input
                        id={`codigo-${index}`}
                        data-testid={`input-codigo-${index}`}
                        value={artigo.codigo}
                        onChange={(e) => handleArtigoChange(index, 'codigo', e.target.value)}
                        placeholder="ART001"
                        className="mt-1"
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
                        placeholder="Nome do produto"
                        className="mt-1"
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
                        className="mt-1"
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
                        className="mt-1"
                        required
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Preço Total:</span>
                      <span className="text-lg font-bold text-purple-600" data-testid={`preco-total-${index}`}>
                        €{artigo.preco_total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Resumo de Custos */}
          <Card className="glassmorphism border-0 bg-gradient-to-br from-purple-50 to-blue-50">
            <CardHeader>
              <CardTitle className="text-2xl">Resumo de Custos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-700">Subtotal Artigos:</span>
                <span className="font-semibold" data-testid="subtotal-artigos">€{subtotal_artigos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-700">Custo de Entrega:</span>
                <span className="font-semibold" data-testid="custo-entrega">€{custo_entrega.toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-purple-200 pt-3 mt-3">
                <div className="flex justify-between items-center text-2xl">
                  <span className="font-bold text-gray-900">Total Final:</span>
                  <span className="font-bold text-purple-600" data-testid="total-final">€{total_final.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              data-testid="btn-submeter-encomenda"
              disabled={submitting}
              className="w-full sm:w-auto px-12 py-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              {submitting ? 'A submeter...' : 'Submeter Encomenda'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicOrderPage;