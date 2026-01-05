import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PrintPageCliente = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    setDownloading(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const tipoDoc = order.tipo === 'orcamento' ? 'Orcamento' : 'Encomenda';
      const fileName = `${tipoDoc}_${order.numero_encomenda || order.id.slice(0, 8)}_Cliente.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente usar a opção de impressão.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>A carregar...</p>
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
  const faltaPagar = order.adiantamento ? order.total_final - order.adiantamento : null;

  return (
    <div>
      {/* Botões de ação - não aparecem na impressão */}
      <div className="no-print" style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
        <button
          onClick={handlePrint}
          style={{
            padding: '10px 30px',
            fontSize: '16px',
            backgroundColor: '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          🖨️ Imprimir
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          style={{
            padding: '10px 30px',
            fontSize: '16px',
            backgroundColor: downloading ? '#93c5fd' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: downloading ? 'not-allowed' : 'pointer'
          }}
        >
          {downloading ? '⏳ A gerar PDF...' : '📄 Download PDF'}
        </button>
        <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          Para guardar como PDF, escolha "Guardar como PDF" na janela de impressão
        </p>
      </div>

      <div ref={printRef} style={{
        maxWidth: '210mm',
        margin: '0 auto',
        padding: '20mm',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: 'white',
        minHeight: '297mm'
      }}>
        {/* Header */}
        <div style={{ borderBottom: '3px solid #ff6b35', paddingBottom: '10mm', marginBottom: '10mm' }}>
          <h1 style={{ fontSize: '28pt', margin: '0', color: '#ff6b35', fontWeight: 'bold' }}>
            {tipoDoc}
          </h1>
          <p style={{ fontSize: '20pt', margin: '5mm 0 0 0', color: '#333', fontWeight: 'bold' }}>
            #{order.numero_encomenda || order.id.slice(0, 8).toUpperCase()}
          </p>
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

        {/* Informação de Entrega */}
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

        {/* Artigos */}
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

        {/* Resumo Financeiro */}
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
          
          {/* Adiantamento e Falta Pagar */}
          {order.pago_totalidade ? (
            <div style={{ marginTop: '5mm', paddingTop: '5mm', borderTop: '2px dashed #22c55e' }}>
              <div style={{ backgroundColor: '#dcfce7', padding: '4mm', borderRadius: '2mm', textAlign: 'center' }}>
                <p style={{ margin: '0', fontSize: '16pt', fontWeight: 'bold', color: '#166534' }}>
                  ✓ PAGO NA TOTALIDADE
                </p>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '5mm', paddingTop: '5mm', borderTop: '2px dashed #22c55e' }}>
              <table style={{ width: '100%', fontSize: '12pt' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '2mm 0', color: '#166534' }}>Adiantamento Pago:</td>
                    <td style={{ padding: '2mm 0', textAlign: 'right', fontWeight: 'bold', color: '#166534' }}>
                      €{(order.adiantamento || 0).toFixed(2)}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#fef2f2' }}>
                    <td style={{ padding: '3mm', fontSize: '16pt', fontWeight: 'bold', color: '#dc2626' }}>FALTA PAGAR:</td>
                    <td style={{ padding: '3mm', textAlign: 'right', fontSize: '18pt', fontWeight: 'bold', color: '#dc2626' }}>
                      €{(order.total_final - (order.adiantamento || 0)).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
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
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default PrintPageCliente;
