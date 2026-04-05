import React, { useState, useEffect } from 'react';
import { Upload, Download, BarChart3, AlertCircle, CheckCircle2, Calendar, Trash2, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CycleCountApp() {
  const [appState, setAppState] = useState({
    skus: [],
    lastCounts: {},
    archivedSkus: [],
    generatedDates: []
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [todaysCounts, setTodaysCounts] = useState(null);
  const [stats, setStats] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load from persistent storage on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const stored = await window.storage?.get?.('cycle-count-app-state');
        if (stored) {
          setAppState(JSON.parse(stored.value));
        }
      } catch (e) {
        console.error('Failed to load state:', e);
      }
    };
    loadState();
  }, []);

  // Save to persistent storage whenever state changes
  useEffect(() => {
    const saveState = async () => {
      if (appState.skus.length > 0) {
        try {
          await window.storage?.set?.('cycle-count-app-state', JSON.stringify(appState));
        } catch (e) {
          console.error('Failed to save state:', e);
        }
      }
    };
    saveState();
  }, [appState]);

  // Classify SKUs based on inventory turns (tertile distribution)
  const classifySKUs = (skus) => {
    if (skus.length === 0) return [];

    const turns = skus.map(s => parseFloat(s.turns) || 0).sort((a, b) => a - b);
    const threshold66 = turns[Math.floor(turns.length * 0.67)];
    const threshold33 = turns[Math.floor(turns.length * 0.33)];

    return skus.map(sku => ({
      ...sku,
      level: parseFloat(sku.turns) >= threshold66 ? 'A' : parseFloat(sku.turns) >= threshold33 ? 'B' : 'C'
    }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        console.log('Parsed data:', jsonData);

        if (jsonData.length === 0) {
          alert('No data found in Excel file. Please check your file format.');
          return;
        }

        // Parse incoming data - handle various column name variations
        const newSkus = jsonData.map(row => {
          const skuValue = row.SKU || row.sku || row.Sku || '';
          const binValue = row['Bin Location'] || row['bin location'] || row.bin || row.Bin || row.location || row.Location || '';
          const turnsValue = row['Inventory Turn'] || row['inventory turn'] || row.turns || row.Turns || '';
          
          return {
            sku: String(skuValue).trim().toUpperCase(),
            bin: String(binValue).trim(),
            turns: parseFloat(turnsValue) || 0
          };
        }).filter(s => s.sku.length > 0 && s.bin.length > 0 && s.turns > 0);

        if (newSkus.length === 0) {
          alert('No valid SKUs found. Please ensure columns are: SKU, Bin Location, Inventory Turn');
          return;
        }

        console.log('Parsed SKUs:', newSkus);

        // Classify new SKUs
        const classifiedNew = classifySKUs(newSkus);

        // Find removed SKUs
        const newSkuSet = new Set(classifiedNew.map(s => s.sku));
        const removed = appState.skus.filter(s => !newSkuSet.has(s.sku));

        // Archive removed SKUs
        const updated = {
          ...appState,
          skus: classifiedNew,
          archivedSkus: [...appState.archivedSkus, ...removed],
          lastCounts: Object.fromEntries(
            Object.entries(appState.lastCounts).filter(([sku]) => newSkuSet.has(sku))
          )
        };

        setAppState(updated);
        alert(`✓ Imported ${classifiedNew.length} SKUs.\n${removed.length} old SKUs archived.`);
        event.target.value = '';
      } catch (err) {
        console.error('Upload error:', err);
        alert('Error parsing file: ' + err.message);
      }
    };
    reader.onerror = () => {
      alert('Error reading file. Please try again.');
    };
    reader.readAsArrayBuffer(file);
  };

  const generateDailyCounts = () => {
    if (appState.skus.length === 0) {
      alert('No SKUs loaded. Please upload a file first.');
      return;
    }

    const levels = { A: [], B: [], C: [] };
    appState.skus.forEach(sku => {
      levels[sku.level].push(sku);
    });

    // Percentage-based approach using 260 operating days per year (Mon-Fri)
    // A Level: 12 counts/year → count all A items every 21.67 days (~monthly)
    //   Daily A count = ceil(A_items / 21.67)
    // B Level: 4 counts/year → count all B items every 65 days (~quarterly)
    //   Daily B count = ceil(B_items / 65)
    // C Level: 2 counts/year → count all C items every 130 days (~semi-annual)
    //   Daily C count = ceil(C_items / 130)
    
    const operatingDaysPerYear = 260; // Monday-Friday only
    const daysPerCycleA = operatingDaysPerYear / 12; // ~21.67 days
    const daysPerCycleB = operatingDaysPerYear / 4;  // ~65 days
    const daysPerCycleC = operatingDaysPerYear / 2;  // ~130 days
    
    const countPerDay = {
      A: Math.max(1, Math.ceil(levels.A.length / daysPerCycleA)),
      B: Math.max(1, Math.ceil(levels.B.length / daysPerCycleB)),
      C: Math.max(1, Math.ceil(levels.C.length / daysPerCycleC))
    };

    console.log('Count targets:', countPerDay, 'Levels:', levels);

    // Get SKUs not yet cycled, or cycle again if all done
    const getCandidates = (skuArray) => {
      const notCounted = skuArray.filter(sku => !appState.lastCounts[sku.sku]);
      if (notCounted.length > 0) return notCounted;
      // All counted, reset cycle
      return skuArray;
    };

    const selected = [];
    Object.keys(levels).forEach(level => {
      const candidates = getCandidates(levels[level]);
      for (let i = 0; i < countPerDay[level] && candidates.length > 0; i++) {
        const randomIdx = Math.floor(Math.random() * candidates.length);
        selected.push(candidates[randomIdx]);
        candidates.splice(randomIdx, 1);
      }
    });

    // Update last counts
    const now = new Date();
    const newLastCounts = { ...appState.lastCounts };
    selected.forEach(sku => {
      newLastCounts[sku.sku] = {
        date: now.toISOString().split('T')[0],
        daysSince: 0
      };
    });

    const updated = {
      ...appState,
      lastCounts: newLastCounts,
      generatedDates: [...appState.generatedDates, now.toISOString()]
    };

    setAppState(updated);
    setTodaysCounts(selected);

    // Auto-download
    downloadDailyCount(selected);
  };

  const downloadDailyCount = (skus = todaysCounts) => {
    if (!skus || skus.length === 0) {
      alert('No counts to download.');
      return;
    }

    try {
      // Build CSV as fallback method
      const csvData = [
        ['SKU', 'Bin Location', 'Inventory Level', 'Last Counted', 'Days Since Count']
      ];
      
      skus.forEach(sku => {
        csvData.push([
          sku.sku,
          sku.bin,
          sku.level,
          appState.lastCounts[sku.sku]?.date || 'Never',
          appState.lastCounts[sku.sku]?.daysSince || 'N/A'
        ]);
      });

      // Try XLSX method first
      if (XLSX && XLSX.utils && XLSX.writeFile) {
        const data = skus.map(sku => ({
          SKU: sku.sku,
          'Bin Location': sku.bin,
          'Inventory Level': sku.level,
          'Last Counted': appState.lastCounts[sku.sku]?.date || 'Never',
          'Days Since Count': appState.lastCounts[sku.sku]?.daysSince || 'N/A'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [
          { wch: 15 },
          { wch: 18 },
          { wch: 16 },
          { wch: 15 },
          { wch: 18 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Daily Count');
        
        const filename = `cycle-count-${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
        console.log('Excel file downloaded:', filename);
      } else {
        // Fallback to CSV
        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `cycle-count-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('CSV file downloaded (XLSX not available)');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Error: ' + error.message + '\n\nPlease check browser console (F12) for details.');
    }
  };

  // Calculate statistics
  useEffect(() => {
    if (appState.skus.length === 0) {
      setStats(null);
      return;
    }

    const levels = { A: 0, B: 0, C: 0 };
    appState.skus.forEach(sku => levels[sku.level]++);

    const uncounted = {
      A: Object.values(levels.A > 0 ? appState.skus.filter(s => s.level === 'A' && !appState.lastCounts[s.sku]) : []).length,
      B: Object.values(levels.B > 0 ? appState.skus.filter(s => s.level === 'B' && !appState.lastCounts[s.sku]) : []).length,
      C: Object.values(levels.C > 0 ? appState.skus.filter(s => s.level === 'C' && !appState.lastCounts[s.sku]) : []).length
    };

    setStats({ levels, uncounted });
  }, [appState]);

  const clearAllData = () => {
    setAppState({ skus: [], lastCounts: {}, archivedSkus: [], generatedDates: [] });
    setTodaysCounts(null);
    setStats(null);
    setShowDeleteConfirm(false);
    
    try {
      if (window.storage?.delete) {
        window.storage.delete('cycle-count-app-state').catch(e => {
          console.error('Failed to delete storage:', e);
        });
      }
    } catch (e) {
      console.error('Storage deletion error:', e);
    }
    
    alert('✓ All data has been cleared.');
  };

  return (
    <div style={{ background: '#0a0e27', color: '#e8eef5', minHeight: '100vh', fontFamily: '"Courier Prime", monospace' }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #1e2749',
        background: 'linear-gradient(180deg, #0f1435 0%, #0a0e27 100%)',
        padding: '24px 32px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <BarChart3 size={32} style={{ color: '#00d9ff' }} />
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', letterSpacing: '0.5px' }}>
              CYCLE COUNT MANAGER
            </h1>
          </div>
          <p style={{ margin: 0, color: '#a0aac0', fontSize: '13px', fontWeight: '500', letterSpacing: '1px' }}>
            Inventory Classification & Rotation System
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #1e2749', background: '#0a0e27', padding: '0 32px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '24px' }}>
          {['dashboard', 'upload', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                color: activeTab === tab ? '#00d9ff' : '#5a6677',
                padding: '16px 0',
                fontSize: '13px',
                fontWeight: '600',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                borderBottom: activeTab === tab ? '2px solid #00d9ff' : 'none',
                transition: 'all 0.3s ease'
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>
        {activeTab === 'dashboard' && (
          <div>
            {!stats ? (
              <div style={{
                background: '#1a1f3a',
                border: '1px solid #1e2749',
                padding: '48px',
                textAlign: 'center',
                borderRadius: '2px'
              }}>
                <AlertCircle size={48} style={{ color: '#5a6677', marginBottom: '16px' }} />
                <p style={{ color: '#a0aac0', marginBottom: '24px' }}>No inventory data loaded</p>
                <button
                  onClick={() => setActiveTab('upload')}
                  style={{
                    background: '#00d9ff',
                    color: '#0a0e27',
                    border: 'none',
                    padding: '12px 24px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    letterSpacing: '0.5px'
                  }}
                >
                  UPLOAD FILE
                </button>
              </div>
            ) : (
              <div>
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                  {[
                    { label: 'A LEVEL (Monthly)', level: 'A', icon: '▲' },
                    { label: 'B LEVEL (Quarterly)', level: 'B', icon: '■' },
                    { label: 'C LEVEL (Semi-Annual)', level: 'C', icon: '●' }
                  ].map(({ label, level, icon }) => (
                    <div
                      key={level}
                      style={{
                        background: '#1a1f3a',
                        border: '1px solid #1e2749',
                        padding: '24px',
                        borderRadius: '2px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: '48px', color: '#00d9ff', marginBottom: '8px', opacity: 0.3 }}>
                          {icon}
                        </div>
                        <p style={{ color: '#5a6677', fontSize: '12px', margin: '0 0 12px 0', letterSpacing: '0.5px', fontWeight: '600' }}>
                          {label}
                        </p>
                        <p style={{ fontSize: '36px', fontWeight: '700', margin: '0 0 12px 0' }}>
                          {stats.levels[level]}
                        </p>
                        <p style={{ color: '#a0aac0', fontSize: '13px', margin: 0 }}>
                          <span style={{ color: '#ff6b6b' }}>{stats.uncounted[level]}</span> {stats.uncounted[level] === 1 ? 'item' : 'items'} pending
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Generate Button */}
                <div style={{ marginBottom: '32px' }}>
                  <button
                    onClick={generateDailyCounts}
                    style={{
                      width: '100%',
                      background: '#00d9ff',
                      color: '#0a0e27',
                      border: 'none',
                      padding: '20px',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      letterSpacing: '1px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 12px rgba(0, 217, 255, 0.2)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#00b8d4';
                      e.target.style.boxShadow = '0 6px 16px rgba(0, 217, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#00d9ff';
                      e.target.style.boxShadow = '0 4px 12px rgba(0, 217, 255, 0.2)';
                    }}
                  >
                    GENERATE TODAY'S COUNT SHEET
                  </button>
                </div>

                {/* Today's Counts */}
                {todaysCounts && todaysCounts.length > 0 && (
                  <div style={{
                    background: '#1a1f3a',
                    border: '1px solid #1e2749',
                    padding: '24px',
                    borderRadius: '2px',
                    marginBottom: '32px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      <CheckCircle2 size={24} style={{ color: '#00d9ff' }} />
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', letterSpacing: '0.5px' }}>
                        TODAY'S COUNT LIST ({todaysCounts.length} ITEMS)
                      </h3>
                    </div>
                    <div style={{
                      background: '#0f1435',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      borderRadius: '2px'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #1e2749', background: '#0a0e27' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#5a6677', letterSpacing: '0.5px' }}>SKU</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#5a6677', letterSpacing: '0.5px' }}>BIN</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#5a6677', letterSpacing: '0.5px' }}>LEVEL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {todaysCounts.map((sku, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #1e2749' }}>
                              <td style={{ padding: '12px', color: '#e8eef5' }}>{sku.sku}</td>
                              <td style={{ padding: '12px', color: '#a0aac0' }}>{sku.bin}</td>
                              <td style={{
                                padding: '12px',
                                color: sku.level === 'A' ? '#00d9ff' : sku.level === 'B' ? '#ffd700' : '#a0aac0',
                                fontWeight: '700'
                              }}>
                                {sku.level}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button
                      onClick={() => {
                        if (todaysCounts && todaysCounts.length > 0) {
                          downloadDailyCount(todaysCounts);
                        } else {
                          alert('No counts available to download');
                        }
                      }}
                      style={{
                        marginTop: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#1e2749',
                        color: '#00d9ff',
                        border: '1px solid #1e2749',
                        padding: '12px 20px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        letterSpacing: '0.5px'
                      }}
                    >
                      <Download size={16} /> DOWNLOAD EXCEL
                    </button>
                  </div>
                )}

                {/* Data Management */}
                <div style={{
                  background: '#1a1f3a',
                  border: '1px solid #1e2749',
                  padding: '24px',
                  borderRadius: '2px'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', letterSpacing: '0.5px' }}>
                    DATA MANAGEMENT
                  </h3>
                  <button
                    onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#2d1414',
                      color: '#ff6b6b',
                      border: '1px solid #ff6b6b',
                      padding: '12px 20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      letterSpacing: '0.5px'
                    }}
                  >
                    <Trash2 size={16} /> CLEAR ALL DATA
                  </button>
                  {showDeleteConfirm && (
                    <div style={{ marginTop: '12px', padding: '12px', background: '#0f1435', borderLeft: '3px solid #ff6b6b', color: '#ff6b6b', fontSize: '12px' }}>
                      <p style={{ margin: '0 0 8px 0' }}>This action cannot be undone.</p>
                      <button
                        onClick={clearAllData}
                        style={{ background: '#ff6b6b', color: '#0a0e27', border: 'none', padding: '8px 16px', fontWeight: '700', cursor: 'pointer', fontSize: '11px', marginRight: '8px' }}
                      >
                        CONFIRM DELETE
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        style={{ background: '#1e2749', color: '#e8eef5', border: 'none', padding: '8px 16px', fontWeight: '700', cursor: 'pointer', fontSize: '11px' }}
                      >
                        CANCEL
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'upload' && (
          <div style={{
            background: '#1a1f3a',
            border: '2px dashed #1e2749',
            padding: '48px',
            textAlign: 'center',
            borderRadius: '2px'
          }}>
            <Upload size={48} style={{ color: '#5a6677', marginBottom: '16px' }} />
            <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700' }}>UPLOAD INVENTORY FILE</h2>
            <p style={{ color: '#a0aac0', marginBottom: '32px' }}>
              Excel file with columns: SKU, Bin Location, Inventory Turn
            </p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              style={{
                display: 'none',
                cursor: 'pointer'
              }}
              id="fileInput"
            />
            <label htmlFor="fileInput" style={{
              display: 'inline-block',
              background: '#00d9ff',
              color: '#0a0e27',
              padding: '16px 32px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              letterSpacing: '1px',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0, 217, 255, 0.2)'
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#00b8d4';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 217, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#00d9ff';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 217, 255, 0.2)';
              }}
            >
              SELECT FILE
            </label>
            <p style={{ color: '#5a6677', fontSize: '12px', marginTop: '24px', marginBottom: 0 }}>
              Supported formats: .xlsx, .xls, .csv
            </p>
            {appState.skus.length > 0 && (
              <div style={{ marginTop: '32px', padding: '20px', background: '#0f1435', borderLeft: '3px solid #00d9ff' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#00d9ff', fontWeight: '700' }}>
                  ✓ Current inventory: {appState.skus.length} SKUs loaded
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#a0aac0' }}>
                  Upload a new file to update the inventory.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h2 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '700' }}>COUNT HISTORY</h2>
            {appState.generatedDates.length === 0 ? (
              <div style={{
                background: '#1a1f3a',
                border: '1px solid #1e2749',
                padding: '48px',
                textAlign: 'center',
                borderRadius: '2px'
              }}>
                <Calendar size={48} style={{ color: '#5a6677', marginBottom: '16px' }} />
                <p style={{ color: '#a0aac0' }}>No count sheets generated yet</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {appState.generatedDates.map((date, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#1a1f3a',
                      border: '1px solid #1e2749',
                      padding: '20px',
                      borderRadius: '2px'
                    }}
                  >
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#5a6677', fontWeight: '700', letterSpacing: '0.5px' }}>
                      GENERATED
                    </p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>
                      {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#a0aac0' }}>
                      {new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {appState.archivedSkus.length > 0 && (
              <div style={{ marginTop: '40px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '700' }}>ARCHIVED SKUs ({appState.archivedSkus.length})</h3>
                <div style={{
                  background: '#1a1f3a',
                  border: '1px solid #1e2749',
                  padding: '20px',
                  borderRadius: '2px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1e2749' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#5a6677', letterSpacing: '0.5px' }}>SKU</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#5a6677', letterSpacing: '0.5px' }}>BIN</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#5a6677', letterSpacing: '0.5px' }}>LEVEL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appState.archivedSkus.map((sku, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #1e2749' }}>
                          <td style={{ padding: '12px', color: '#e8eef5' }}>{sku.sku}</td>
                          <td style={{ padding: '12px', color: '#a0aac0' }}>{sku.bin}</td>
                          <td style={{ padding: '12px', color: '#a0aac0' }}>{sku.level}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
