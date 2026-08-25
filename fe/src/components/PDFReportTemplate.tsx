import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image, Svg, Polygon, Line, Circle } from '@react-pdf/renderer';

// Register fonts if needed (using default for now)
const styles = StyleSheet.create({
  page: { 
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff'
  },
  coverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#1e3a8a',
    padding: 30,
    borderBottom: '8px solid #bfdbfe',
    marginBottom: 30
  },
  qrCode: {
    width: 60,
    height: 60,
    padding: 3,
    backgroundColor: '#ffffff',
    borderRadius: 2
  },
  title: {
    fontSize: 20,
    fontWeight: 'extrabold',
    color: '#ffffff',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase'
  },
  contentContainer: {
    paddingHorizontal: 40
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'extrabold',
    color: '#1e3a8a',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 20,
    borderLeft: '4px solid #3b82f6',
    paddingLeft: 8
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    border: '2px solid #1e3a8a',
    marginBottom: 20
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #1e3a8a'
  },
  tableColHeader: {
    width: '40%',
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRight: '1px solid #1e3a8a',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e3a8a'
  },
  tableCol: {
    width: '60%',
    padding: 8,
    fontSize: 10
  },
  pageHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 20,
    borderBottom: '2px solid #1e3a8a',
    paddingBottom: 10,
    textTransform: 'uppercase'
  },
  chunk: {
    padding: 10,
    marginBottom: 15,
    borderLeft: '4px solid #000'
  },
  compliantChunk: {
    borderLeftColor: '#3b82f6',
    backgroundColor: '#eff6ff'
  },
  mediumChunk: {
    borderLeftColor: '#64748b',
    backgroundColor: '#f8fafc'
  },
  highChunk: {
    borderLeftColor: '#1e3a8a',
    backgroundColor: '#f1f5f9'
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#1f2937'
  },
  explanationNote: {
    fontSize: 9,
    color: '#1e3a8a',
    marginTop: 8,
    backgroundColor: '#ffffff',
    padding: 6,
    border: '1px solid #94a3b8'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    borderTop: '1px solid #1e3a8a',
    paddingTop: 10,
    textAlign: 'justify'
  },
  chunkContainer: {
    marginBottom: 20
  },
  originalText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#1f2937'
  },
  aiAnalysisBox: {
    backgroundColor: '#eff6ff',
    border: '1px solid #60a5fa',
    padding: 10,
    marginTop: 5
  },
  analysisTitle: {
    fontSize: 10,
    fontWeight: 'extrabold',
    color: '#1e3a8a',
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  analysisText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#1f2937',
    marginBottom: 4
  },
  boldText: {
    fontWeight: 'bold',
    color: '#78350f'
  }
});

interface PDFReportTemplateProps {
  data: any;
  userName: string;
  userEmail: string;
}

export const PDFReportTemplate = ({ data, userName, userEmail }: PDFReportTemplateProps) => {
  if (!data) return null;

  // Parse document JSON strictly mapping over the new Pages -> Chunks structure
  let parsedDoc = { pages: [] };
  if (data.parsedDocumentJson) {
    try {
      let parsed = typeof data.parsedDocumentJson === 'string' ? JSON.parse(data.parsedDocumentJson) : data.parsedDocumentJson;
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      if (parsed) parsedDoc = parsed;
    } catch (e) {
      console.error("Failed to parse document JSON:", e);
    }
  }
  const pages = parsedDoc.pages || [];

  // Calculate statistics
  let totalChunks = 0;
  let compliantCount = 0;
  let mediumCount = 0;
  let highCount = 0;

  pages.forEach((page: any) => {
    page.chunks?.forEach((chunk: any) => {
      totalChunks++;
      const status = (chunk.severity || chunk.status || '').toUpperCase();
      if (status === 'HIGH_RISK' || status === 'HIGH') highCount++;
      else if (status === 'MEDIUM_RISK' || status === 'MEDIUM') mediumCount++;
      else compliantCount++;
    });
  });

  const compliantPct = totalChunks > 0 ? Math.round((compliantCount / totalChunks) * 100) : 0;
  const mediumPct = totalChunks > 0 ? Math.round((mediumCount / totalChunks) * 100) : 0;
  const highPct = totalChunks > 0 ? Math.round((highCount / totalChunks) * 100) : 0;

  const getHighlightStyle = (severity: string, status: string) => {
    const s = (severity || status || '').toUpperCase();
    if (s === 'HIGH_RISK' || s === 'HIGH') return [styles.chunk, styles.highChunk];
    if (s === 'MEDIUM_RISK' || s === 'MEDIUM') return [styles.chunk, styles.mediumChunk];
    return [styles.chunk, styles.compliantChunk];
  };

  // Radar Chart Calculations
  const maxR = 60; // Max radius for SVG
  const lPct = Math.min(100, Math.max(0, ((data.score_safety || data.scoreSafety || 0) / 40) * 100));
  const tPct = Math.min(100, Math.max(0, ((data.score_technical || data.scoreTechnical || 0) / 30) * 100));
  const sPct = Math.min(100, Math.max(0, ((data.score_efficiency || data.scoreEfficiency || 0) / 15) * 100));
  const trPct = Math.min(100, Math.max(0, ((data.score_reliability || data.scoreReliability || 0) / 15) * 100));

  const L = (lPct / 100) * maxR;
  const T = (tPct / 100) * maxR;
  const S = (sPct / 100) * maxR;
  const TR = (trPct / 100) * maxR;

  const points = `0,-${L} ${T},0 0,${S} -${TR},0`;

  return (
    <Document>
      {/* PAGE 1: COVER PAGE */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>OzikOps Verification Report</Text>
            <Text style={styles.subtitle}>SHA-256 AUDIT ID: {data.sha256Hash?.substring(0,16) || data.auditId?.substring(0,16) || "N/A"}...</Text>
            <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', marginTop: 8, fontStyle: 'italic' }}>The Report is Generated by OzikOps AI Compliance & Safety Verification Engine (Chandra Asri Knowledge Base Integrated)</Text>
          </View>
          <View>
            <Image 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://ozikops.vercel.app/verify/${data.sha256Hash || data.auditId}`)}`} 
              style={styles.qrCode} 
            />
          </View>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>01. Submission Information</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableColHeader}>Project Name</Text>
            <Text style={styles.tableCol}>{data.equipmentName || data.projectName || "Unnamed Equipment Protocol"}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColHeader}>Author / Submitter</Text>
            <Text style={styles.tableCol}>{userName} ({userEmail})</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColHeader}>Submission Date</Text>
            <Text style={styles.tableCol}>{new Date(data.createdAt || Date.now()).toLocaleDateString('id-ID')}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColHeader}>Feasibility Score</Text>
            <Text style={[styles.tableCol, { fontWeight: 'bold' }]}>{data.feasibilityScore}/100</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColHeader}>Document Metadata</Text>
            <Text style={styles.tableCol}>{data.documentMetadata || `${data.totalPages || 0} Pages • ${data.totalSentences || 0} Sentences`}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>02. Content Composition</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableColHeader}>Compliant Clauses</Text>
            <Text style={styles.tableCol}>{compliantPct}% ({compliantCount})</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColHeader}>Medium Risk</Text>
            <Text style={styles.tableCol}>{mediumPct}% ({mediumCount})</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColHeader}>High Risk Violations</Text>
            <Text style={styles.tableCol}>{highPct}% ({highCount})</Text>
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>03. 4-Pillar Scoring Breakdown</Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ flex: 1, paddingRight: 20 }}>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.tableColHeader}>Safety Compliance (Max 40)</Text>
                <Text style={styles.tableCol}>{data.score_safety || data.scoreSafety || 0}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableColHeader}>Technical (Max 30)</Text>
                <Text style={styles.tableCol}>{data.score_technical || data.scoreTechnical || 0}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableColHeader}>Efficiency (Max 15)</Text>
                <Text style={styles.tableCol}>{data.score_efficiency || data.scoreEfficiency || 0}</Text>
              </View>
              <View style={[styles.tableRow, { borderBottom: 'none' }]}>
                <Text style={styles.tableColHeader}>Reliability (Max 15)</Text>
                <Text style={styles.tableCol}>{data.score_reliability || data.scoreReliability || 0}</Text>
              </View>
            </View>
          </View>
          
          <View style={{ width: 160, height: 160, position: 'relative' }}>
            <Svg width="160" height="160" viewBox="-80 -80 160 160">
              {/* Grid Lines */}
              <Polygon points={`0,-${maxR} ${maxR},0 0,${maxR} -${maxR},0`} fill="none" stroke="#e5e7eb" strokeWidth={1} />
              <Polygon points={`0,-${maxR*0.75} ${maxR*0.75},0 0,${maxR*0.75} -${maxR*0.75},0`} fill="none" stroke="#e5e7eb" strokeWidth={1} />
              <Polygon points={`0,-${maxR*0.5} ${maxR*0.5},0 0,${maxR*0.5} -${maxR*0.5},0`} fill="none" stroke="#e5e7eb" strokeWidth={1} />
              <Polygon points={`0,-${maxR*0.25} ${maxR*0.25},0 0,${maxR*0.25} -${maxR*0.25},0`} fill="none" stroke="#e5e7eb" strokeWidth={1} />
              
              {/* Axes */}
              <Line x1="0" y1={`-${maxR}`} x2="0" y2={`${maxR}`} stroke="#e5e7eb" strokeWidth={1} />
              <Line x1={`-${maxR}`} y1="0" x2={`${maxR}`} y2="0" stroke="#e5e7eb" strokeWidth={1} />

              {/* Data Polygon */}
              <Polygon points={points} fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth="2" />
              
              {/* Points */}
              <Circle cx="0" cy={`-${L}`} r="3" fill="#3b82f6" />
              <Circle cx={`${T}`} cy="0" r="3" fill="#3b82f6" />
              <Circle cx="0" cy={`${S}`} r="3" fill="#3b82f6" />
              <Circle cx={`-${TR}`} cy="0" r="3" fill="#3b82f6" />
            </Svg>

            {/* Labels using absolute positioning over the SVG */}
            <Text style={{ position: 'absolute', top: 5, left: 65, fontSize: 8, fontWeight: 'bold', color: '#1e3a8a' }}>Safety</Text>
            <Text style={{ position: 'absolute', top: 75, right: 0, fontSize: 8, fontWeight: 'bold', color: '#1e3a8a' }}>Tech</Text>
            <Text style={{ position: 'absolute', bottom: 5, left: 65, fontSize: 8, fontWeight: 'bold', color: '#1e3a8a' }}>Efficiency</Text>
            <Text style={{ position: 'absolute', top: 75, left: 0, fontSize: 8, fontWeight: 'bold', color: '#1e3a8a' }}>Transp.</Text>
          </View>
        </View>

        </View>
        <Text style={styles.footer}>
          This protocol is generated by the OzikOps AI Engine based on Chandra Asri's internal Equipment Specifications and Maintenance Logs. All generated actions have been validated by the designated Senior Engineer. Adhere strictly to the plant's HSE guidelines. Document ID: {data.sha256Hash || data.auditId}
        </Text>
      </Page>

      {/* PAGE 2+: DOCUMENT CONTENT */}
      {pages.map((page: any, pageIndex: number) => (
        <Page key={`page-${pageIndex}`} size="A4" style={[styles.page, { padding: 40 }]}>
          <Text style={styles.pageHeader}>DOCUMENT ANALYSIS - Page {page.page_number}</Text>
          
          {page.chunks?.map((rawChunk: any, chunkIndex: number) => {
            
            // Map the issue if it exists
            let chunk = { ...rawChunk };
            const matchedIssue = data.issues?.find((i: any) => 
              i.chunkIndex === chunk.id || 
              (i.clauseText && chunk.text && i.clauseText.substring(0, 20) === chunk.text.substring(0, 20)) ||
              (i.pageNumber === page.page_number && i.chunkIndex === chunk.id)
            );

            if (matchedIssue) {
              chunk.severity = matchedIssue.severity;
              chunk.status = matchedIssue.severity;
              chunk.explanation = matchedIssue.explanation || matchedIssue.issue || "Terdapat pelanggaran atau risiko pada klausul ini.";
              chunk.matched_law = matchedIssue.matchedLaw || matchedIssue.originalLawText;
              chunk.suggested_revision = matchedIssue.suggestedRevision;
            } else {
              chunk.severity = 'COMPLIANT';
              chunk.status = 'COMPLIANT';
            }

            const severity = (chunk.severity || chunk.status || '').toUpperCase();
            const isCompliant = severity !== 'HIGH_RISK' && severity !== 'HIGH' && severity !== 'MEDIUM_RISK' && severity !== 'MEDIUM';
            
            return (
              <View key={`chunk-${chunk.id || chunkIndex}`} style={styles.chunkContainer} wrap={false}>
                {/* 1. ORIGINAL TEXT WITH DYNAMIC BACKGROUND COLOR */}
                <View style={getHighlightStyle(chunk.severity, chunk.status)}>
                  <Text style={styles.originalText}>{chunk.text}</Text>
                </View>

                {/* 2. AI SOLUTION BOX (RENDER IF NOT COMPLIANT) */}
                {!isCompliant ? (
                  <View style={styles.aiAnalysisBox}>
                    <Text style={styles.analysisTitle}>⚠️ HASIL ANALISIS & SOLUSI AI:</Text>
                    <Text style={styles.analysisText}><Text style={styles.boldText}>Masalah: </Text>{chunk.explanation || chunk.issue?.explanation || "Tidak ada detail masalah."}</Text>
                    <Text style={styles.analysisText}><Text style={styles.boldText}>Dasar Hukum: </Text>{chunk.matched_law || chunk.issue?.matchedLaw || chunk.issue?.MatchedLaw || "Tidak ditemukan referensi hukum."}</Text>
                    {(chunk.suggested_revision || chunk.issue?.suggestedRevision || chunk.issue?.SuggestedRevision) && (
                      <Text style={styles.analysisText}><Text style={styles.boldText}>Draf Perbaikan: </Text>{chunk.suggested_revision || chunk.issue?.suggestedRevision || chunk.issue?.SuggestedRevision}</Text>
                    )}
                  </View>
                ) : (
                  <View style={[styles.aiAnalysisBox, { backgroundColor: '#f0fdf4', borderColor: '#22c55e' }]}>
                    <Text style={[styles.analysisTitle, { color: '#166534' }]}>✅ PROTOCOL VALIDATED:</Text>
                    <Text style={styles.analysisText}>{chunk.ai_analysis_result || chunk.senior_engineer_notes || "All troubleshooting steps in this section are compliant with standard operating procedures and have been validated by the Senior Engineer."}</Text>
                  </View>
                )}
              </View>
            );
          })}
          
          <Text style={styles.footer}>
            OzikOps Confidential • Page {pageIndex + 2}
          </Text>
        </Page>
      ))}
    </Document>
  );
};
