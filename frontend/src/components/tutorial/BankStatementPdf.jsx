/**
 * @file BankStatementPdf.jsx
 * @description Renders a mock bank statement PDF used in the interactive tutorial.
 * Accepts a highlights array to visually emphasize specific text segments
 * that match OCR pattern examples during the guided walkthrough.
 */

import React from 'react';

export default function BankStatementPdf({ highlights = [] }) {
  const hl = (text) => {
    if (highlights.some(h => text.includes(h))) {
      return { backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '2px', padding: '0 2px' };
    }
    return {};
  };

  return (
    <div style={{
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      lineHeight: '1.5',
      padding: '32px 40px',
      color: '#1a1a1a',
      backgroundColor: '#fff',
      minHeight: '100%',
      maxWidth: '800px'
    }}>
      <div style={{ textAlign: 'right', marginBottom: '4px', fontSize: '10px', color: '#666' }}>
        <span style={hl('Account Number')}>Account Number: 1111111</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#003087', marginBottom: '4px' }}>
            <span style={hl('Statement')}>Statement</span>
          </div>
          <div style={{ fontSize: '11px', color: '#003087', fontWeight: 'bold' }}>SELECT ACCOUNT</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '10px' }}>
          <div style={hl('Sort Code')}>Sort Code: 16-10-00</div>
          <div>BIC: RBOSGB2L</div>
          <div>IBAN: GB11RBOS 1610 0011 1111 11</div>
        </div>
      </div>

      <div style={{ textAlign: 'right', marginBottom: '16px', fontSize: '11px' }}>
        <div style={{ fontWeight: 'bold' }}>MR TEST TESTER</div>
        <div>CURRENT ACCOUNT</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px', fontSize: '10px', borderTop: '2px solid #003087', borderBottom: '1px solid #ccc', padding: '8px 0' }}>
        <div>
          <div style={{ fontWeight: 'bold', color: '#003087' }}>Branch Details</div>
          <div>ANY BRACH</div>
          <div>ANY STREET</div>
          <div>ANY TOWN</div>
          <div>AN1 TWN</div>
        </div>
        <div>
          <div style={{ fontWeight: 'bold', color: '#003087' }}>Your Details</div>
          <div>MR T TESTER</div>
          <div>1 TEST STREET</div>
          <div>TEST TOWN</div>
          <div>TE5 7ER</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div><span style={{ fontWeight: 'bold', color: '#003087' }}>Period</span> 22 Oct 2014 to 21 Dec 2014</div>
          <div><span style={hl('Balance')}>Previous Balance</span> £1803.90</div>
          <div><span style={hl('Paid Out')}>Paid Out</span> £2,684.10</div>
          <div><span style={hl('Paid In')}>Paid In</span> £2,180.40</div>
          <div style={{ fontWeight: 'bold', marginTop: '4px' }}>New <span style={hl('Balance')}>Balance</span> £300.20</div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #003087', fontWeight: 'bold', color: '#003087' }}>
            <td style={{ padding: '4px 6px', width: '80px' }}>Date</td>
            <td style={{ padding: '4px 6px', width: '110px' }}>Type</td>
            <td style={{ padding: '4px 6px' }}>Description</td>
            <td style={{ padding: '4px 6px', textAlign: 'right', width: '80px' }}><span style={hl('Paid In')}>Paid In</span></td>
            <td style={{ padding: '4px 6px', textAlign: 'right', width: '80px' }}><span style={hl('Paid Out')}>Paid Out</span></td>
            <td style={{ padding: '4px 6px', textAlign: 'right', width: '80px' }}><span style={hl('Balance')}>Balance</span></td>
          </tr>
        </thead>
        <tbody>
          {[
            { desc: 'BRIGHT FORWARD', bal: '1803.90' },
            { date: '22 Oct 2014', type: 'AUTOMATED PAY IN', desc: '650274051211-CHB', out: '190.40', bal: '1803.9' },
            { date: '22 Oct 2014', type: 'DIGITAL BANKING', desc: 'CALL REF. NO. 3442, FROM A/C 22222222', out: '140.00', bal: '1613.5' },
            { date: '24 Oct 2014', type: 'Faster Payment', desc: 'Amazon', out: '132.30', bal: '1473.5' },
            { date: '24 Oct 2014', type: 'BACS', desc: 'Tebay Trading Co.', out: '515.22', bal: '1341.2' },
            { date: '25 Oct 2014', type: 'Faster Payment', desc: 'Morrisons Petrol', out: '80.00', bal: '825.98' },
            { date: '25 Oct 2014', type: 'BACS', desc: 'Business Loan', inn: '20,000.00', bal: '745.98' },
            { date: '26 Oct 2014', type: 'BACS', desc: 'James White Media', out: '2,461.55', bal: '20745.98' },
            { date: '27 Oct 2014', type: 'Faster Payment', desc: 'ATM High Street', out: '100.00', bal: '18284.43' },
            { date: '01 Nov 2014', type: 'BACS', desc: 'Acorn Advertising Studies', out: '150.00', bal: '18184.43' },
            { date: '01 Nov 2014', type: 'BACS', desc: 'Marriott Hotel', out: '177.00', bal: '18034.43' },
            { date: '01 Nov 2014', type: 'Faster Payment', desc: 'Abellio Scotrail Ltd', out: '122.22', bal: '17857.43' },
            { date: '01 Nov 2014', type: 'CHQ', desc: 'Cheque 0000234', out: '1,200.00', bal: '17735.21' },
            { date: '01 Dec 2014', type: 'Int. Bank', desc: 'Interest Paid', inn: '9.33', bal: '16535.21' },
            { date: '01 Dec 2014', type: 'DD', desc: 'OVO Energy', out: '2470.00', bal: '16544.54' },
            { date: '21 Dec 2014', type: 'BACS', desc: 'Various Payment', out: '10,526.40', bal: '14074.54' },
            { date: '21 Dec 2014', type: 'BACS', desc: 'HMRC', out: '1,000.00', bal: '3548.14' },
            { date: '21 Dec 2014', type: 'DD', desc: 'DVLA', out: '280.00', bal: '2548.14' },
          ].map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #e5e5e5' }}>
              <td style={{ padding: '3px 6px', fontSize: '9.5px' }}>{row.date || ''}</td>
              <td style={{ padding: '3px 6px', fontSize: '9.5px' }}>{row.type || ''}</td>
              <td style={{ padding: '3px 6px', fontSize: '9.5px' }}>{row.desc}</td>
              <td style={{ padding: '3px 6px', textAlign: 'right', fontSize: '9.5px' }}>{row.inn || ''}</td>
              <td style={{ padding: '3px 6px', textAlign: 'right', fontSize: '9.5px' }}>{row.out || ''}</td>
              <td style={{ padding: '3px 6px', textAlign: 'right', fontSize: '9.5px' }}>{row.bal || ''}</td>
            </tr>
          ))}
          <tr>
            <td colSpan="6" style={{ padding: '3px 6px', fontSize: '9.5px' }}>Balance Received Forward</td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: '24px', fontSize: '8px', color: '#888', borderTop: '1px solid #ccc', paddingTop: '8px' }}>
        Royal Bank of Scotland Plc. Registered Office, The Mound, Edinburgh EH1 1YZ. Registered in Scotland number SC327000<br />
        Authorized by the Prudential Regulation Authority and regulated by the Financial Conduct and the Prudential Regulation authority.
      </div>
    </div>
  );
}
