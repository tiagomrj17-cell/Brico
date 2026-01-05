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
  const contentRef = useRef(null);

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
    const element = contentRef.current;
    if (!element) {
      alert('Erro: Conteúdo não encontrado');
      return;
    }
    
    setDownloading(true);
    
    try {
      // Wait a bit to ensure all content is rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // First page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      
      // Additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      const tipoDoc = order.tipo === 'orcamento' ? 'Orcamento' : 'Encomenda';
      const numero = order.numero_encomenda || order.id.slice(0, 8);
      pdf.save(`${tipoDoc}_${numero}_Cliente.pdf`);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF: ' + error.message);
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

  return (
    <div>
      {/* Botões de ação - não aparecem na impressão */}
      <div className="no-print" style={{ 
        padding: '20px', 
        textAlign: 'center', 
        backgroundColor: '#f5f5f5', 
        borderBottom: '1px solid #ddd',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <button
          onClick={handlePrint}
          style={{
            padding: '12px 32px',
            fontSize: '16px',
            backgroundColor: '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginRight: '12px',
            fontWeight: 'bold'
          }}
        >
          🖨️ Imprimir
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          style={{
            padding: '12px 32px',
            fontSize: '16px',
            backgroundColor: downloading ? '#93c5fd' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: downloading ? 'wait' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {downloading ? '⏳ A gerar...' : '📄 Download PDF'}
        </button>
      </div>

      {/* Conteúdo para impressão/PDF */}
      <div 
        ref={contentRef}
        id="print-content"
        style={{
          maxWidth: '210mm',
          margin: '0 auto',
          padding: '15mm',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: 'white',
          minHeight: '297mm'
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: '3px solid #ff6b35', paddingBottom: '8mm', marginBottom: '8mm' }}>
          <h1 style={{ fontSize: '24pt', margin: '0', color: '#ff6b35', fontWeight: 'bold' }}>
            {tipoDoc}
          </h1>
          <p style={{ fontSize: '18pt', margin: '4mm 0 0 0', color: '#333', fontWeight: 'bold' }}>
            #{order.numero_encomenda || order.id.slice(0, 8).toUpperCase()}
          </p>
          <p style={{ fontSize: '11pt', margin: '4mm 0 0 0', color: '#666' }}>
            Data: {formatDateTime(order.data_criacao)}
          </p>
        </div>

        {/* Dados do Cliente */}
        <div style={{ marginBottom: '6mm' }}>
          <h2 style={{ fontSize: '14pt', margin: '0 0 2mm 0', color: '#333' }}>Dados do Cliente</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2mm', backgroundColor: '#f5f5f5', fontWeight: 'bold', width: '25%' }}>Nome:</td>
                <td style={{ padding: '2mm', backgroundColor: '#f5f5f5' }}>{order.nome_cliente}</td>
              </tr>
              <tr>
                <td style={{ padding: '2mm', fontWeight: 'bold' }}>Contacto:</td>
                <td style={{ padding: '2mm' }}>{order.contacto || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Informação de Entrega */}
        <div style={{ marginBottom: '6mm' }}>
          <h2 style={{ fontSize: '14pt', margin: '0 0 2mm 0', color: '#333' }}>Tipo de Entrega</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2mm', backgroundColor: '#f5f5f5', fontWeight: 'bold', width: '25%' }}>Tipo:</td>
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
        <div style={{ marginBottom: '6mm' }}>
          <h2 style={{ fontSize: '14pt', margin: '0 0 2mm 0', color: '#333' }}>Artigos</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#ff6b35', color: 'white' }}>
                <th style={{ padding: '2mm', textAlign: 'left', border: '1px solid #ddd', fontSize: '10pt' }}>Código</th>
                <th style={{ padding: '2mm', textAlign: 'left', border: '1px solid #ddd', fontSize: '10pt' }}>Designação</th>
                <th style={{ padding: '2mm', textAlign: 'center', border: '1px solid #ddd', fontSize: '10pt' }}>Qtd.</th>
                <th style={{ padding: '2mm', textAlign: 'right', border: '1px solid #ddd', fontSize: '10pt' }}>P. Unit.</th>
                <th style={{ padding: '2mm', textAlign: 'right', border: '1px solid #ddd', fontSize: '10pt' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.artigos.map((artigo, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : 'white' }}>
                  <td style={{ padding: '2mm', border: '1px solid #ddd', fontSize: '10pt' }}>{artigo.codigo || '-'}</td>
                  <td style={{ padding: '2mm', border: '1px solid #ddd', fontSize: '10pt' }}>{artigo.designacao || '-'}</td>
                  <td style={{ padding: '2mm', border: '1px solid #ddd', textAlign: 'center', fontSize: '10pt' }}>{artigo.quantidade}</td>
                  <td style={{ padding: '2mm', border: '1px solid #ddd', textAlign: 'right', fontSize: '10pt' }}>€{(artigo.preco_unitario || 0).toFixed(2)}</td>
                  <td style={{ padding: '2mm', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10pt' }}>€{(artigo.preco_total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumo Financeiro */}
        <div style={{ marginTop: '8mm', border: '2px solid #ff6b35', padding: '4mm', backgroundColor: '#fff5f0' }}>
          <h2 style={{ fontSize: '14pt', margin: '0 0 2mm 0', color: '#ff6b35' }}>Resumo</h2>
          <table style={{ width: '100%', fontSize: '11pt' }}>
            <tbody>
              <tr>
                <td style={{ padding: '1mm 0' }}>Subtotal Artigos:</td>
                <td style={{ padding: '1mm 0', textAlign: 'right', fontWeight: 'bold' }}>€{(order.subtotal_artigos || 0).toFixed(2)}</td>
              </tr>
              {order.tem_entrega && (
                <tr>
                  <td style={{ padding: '1mm 0' }}>Entrega:</td>
                  <td style={{ padding: '1mm 0', textAlign: 'right', fontWeight: 'bold' }}>€{(order.custo_entrega || 0).toFixed(2)}</td>
                </tr>
              )}
              <tr style={{ borderTop: '2px solid #ff6b35' }}>
                <td style={{ padding: '2mm 0 0 0', fontSize: '14pt', fontWeight: 'bold' }}>TOTAL:</td>
                <td style={{ padding: '2mm 0 0 0', textAlign: 'right', fontSize: '16pt', fontWeight: 'bold', color: '#ff6b35' }}>
                  €{(order.total_final || 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
          
          {/* Estado de pagamento */}
          {order.total_final > 0 && (
            <div style={{ marginTop: '4mm', paddingTop: '4mm', borderTop: '2px dashed #22c55e' }}>
              {order.pago_totalidade ? (
                <div style={{ backgroundColor: '#dcfce7', padding: '3mm', borderRadius: '2mm', textAlign: 'center' }}>
                  <p style={{ margin: '0', fontSize: '14pt', fontWeight: 'bold', color: '#166534' }}>
                    ✓ PAGO NA TOTALIDADE
                  </p>
                </div>
              ) : (
                <div>
                  <table style={{ width: '100%', fontSize: '11pt' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '1mm 0', color: '#166534' }}>Adiantamento Pago:</td>
                        <td style={{ padding: '1mm 0', textAlign: 'right', fontWeight: 'bold', color: '#166534' }}>
                          €{(order.adiantamento || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div style={{ backgroundColor: '#fef2f2', padding: '2mm', marginTop: '2mm' }}>
                    <table style={{ width: '100%' }}>
                      <tbody>
                        <tr>
                          <td style={{ fontSize: '14pt', fontWeight: 'bold', color: '#dc2626' }}>FALTA PAGAR:</td>
                          <td style={{ textAlign: 'right', fontSize: '16pt', fontWeight: 'bold', color: '#dc2626' }}>
                            €{((order.total_final || 0) - (order.adiantamento || 0)).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '10mm', paddingTop: '4mm', borderTop: '1px solid #ddd', textAlign: 'center', fontSize: '9pt', color: '#666' }}>
          <p style={{ margin: '0' }}>Obrigado pela sua preferência!</p>
          <p style={{ margin: '2mm 0 0 0' }}>{tipoDoc} #{order.numero_encomenda || order.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintPageCliente;
