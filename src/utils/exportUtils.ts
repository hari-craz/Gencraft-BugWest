import { LeaderboardEntry } from '../types';

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.head.appendChild(script);
  });
};

export const exportToExcel = async (data: LeaderboardEntry[]) => {
  try {
    // Load SheetJS from CDN
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const XLSX = (window as any).XLSX;

    const formattedData = data.map(entry => ({
      'Rank': entry.rank,
      'Participant Name': entry.participantName,
      'Access Code': entry.accessCode || '',
      'User ID': entry.userId,
      'College': entry.college || '',
      'Round 1 Questions Solved': entry.round1QuestionsSolved,
      'Round 1 Accuracy (%)': entry.round1Accuracy,
      'Total Time Round 1 (ms)': entry.totalTimeRound1Ms,
      'Total Final Score': entry.totalScore,
      'Status': entry.status,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedData);
    XLSX.utils.book_append_sheet(wb, ws, 'Cumulative Leaderboard');
    
    const round1Data = data.map(entry => ({
      'Rank': entry.rank,
      'Participant Name': entry.participantName,
      'Access Code': entry.accessCode || '',
      'User ID': entry.userId,
      'Q1 Time': entry.q1Time,
      'Q2 Time': entry.q2Time,
      'Q3 Time': entry.q3Time,
      'Q4 Time': entry.q4Time,
      'Q5 Time': entry.q5Time,
      'Q6 Time': entry.q6Time,
      'Q7 Time': entry.q7Time,
      'Round 1 Solved': entry.round1QuestionsSolved,
      'Round Accuracy (%)': entry.round1Accuracy,
      'Round 1 Score': entry.round1Score,
    })).sort((a, b) => Number(b['Round 1 Score']) - Number(a['Round 1 Score']))
      .map((item, idx) => ({ 'Round 1 Rank': idx + 1, ...item }));
    
    const rws = XLSX.utils.json_to_sheet(round1Data);
    XLSX.utils.book_append_sheet(wb, rws, 'Round 1 Organizer Leaderboard');

    XLSX.writeFile(wb, 'BugFest_Leaderboard.xlsx');
  } catch (error) {
    console.error('Failed to export Excel:', error);
    alert('Failed to load the Excel export library. Please check your internet connection.');
  }
};

export const exportToPDF = async (data: LeaderboardEntry[]) => {
  try {
    // Load jsPDF from CDN
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');
    
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text('GENCRAFT — BUG FEST', 14, 22);
    doc.setFontSize(12);
    doc.text('Round 1 Organizer Leaderboard', 14, 30);
    
    const head = [['Rank', 'Participant', 'User ID', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Score']];
    const body = data.map(entry => [
      entry.rank,
      entry.participantName,
      entry.userId,
      entry.q1Time || '-',
      entry.q2Time || '-',
      entry.q3Time || '-',
      entry.q4Time || '-',
      entry.q5Time || '-',
      entry.q6Time || '-',
      entry.q7Time || '-',
      entry.round1Score
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save('BugFest_Leaderboard.pdf');
  } catch (error) {
    console.error('Failed to export PDF:', error);
    alert('Failed to load the PDF export library. Please check your internet connection.');
  }
};
