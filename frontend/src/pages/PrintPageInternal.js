import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PrintPageInternal = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (order && !loading) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [order, loading]);

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`${API}/orders/${orderId}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Erro ao carregar encomenda:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
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

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>A carregar encomenda...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Encomenda não encontrada</p>
      </div>
    );
  }

  const tipoDoc = order.tipo === 'orcamento' ? 'Orçamento' : 'Encomenda';

  return (
    <div style={{
      maxWidth: '210mm',
      margin: '0 auto',
      padding: '20mm',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: 'white',
      minHeight: '297mm'
    }}>
      {/* Header - Versão Interna Completa */}
      <div style={{ borderBottom: '3px solid #ff6b35', paddingBottom: '10mm', marginBottom: '10mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '28pt', margin: '0', color: '#ff6b35', fontWeight: 'bold' }}>
              {tipoDoc} #{order.numero_encomenda || order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p style={{ fontSize: '12pt', margin: '5mm 0 0 0', color: '#666' }}>
              Data: {formatDateTime(order.data_criacao)}
            </p>
            {order.data_atualizacao && order.data_atualizacao !== order.data_criacao && (
              <p style={{ fontSize: '10pt', margin: '2mm 0 0 0', color: '#ff6b35', fontWeight: 'bold' }}>
                Última atualização: {formatDateTime(order.data_atualizacao)}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right', backgroundColor: '#f5f5f5', padding: '3mm', borderRadius: '2mm' }}>
            <p style={{ margin: '0', fontSize: '10pt', color: '#666' }}>VERSÃO INTERNA</p>
            <p style={{ margin: '2mm 0 0 0', fontSize: '12pt', fontWeight: 'bold', color: order.status === 'Levantada' ? '#16a34a' : '#ff6b35' }}>
              {order.status}
            </p>
          </div>
        </div>
      </div>

      {/* Dados do Cliente e Colaborador */}
      <div style={{ marginBottom: '8mm' }}>
        <h2 style={{ fontSize: '16pt', margin: '0 0 3mm 0', color: '#333' }}>Dados do Cliente</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '2mm', backgroundColor: '#f5f5f5', fontWeight: 'bold', width: '30%' }}>Nome:</td>
              <td style={{ padding: '2mm', backgroundColor: '#f5f5f5' }}>{order.nome_cliente}</td>
            </tr>
            <tr>
              <td style={{ padding: '2mm', fontWeight: 'bold' }}>Contacto:</td>
              <td style={{ padding: '2mm' }}>{order.contacto}</td>
            </tr>
            {order.nome_colaborador && (
              <tr>
                <td style={{ padding: '2mm', backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Colaborador:</td>
                <td style={{ padding: '2mm', backgroundColor: '#f5f5f5', color: '#7c3aed', fontWeight: 'bold' }}>
                  {order.nome_colaborador}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Informação de Entrega Completa */}
      <div style={{ marginBottom: '8mm' }}>
        <h2 style={{ fontSize: '16pt', margin: '0 0 3mm 0', color: '#333' }}>Tipo de Entrega</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '2mm', backgroundColor: '#f5f5f5', fontWeight: 'bold', width: '30%' }}>Tipo:</td>
              <td style={{ padding: '2mm', backgroundColor: '#f5f5f5' }}>
                {order.tem_entrega ? 'Entrega ao Domicílio' : 'Levantamento'}
              </td>
            </tr>
            {order.tem_entrega && (
              <>
                <tr>
                  <td style={{ padding: '2mm', fontWeight: 'bold' }}>Morada:</td>
                  <td style={{ padding: '2mm' }}>{order.morada_entrega}</td>
                </tr>
                <tr>
                  <td style={{ padding: '2mm', backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Distância:</td>
                  <td style={{ padding: '2mm', backgroundColor: '#f5f5f5' }}>{order.distancia_kms} km</td>
                </tr>
                <tr>
                  <td style={{ padding: '2mm', fontWeight: 'bold' }}>Nº Colaboradores:</td>
                  <td style={{ padding: '2mm' }}>{order.num_colaboradores}</td>
                </tr>
              </>
            )}
            {order.data_entrega_prevista && (
              <tr>
                <td style={{ padding: '2mm', backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Entrega Prevista:</td>
                <td style={{ padding: '2mm', backgroundColor: '#f5f5f5' }}>{formatDate(order.data_entrega_prevista)}</td>
              </tr>
            )}
            {order.data_levantada && (
              <tr>
                <td style={{ padding: '2mm', fontWeight: 'bold' }}>Data de Levantamento:</td>
                <td style={{ padding: '2mm', color: '#16a34a', fontWeight: 'bold' }}>{formatDateTime(order.data_levantada)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Artigos com coluna de separado */}
      <div style={{ marginBottom: '8mm' }}>
        <h2 style={{ fontSize: '16pt', margin: '0 0 3mm 0', color: '#333' }}>Artigos</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr style={{ backgroundColor: '#ff6b35', color: 'white' }}>
              <th style={{ padding: '3mm', textAlign: 'left', border: '1px solid #ddd' }}>Código</th>
              <th style={{ padding: '3mm', textAlign: 'left', border: '1px solid #ddd' }}>Designação</th>
              <th style={{ padding: '3mm', textAlign: 'center', border: '1px solid #ddd' }}>Qtd.</th>
              <th style={{ padding: '3mm', textAlign: 'right', border: '1px solid #ddd' }}>P. Unit.</th>
              <th style={{ padding: '3mm', textAlign: 'right', border: '1px solid #ddd' }}>Total</th>
              <th style={{ padding: '3mm', textAlign: 'center', border: '1px solid #ddd' }}>Separado</th>
            </tr>
          </thead>
          <tbody>
            {order.artigos.map((artigo, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : 'white' }}>
                <td style={{ padding: '2mm', border: '1px solid #ddd' }}>{artigo.codigo}</td>
                <td style={{ padding: '2mm', border: '1px solid #ddd' }}>{artigo.designacao}</td>
                <td style={{ padding: '2mm', border: '1px solid #ddd', textAlign: 'center' }}>{artigo.quantidade}</td>
                <td style={{ padding: '2mm', border: '1px solid #ddd', textAlign: 'right' }}>€{artigo.preco_unitario.toFixed(2)}</td>
                <td style={{ padding: '2mm', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>€{artigo.preco_total.toFixed(2)}</td>
                <td style={{ padding: '2mm', border: '1px solid #ddd', textAlign: 'center', color: artigo.separado ? '#16a34a' : '#999', fontWeight: artigo.separado ? 'bold' : 'normal' }}>
                  {artigo.separado ? '✓ SIM' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Observações (apenas na versão interna) */}
      {order.observacoes && (
        <div style={{ marginBottom: '8mm', padding: '4mm', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '2mm' }}>
          <h3 style={{ fontSize: '14pt', margin: '0 0 2mm 0', color: '#333' }}>Observações Internas</h3>
          <p style={{ margin: '0', fontSize: '11pt', whiteSpace: 'pre-wrap' }}>{order.observacoes}</p>
        </div>
      )}

      {/* Histórico de Alterações (apenas na versão interna) */}
      {order.historico && order.historico.length > 0 && (
        <div style={{ marginBottom: '8mm', padding: '4mm', backgroundColor: '#e0f2fe', border: '1px solid #0ea5e9', borderRadius: '2mm' }}>
          <h3 style={{ fontSize: '14pt', margin: '0 0 2mm 0', color: '#333' }}>Histórico de Alterações</h3>
          <div style={{ fontSize: '10pt' }}>
            {order.historico.map((alt, idx) => {
              const nomeCampo = {
                'status': 'Estado',
                'observacoes': 'Observações',
                'data_entrega_prevista': 'Data de Entrega Prevista',
                'data_levantada': 'Data de Levantamento'
              }[alt.campo_alterado] || alt.campo_alterado;
              
              return (
                <div key={idx} style={{ marginBottom: '3mm', paddingBottom: '2mm', borderBottom: idx < order.historico.length - 1 ? '1px solid #bae6fd' : 'none' }}>
                  <div style={{ color: '#0c4a6e', fontWeight: 'bold', marginBottom: '1mm' }}>{formatDateTime(alt.data_hora)}</div>
                  <div style={{ color: '#1e40af', fontWeight: 'bold' }}>{nomeCampo}</div>
                  <div style={{ paddingLeft: '3mm', marginTop: '1mm' }}>
                    <div style={{ color: '#dc2626' }}>Antes: {alt.valor_anterior || '(vazio)'}</div>
                    <div style={{ color: '#16a34a', fontWeight: 'bold' }}>Agora: {alt.valor_novo}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumo Financeiro Completo */}
      <div style={{ marginTop: '10mm', border: '2px solid #ff6b35', padding: '5mm', backgroundColor: '#fff5f0' }}>
        <h2 style={{ fontSize: '16pt', margin: '0 0 3mm 0', color: '#ff6b35' }}>Resumo Financeiro</h2>
        <table style={{ width: '100%', fontSize: '12pt' }}>
          <tbody>
            <tr>
              <td style={{ padding: '2mm 0' }}>Subtotal Artigos:</td>
              <td style={{ padding: '2mm 0', textAlign: 'right', fontWeight: 'bold' }}>€{order.subtotal_artigos.toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ padding: '2mm 0' }}>Custo de Entrega:</td>
              <td style={{ padding: '2mm 0', textAlign: 'right', fontWeight: 'bold' }}>€{order.custo_entrega.toFixed(2)}</td>
            </tr>
            {order.tem_entrega && order.distancia_kms && (
              <tr>
                <td style={{ padding: '1mm 0', paddingLeft: '10mm', fontSize: '10pt', color: '#666' }}>
                  ({order.distancia_kms} km × {order.num_colaboradores} colaborador{order.num_colaboradores > 1 ? 'es' : ''})
                </td>
                <td></td>
              </tr>
            )}
            <tr style={{ borderTop: '2px solid #ff6b35' }}>
              <td style={{ padding: '3mm 0 0 0', fontSize: '16pt', fontWeight: 'bold' }}>TOTAL:</td>
              <td style={{ padding: '3mm 0 0 0', textAlign: 'right', fontSize: '18pt', fontWeight: 'bold', color: '#ff6b35' }}>
                €{order.total_final.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '15mm', paddingTop: '5mm', borderTop: '1px solid #ddd', textAlign: 'center', fontSize: '9pt', color: '#666' }}>
        <p style={{ margin: '0' }}>DOCUMENTO INTERNO - Sistema de Gestão de Encomendas</p>
        <p style={{ margin: '2mm 0 0 0' }}>ID: {order.id}</p>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintPageInternal;
