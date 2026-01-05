import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PrintPageCliente = () => {
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
      {/* Header - Versão Cliente (sem informações internas) */}
      <div style={{ borderBottom: '3px solid #ff6b35', paddingBottom: '10mm', marginBottom: '10mm' }}>
        <h1 style={{ fontSize: '28pt', margin: '0', color: '#ff6b35', fontWeight: 'bold' }}>
          {tipoDoc} #{order.numero_encomenda || order.id.slice(0, 8).toUpperCase()}
        </h1>
        <p style={{ fontSize: '12pt', margin: '5mm 0 0 0', color: '#666' }}>
          Data: {formatDateTime(order.data_criacao)}
        </p>
      </div>

      {/* Dados do Cliente */}
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
          </tbody>
        </table>
      </div>

      {/* Informação de Entrega (simplificada - sem kms) */}
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
            {order.tem_entrega && order.morada_entrega && (
              <tr>
                <td style={{ padding: '2mm', fontWeight: 'bold' }}>Morada:</td>
                <td style={{ padding: '2mm' }}>{order.morada_entrega}</td>
              </tr>
            )}
            {order.data_entrega_prevista && (
              <tr>
                <td style={{ padding: '2mm', backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Entrega Prevista:</td>
                <td style={{ padding: '2mm', backgroundColor: '#f5f5f5' }}>{formatDate(order.data_entrega_prevista)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Artigos (sem coluna de separado) */}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumo Financeiro (simplificado - sem custo de entrega detalhado) */}
      <div style={{ marginTop: '10mm', border: '2px solid #ff6b35', padding: '5mm', backgroundColor: '#fff5f0' }}>
        <h2 style={{ fontSize: '16pt', margin: '0 0 3mm 0', color: '#ff6b35' }}>Resumo</h2>
        <table style={{ width: '100%', fontSize: '12pt' }}>
          <tbody>
            <tr>
              <td style={{ padding: '2mm 0' }}>Subtotal Artigos:</td>
              <td style={{ padding: '2mm 0', textAlign: 'right', fontWeight: 'bold' }}>€{order.subtotal_artigos.toFixed(2)}</td>
            </tr>
            {order.tem_entrega && (
              <tr>
                <td style={{ padding: '2mm 0' }}>Entrega:</td>
                <td style={{ padding: '2mm 0', textAlign: 'right', fontWeight: 'bold' }}>€{order.custo_entrega.toFixed(2)}</td>
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
        <p style={{ margin: '0' }}>Obrigado pela sua preferência!</p>
        <p style={{ margin: '2mm 0 0 0' }}>{tipoDoc} #{order.numero_encomenda || order.id.slice(0, 8).toUpperCase()}</p>
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

export default PrintPageCliente;
