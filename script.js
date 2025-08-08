// Examination Management System - Pure JavaScript

class ExaminationSystem {
    constructor() {
        this.examiners = JSON.parse(localStorage.getItem('examiners') || '[]');
        this.subjects = JSON.parse(localStorage.getItem('subjects') || '[]');
        this.calculations = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateExaminerSelect();
        this.updateSubjectsList();
        this.updateReport();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Forms
        document.getElementById('examinerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExaminer(e.target);
        });

        document.getElementById('subjectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSubject(e.target);
        });

        // Global tab switching function
        window.switchTab = (tab) => this.switchTab(tab);
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        // Update data when switching to specific tabs
        if (tabName === 'calculate') {
            this.updateExaminerSelect();
            this.updateSubjectsList();
        } else if (tabName === 'report') {
            this.updateReport();
        }
    }

    addExaminer(form) {
        const formData = new FormData(form);
        const examinerData = {};
        
        // Validate all fields
        let isValid = true;
        for (let [key, value] of formData.entries()) {
            if (!value.trim()) {
                isValid = false;
                break;
            }
            examinerData[key] = value.trim();
        }

        if (!isValid) {
            this.showToast('Please fill all required fields', 'error');
            return;
        }

        // Add examiner
        const newExaminer = {
            id: Date.now(),
            ...examinerData,
            remunerations: [],
            createdAt: new Date().toISOString()
        };

        this.examiners.push(newExaminer);
        localStorage.setItem('examiners', JSON.stringify(this.examiners));

        // Save pattern data separately
        const patternData = {
            id: Date.now(),
            pattern: examinerData.pattern,
            class: examinerData.class,
            subject: examinerData.subject,
            sem: examinerData.sem
        };

        const patterns = JSON.parse(localStorage.getItem('patterns') || '[]');
        patterns.push(patternData);
        localStorage.setItem('patterns', JSON.stringify(patterns));

        this.showToast('Examiner details added successfully', 'success');
        form.reset();
        this.updateExaminerSelect();
    }

    addSubject(form) {
        const formData = new FormData(form);
        const subjectData = {};
        
        // Validate all fields
        let isValid = true;
        for (let [key, value] of formData.entries()) {
            if (!value.trim()) {
                isValid = false;
                break;
            }
            if (key === 'examDuration' || key === 'baseRemuneration') {
                subjectData[key] = parseInt(value) || 0;
            } else {
                subjectData[key] = value.trim();
            }
        }

        if (!isValid || subjectData.examDuration <= 0 || subjectData.baseRemuneration <= 0) {
            this.showToast('Please fill all subject fields with valid values', 'error');
            return;
        }

        // Add subject
        const newSubject = {
            id: Date.now(),
            ...subjectData
        };

        this.subjects.push(newSubject);
        localStorage.setItem('subjects', JSON.stringify(this.subjects));

        this.showToast('Subject added successfully', 'success');
        form.reset();
        this.updateSubjectsList();
    }

    updateExaminerSelect() {
        const select = document.getElementById('examinerSelect');
        select.innerHTML = '<option value="">Select an examiner</option>';
        
        this.examiners.forEach(examiner => {
            const option = document.createElement('option');
            option.value = examiner.id;
            option.textContent = `${examiner.paperSetter} - ${examiner.subject}`;
            select.appendChild(option);
        });
    }

    updateSubjectsList() {
        const container = document.getElementById('subjectsContainer');
        
        if (this.subjects.length === 0) {
            container.innerHTML = '<p class="no-data">No subjects available. Please add subjects first.</p>';
            return;
        }

        container.innerHTML = '';
        this.subjects.forEach(subject => {
            const subjectDiv = document.createElement('div');
            subjectDiv.className = 'subject-item';
            subjectDiv.innerHTML = `
                <div class="subject-info">
                    <h4>${subject.subjectCode} - ${subject.subjectTitle}</h4>
                    <p>Set ${subject.set} | Duration: ${subject.examDuration} min | Base: ₹${subject.baseRemuneration}</p>
                </div>
                <button class="btn btn-primary" onclick="examinationSystem.calculateRemuneration(${subject.id})" 
                        ${!document.getElementById('examinerSelect').value ? 'disabled' : ''}>
                    Calculate
                </button>
            `;
            container.appendChild(subjectDiv);
        });

        // Update button states when examiner selection changes
        document.getElementById('examinerSelect').addEventListener('change', () => {
            this.updateSubjectsList();
        });
    }

    calculateRemuneration(subjectId) {
        const selectedExaminerId = document.getElementById('examinerSelect').value;
        
        if (!selectedExaminerId) {
            this.showToast('Please select an examiner first', 'error');
            return;
        }

        const subject = this.subjects.find(s => s.id === subjectId);
        if (!subject) return;

        // Calculate multiplier based on exam duration
        let multiplier = 1;
        const duration = subject.examDuration;
        if (duration >= 180) multiplier = 1.5; // 3+ hours
        else if (duration >= 120) multiplier = 1.3; // 2-3 hours
        else if (duration >= 60) multiplier = 1.1; // 1-2 hours

        const totalRemuneration = Math.round(subject.baseRemuneration * multiplier);

        const calculation = {
            examinerId: selectedExaminerId,
            subjectCode: subject.subjectCode,
            subjectTitle: subject.subjectTitle,
            set: subject.set,
            examDuration: subject.examDuration,
            baseRemuneration: subject.baseRemuneration,
            multiplier,
            totalRemuneration
        };

        this.calculations.push(calculation);

        // Update examiner's remuneration in localStorage
        const examinerIndex = this.examiners.findIndex(e => e.id.toString() === selectedExaminerId);
        if (examinerIndex !== -1) {
            this.examiners[examinerIndex].remunerations = this.examiners[examinerIndex].remunerations || [];
            this.examiners[examinerIndex].remunerations.push(calculation);
            localStorage.setItem('examiners', JSON.stringify(this.examiners));
        }

        this.showToast(`Remuneration calculated: ₹${totalRemuneration}`, 'success');
        this.updateCalculationsList();
    }

    updateCalculationsList() {
        const container = document.getElementById('calculationsContainer');
        const listDiv = document.getElementById('calculationsList');
        
        if (this.calculations.length === 0) {
            listDiv.style.display = 'none';
            return;
        }

        listDiv.style.display = 'block';
        container.innerHTML = '';
        
        this.calculations.forEach(calc => {
            const calcDiv = document.createElement('div');
            calcDiv.className = 'calculation-item';
            calcDiv.innerHTML = `
                <span>${calc.subjectCode} - Set ${calc.set}</span>
                <span class="calculation-amount">₹${calc.totalRemuneration}</span>
            `;
            container.appendChild(calcDiv);
        });
    }

    updateReport() {
        const container = document.getElementById('reportContent');
        
        if (this.examiners.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-file-text"></i>
                    <p>No examiner data available. Please add examiners first.</p>
                </div>
            `;
            return;
        }

        let totalSystemRemuneration = 0;
        let reportHTML = `
            <div class="report-summary">
                <h3>Examiner Details & Remuneration Summary</h3>
                <div class="report-table-container">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Examiner Details</th>
                                <th>Academic Info</th>
                                <th>Contact Details</th>
                                <th>Bank Details</th>
                                <th>Total Remuneration</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        this.examiners.forEach(examiner => {
            const totalRemuneration = (examiner.remunerations || [])
                .reduce((sum, rem) => sum + rem.totalRemuneration, 0);
            totalSystemRemuneration += totalRemuneration;

            const remunerationDetails = (examiner.remunerations || [])
                .map(rem => `${rem.subjectCode} (Set ${rem.set}): ₹${rem.totalRemuneration}`)
                .join('<br>');

            reportHTML += `
                <tr>
                    <td>
                        <strong>Chairman:</strong> ${examiner.panelChairman}<br>
                        <strong>Paper Setter:</strong> ${examiner.paperSetter}
                    </td>
                    <td>
                        <strong>Pattern:</strong> ${examiner.pattern}<br>
                        <strong>Class:</strong> ${examiner.class}<br>
                        <strong>Subject:</strong> ${examiner.subject}<br>
                        <strong>Semester:</strong> ${examiner.sem}
                    </td>
                    <td>
                        <strong>Email:</strong> ${examiner.mailId}<br>
                        <strong>Contact:</strong> ${examiner.contactNumber}
                    </td>
                    <td>
                        <strong>Account:</strong> ${examiner.bankAccountNo}<br>
                        <strong>IFSC:</strong> ${examiner.ifsc}
                    </td>
                    <td class="total-remuneration">
                        ₹${totalRemuneration}<br>
                        <small style="font-weight: normal; color: var(--muted-foreground);">
                            ${remunerationDetails || 'No calculations yet'}
                        </small>
                    </td>
                </tr>
            `;
        });

        reportHTML += `
                        </tbody>
                        <tfoot>
                            <tr style="background: var(--primary); color: var(--primary-foreground); font-weight: bold;">
                                <td colspan="4" style="text-align: right; padding-right: 1rem;">
                                    <strong>Total System Remuneration:</strong>
                                </td>
                                <td class="total-remuneration" style="color: var(--primary-foreground);">
                                    ₹${totalSystemRemuneration}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = reportHTML;
    }

    exportToCSV() {
        if (this.examiners.length === 0) {
            this.showToast('No examiner data available to export', 'error');
            return;
        }

        const csvHeaders = [
            'Panel Chairman',
            'Paper Setter', 
            'Pattern',
            'Class',
            'Subject',
            'Semester',
            'Email ID',
            'Contact Number',
            'Bank Account No',
            'IFSC Code',
            'Total Remuneration',
            'Remuneration Details'
        ];

        let csvContent = csvHeaders.join(',') + '\n';

        this.examiners.forEach(examiner => {
            const totalRemuneration = (examiner.remunerations || [])
                .reduce((sum, rem) => sum + rem.totalRemuneration, 0);
            
            const remunerationDetails = (examiner.remunerations || [])
                .map(rem => `${rem.subjectCode} (Set ${rem.set}): ₹${rem.totalRemuneration}`)
                .join('; ');

            const row = [
                examiner.panelChairman,
                examiner.paperSetter,
                examiner.pattern,
                examiner.class,
                examiner.subject,
                examiner.sem,
                examiner.mailId,
                examiner.contactNumber,
                examiner.bankAccountNo,
                examiner.ifsc,
                totalRemuneration,
                remunerationDetails || 'No calculations yet'
            ].map(field => `"${field}"`).join(',');

            csvContent += row + '\n';
        });

        // Calculate total system remuneration
        const totalSystemRemuneration = this.examiners
            .reduce((sum, examiner) => {
                return sum + (examiner.remunerations || [])
                    .reduce((examinerSum, rem) => examinerSum + rem.totalRemuneration, 0);
            }, 0);

        csvContent += '\n';
        csvContent += `"Total System Remuneration","","","","","","","","","","${totalSystemRemuneration}",""\n`;

        // Create and download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `remuneration_summary_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showToast('CSV file downloaded successfully', 'success');
    }

    printReport() {
        if (this.examiners.length === 0) {
            this.showToast('No examiner data available to print', 'error');
            return;
        }

        const printWindow = window.open('', '_blank');
        const reportContent = document.getElementById('reportContent').innerHTML;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Remuneration Summary Report</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 20px; 
                        color: #333;
                    }
                    h1 { 
                        text-align: center; 
                        color: #2563eb;
                        margin-bottom: 30px;
                    }
                    .report-table-container {
                        overflow-x: auto;
                        border-radius: 8px;
                        border: 1px solid #e5e7eb;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 20px 0;
                    }
                    th, td { 
                        padding: 12px; 
                        text-align: left; 
                        border-bottom: 1px solid #e5e7eb; 
                        font-size: 12px;
                    }
                    th { 
                        background-color: #f3f4f6; 
                        font-weight: 600; 
                    }
                    tr:hover { 
                        background-color: #f8fafc; 
                    }
                    .total-remuneration { 
                        background-color: #dcfce7; 
                        color: #166534; 
                        font-weight: 600; 
                    }
                    tfoot tr { 
                        background-color: #2563eb !important; 
                        color: white !important; 
                        font-weight: bold; 
                    }
                    tfoot td { 
                        color: white !important; 
                    }
                    .print-header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #2563eb;
                    }
                    .print-date {
                        text-align: right;
                        font-size: 12px;
                        color: #666;
                        margin-bottom: 20px;
                    }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h1>Examination Management System</h1>
                    <h2>Remuneration Summary Report</h2>
                </div>
                <div class="print-date">
                    Generated on: ${new Date().toLocaleDateString('en-IN', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </div>
                ${reportContent}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        // Wait for content to load before printing
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);

        this.showToast('Print dialog opened', 'success');
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize the system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.examinationSystem = new ExaminationSystem();
});