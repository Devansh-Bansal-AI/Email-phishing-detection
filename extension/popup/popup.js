// Full PhishShield extension app logic class
// Handles toggle, tabs, scanning, scanning history, stats, UI updates
class PhishShield {
  constructor() {
    this.isOn = false;
    this.settings = {
      autoScan: false,                      // Could extend UI to toggle this
      detailedAnalysis: true,
      notifications: true,
      soundAlert: false,
      model: 'random_forest',
      confidenceThreshold: 75,
    };
    this.scanHistory = [];
    this.currentTab = 'scan';

    // Cache DOM refs
    this.initElements();
    this.initEventListeners();

    // Initialization
    this.loadSettings();
    this.loadHistory();
    this.updateStats();
    this.renderHistory();
    this.applyInitialToggleState();
    this.switchTab(this.currentTab);
  }

  initElements() {
    this.toggle = document.getElementById('toggleSwitch');
    this.statusDiv = document.getElementById('status');
    this.statusIndicator = document.getElementById('statusIndicator');
    this.statusText = document.getElementById('statusText');
    this.lastScanTime = document.getElementById('lastScanTime');

    this.scanTab = document.getElementById('scanTab');
    this.historyTab = document.getElementById('historyTab');
    this.statsTab = document.getElementById('statsTab');
    this.scanContent = document.getElementById('scanContent');
    this.historyContent = document.getElementById('historyContent');
    this.statsContent = document.getElementById('statsContent');

    this.loadingDiv = document.getElementById('loading');
    this.errorDiv = document.getElementById('error');
    this.errorMessage = document.getElementById('errorMessage');
    this.retryBtn = document.getElementById('retryBtn');
    this.resultDiv = document.getElementById('result');
    this.resultText = document.getElementById('resultText');
    this.confidenceBadge = document.getElementById('confidenceBadge');
    this.indicatorsDiv = document.getElementById('indicators');
    this.detailsToggle = document.getElementById('detailsToggle');
    this.detailsContent = document.getElementById('detailsContent');
    this.subjectAnalysis = document.getElementById('subjectAnalysis');
    this.bodyAnalysis = document.getElementById('bodyAnalysis');
    this.urlAnalysis = document.getElementById('urlAnalysis');
    this.analyzeBtn = document.getElementById('analyzeBtn');
    this.initialAnalyzeBtn = document.getElementById('initialAnalyzeBtn');
    this.reportBtn = document.getElementById('reportBtn');
    this.initialState = document.getElementById('initialState');

    this.historyList = document.getElementById('historyList');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtn');

    this.totalScans = document.getElementById('totalScans');
    this.phishingDetected = document.getElementById('phishingDetected');
    this.detectionRateBar = document.getElementById('detectionRateBar');
    this.detectionRateText = document.getElementById('detectionRateText');
    this.recentActivity = document.getElementById('recentActivity');
  }

  initEventListeners() {
    // Toggle switch
    this.toggle.addEventListener('change', () => this.toggleExtension());

    // Tabs
    this.scanTab.addEventListener('click', () => this.switchTab('scan'));
    this.historyTab.addEventListener('click', () => this.switchTab('history'));
    this.statsTab.addEventListener('click', () => this.switchTab('stats'));

    // Scan button(s)
    this.analyzeBtn.addEventListener('click', () => this.analyzeEmail());
    this.initialAnalyzeBtn.addEventListener('click', () => this.analyzeEmail());
    this.retryBtn.addEventListener('click', () => this.analyzeEmail());

    // Report button
    this.reportBtn.addEventListener('click', () => this.reportFalsePositive());

    // Details accordion toggle
    this.detailsToggle.addEventListener('click', () => {
      const expanded = this.detailsToggle.getAttribute('aria-expanded') === 'true';
      this.detailsToggle.setAttribute('aria-expanded', !expanded);
      this.detailsContent.classList.toggle('hidden');
      this.detailsToggle.querySelector('svg').classList.toggle('rotate-180');
    });

    // Clear history button
    this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
  }

  applyInitialToggleState() {
    // Restore toggle from saved settings or default off
    this.toggle.checked = this.isOn;
    this.updateToggleStyles();
    this.updateStatus();
    this.analyzeBtn.disabled = !this.isOn;
    this.initialAnalyzeBtn.disabled = !this.isOn;
  }

  toggleExtension() {
    this.isOn = this.toggle.checked;
    this.updateToggleStyles();
    this.updateStatus();
    this.analyzeBtn.disabled = !this.isOn;
    this.initialAnalyzeBtn.disabled = !this.isOn;

    if (this.isOn) {
      if (this.settings.autoScan) {
        this.analyzeEmail();
      } else {
        this.showInitialState();
      }
    } else {
      this.showInitialState();
    }

    this.saveSettings();
  }

  updateToggleStyles() {
    const track = this.toggle.parentElement.querySelector('.toggle-track');
    if (this.toggle.checked) {
      track.classList.remove('toggle-bg-off');
      track.classList.add('toggle-bg-on');
    } else {
      track.classList.add('toggle-bg-off');
      track.classList.remove('toggle-bg-on');
    }
  }

  updateStatus() {
    const status = this.isOn ? "ON" : "OFF";
    this.statusText.textContent = status;
    this.statusIndicator.className = `status-dot ${this.isOn ? "bg-green-500 pulse" : "bg-red-500"}`;
  }

  switchTab(tab) {
    this.currentTab = tab;

    // Update tab buttons
    [this.scanTab, this.historyTab, this.statsTab].forEach(t => t.classList.remove('tab-active'));
    document.getElementById(`${tab}Tab`).classList.add('tab-active');

    // Update content visibility
    [this.scanContent, this.historyContent, this.statsContent].forEach(c => c.classList.add('hidden'));
    document.getElementById(`${tab}Content`).classList.remove('hidden');

    if (tab === 'stats') {
      this.updateStats();
    }
  }

  showLoading() {
    this.initialState.classList.add('hidden');
    this.errorDiv.classList.add('hidden');
    this.resultDiv.classList.add('hidden');
    this.loadingDiv.classList.remove('hidden');
  }

  showError(message) {
    this.errorMessage.textContent = message;
    this.loadingDiv.classList.add('hidden');
    this.resultDiv.classList.add('hidden');
    this.errorDiv.classList.remove('hidden');
    this.initialState.classList.add('hidden');
  }

  showInitialState() {
    this.loadingDiv.classList.add('hidden');
    this.errorDiv.classList.add('hidden');
    this.resultDiv.classList.add('hidden');
    this.initialState.classList.remove('hidden');
  }

  async analyzeEmail() {
    if (!this.isOn) return;

    this.showLoading();

    try {
      const emailData = await this.getEmailData();

      // Real backend API call should replace callDetectionAPI in production
      const response = await this.callDetectionAPI(emailData);

      this.processResults(response, emailData);
      this.addToHistory(response, emailData);
      this.renderHistory();
      this.updateStats();

    } catch (error) {
      console.error('Analysis error:', error);
      this.showError(error.message || "Failed to analyze email. Please try again.");
    }
  }

  async getEmailData() {
    // This should extract the content from current email in the tab.
    // For simulation, we randomly generate sample emails.
    const mockSubjects = [
      "Urgent: Your account has been compromised",
      "Important security alert",
      "Invoice #INV-2023-456",
      "Your subscription is expiring soon",
      "Action required: Verify your identity",
      "Meeting request for next week",
      "Your package has been delivered"
    ];

    const mockBodies = [
      "Dear customer, we've detected suspicious activity on your account. Please click the link below to verify your identity and secure your account.",
      "Hello, please find attached the invoice for your recent purchase. Let us know if you have any questions.",
      "Your subscription will renew automatically on 2023-12-31. Click here to manage your subscription preferences.",
      "We're writing to inform you that your package has been delivered. Please find the delivery confirmation attached.",
      "Your password was recently changed. If this wasn't you, please secure your account immediately by following these steps.",
      "Please confirm your attendance at the upcoming meeting by clicking the link below. We look forward to seeing you there."
    ];

    const mockUrls = [
      "https://secure-login.example.com/verify",
      "https://myaccount.example.com/invoices/INV-2023-456",
      "https://service.example.com/subscription",
      "https://tracking.example.com/package/123456",
      "https://support.example.com/security",
      "https://meetings.example.com/confirm/123456"
    ];

    const randomIndex = Math.floor(Math.random() * mockSubjects.length);
    const isPhishing = Math.random() > 0.5;

    return {
      subject: mockSubjects[randomIndex],
      body: mockBodies[randomIndex],
      urls: [mockUrls[randomIndex]],
      sender: isPhishing ? "security@example-support.com" : "noreply@trusted-company.com",
      timestamp: new Date().toISOString(),
      isPhishing: isPhishing
    };
  }

  async callDetectionAPI(emailData) {
    // Simulate API call with random delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

    // Simulate detection with some randomness
    const isPhishing = emailData.isPhishing;
    const confidence = Math.floor(60 + Math.random() * 35); // 60-95% confidence

    // Generate indicators based on content
    const indicators = [];
    
    if (emailData.subject.toLowerCase().includes('urgent')) {
      indicators.push({
        text: "Subject creates false urgency",
        risk: "high"
      });
    }
    
    if (emailData.body.includes('click the link below')) {
      indicators.push({
        text: "Generic greeting with call to action",
        risk: "medium"
      });
    }
    
    if (emailData.sender.includes('example-support.com')) {
      indicators.push({
        text: "Suspicious sender address",
        risk: "high"
      });
    }
    
    if (emailData.urls.some(url => !url.includes('trusted-company.com'))) {
      indicators.push({
        text: "Links to unfamiliar domains",
        risk: "high"
      });
    }

    return {
      is_phishing: isPhishing,
      confidence: confidence,
      indicators: indicators,
      details: {
        subject: isPhishing ? 
          "Subject creates false urgency to prompt hasty action" : 
          "Subject appears legitimate and relevant to sender",
        body: isPhishing ? 
          "Body uses generic greeting and creates sense of urgency with request for immediate action" : 
          "Body content is appropriate for the sender and context",
        urls: isPhishing ? 
          "Links point to domains that don't match the purported sender" : 
          "All links point to legitimate domains associated with the sender"
      }
    };
  }

  processResults(results, emailData) {
    this.loadingDiv.classList.add('hidden');
    this.resultDiv.classList.remove('hidden');

    const isPhishing = results.is_phishing;
    const confidence = results.confidence;

    // Update result text and confidence badge
    if (isPhishing) {
      this.resultText.textContent = "This email shows signs of phishing. Be cautious about any links or attachments.";
      this.confidenceBadge.textContent = `${confidence}% confident`;
      this.confidenceBadge.className = "confidence-badge risk-high";
    } else {
      this.resultText.textContent = "This email appears to be legitimate. No significant phishing indicators detected.";
      this.confidenceBadge.textContent = `${confidence}% confident`;
      this.confidenceBadge.className = "confidence-badge risk-low";
    }

    // Update indicators
    this.indicatorsDiv.innerHTML = '';
    if (results.indicators && results.indicators.length > 0) {
      results.indicators.forEach(indicator => {
        const indicatorEl = document.createElement('div');
        
        let icon = '';
        if (indicator.risk === 'high') {
          icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>`;
        } else if (indicator.risk === 'medium') {
          icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>`;
        } else {
          icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>`;
        }
        
        indicatorEl.innerHTML = `${icon} ${indicator.text}`;
        this.indicatorsDiv.appendChild(indicatorEl);
      });
    } else {
      const noIndicators = document.createElement('div');
      noIndicators.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg> No significant phishing indicators detected`;
      this.indicatorsDiv.appendChild(noIndicators);
    }

    // Update details
    this.subjectAnalysis.textContent = results.details.subject;
    this.bodyAnalysis.textContent = results.details.body;
    this.urlAnalysis.textContent = results.details.urls;

    // Update last scan time
    this.lastScanTime.textContent = `Last scan: ${new Date().toLocaleTimeString()}`;
  }

  addToHistory(results, emailData) {
    const historyItem = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      subject: emailData.subject,
      isPhishing: results.is_phishing,
      confidence: results.confidence,
      sender: emailData.sender
    };

    this.scanHistory.unshift(historyItem);
    
    // Keep only last 50 scans
    if (this.scanHistory.length > 50) {
      this.scanHistory.pop();
    }

    this.saveHistory();
  }

  renderHistory() {
    if (this.scanHistory.length === 0) {
      this.historyList.innerHTML = `
        <div class="empty-history">
          <svg xmlns="http://www.w3.org/2000/svg" class="empty-history-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No scan history yet</p>
        </div>
      `;
      return;
    }

    this.historyList.innerHTML = '';
    this.scanHistory.forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item slide-in';
      historyItem.tabIndex = 0;
      
      const riskClass = item.isPhishing ? 
        (item.confidence > 80 ? 'risk-high' : 'risk-medium') : 
        'risk-low';
        
      const riskText = item.isPhishing ? 
        (item.confidence > 80 ? 'High risk' : 'Medium risk') : 
        'Low risk';

      historyItem.innerHTML = `
        <div>
          <h4>${this.truncateText(item.subject, 30)}</h4>
          <span class="${riskClass}">${riskText}</span>
        </div>
        <p class="text-sm text-gray-600">From: ${item.sender}</p>
        <div>
          <span class="${riskClass}">${item.confidence}% confidence</span>
          <span>${this.formatTimeAgo(item.timestamp)}</span>
        </div>
      `;

      historyItem.addEventListener('click', () => {
        // In a real extension, this might show more details about the scan
        this.switchTab('scan');
      });

      this.historyList.appendChild(historyItem);
    });
  }

  clearHistory() {
    if (confirm("Are you sure you want to clear all scan history?")) {
      this.scanHistory = [];
      this.saveHistory();
      this.renderHistory();
      this.updateStats();
    }
  }

  updateStats() {
    const total = this.scanHistory.length;
    const phishingCount = this.scanHistory.filter(item => item.isPhishing).length;
    const detectionRate = total > 0 ? Math.round((phishingCount / total) * 100) : 0;

    this.totalScans.textContent = total;
    this.phishingDetected.textContent = phishingCount;
    this.detectionRateBar.style.width = `${detectionRate}%`;
    this.detectionRateText.textContent = `${detectionRate}% of scans detected phishing`;

    // Update recent activity
    this.recentActivity.innerHTML = '';
    const recentItems = this.scanHistory.slice(0, 5);
    
    if (recentItems.length === 0) {
      this.recentActivity.innerHTML = '<p class="text-sm text-gray-500">No recent activity</p>';
      return;
    }

    recentItems.forEach(item => {
      const activityItem = document.createElement('div');
      const icon = item.isPhishing ? 
        '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>' :
        '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>';
      
      activityItem.innerHTML = `
        <div class="flex items-center">
          ${icon}
          <span class="truncate flex-1">${this.truncateText(item.subject, 25)}</span>
          <span class="text-xs text-gray-500 ml-2">${this.formatTimeAgo(item.timestamp)}</span>
        </div>
      `;
      
      this.recentActivity.appendChild(activityItem);
    });
  }

  reportFalsePositive() {
    alert("Thank you for reporting! This helps improve our detection algorithms.");
    // In a real extension, this would send the report to a backend service
  }

  // Utility methods
  truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  formatTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  // Storage methods
  saveSettings() {
    const settings = {
      isOn: this.isOn,
      settings: this.settings
    };
    localStorage.setItem('phishShieldSettings', JSON.stringify(settings));
  }

  loadSettings() {
    const saved = localStorage.getItem('phishShieldSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.isOn = settings.isOn;
        this.settings = { ...this.settings, ...settings.settings };
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
  }

  saveHistory() {
    localStorage.setItem('phishShieldHistory', JSON.stringify(this.scanHistory));
  }

  loadHistory() {
    const saved = localStorage.getItem('phishShieldHistory');
    if (saved) {
      try {
        this.scanHistory = JSON.parse(saved);
      } catch (e) {
        console.error('Error loading history:', e);
        this.scanHistory = [];
      }
    }
  }
}

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.phishShield = new PhishShield();
});