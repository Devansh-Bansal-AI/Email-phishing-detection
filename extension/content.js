// Extracts email content from the page
function extractEmailContent() {
  // Gmail extraction
  if (window.location.hostname === 'mail.google.com') {
    // Try multiple selectors for subject
    const subjectSelectors = [
      'h2[data-thread-perm-id]',
      'h2.hP',
      '[data-tooltip*="Subject"]',
      'div.ha h2'
    ];
    
    let subject = '';
    for (const selector of subjectSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        subject = element.innerText.trim();
        break;
      }
    }
    
    // Try multiple selectors for body
    const bodySelectors = [
      '.ii.gt',
      '.a3s.aiL',
      'div[role="listitem"] div.nH',
      'div[dir="ltr"]'
    ];
    
    let body = '';
    for (const selector of bodySelectors) {
      const element = document.querySelector(selector);
      if (element) {
        body = element.innerText.trim();
        break;
      }
    }
    
    // Try multiple selectors for sender
    const senderSelectors = [
      '.gD[email]',
      '[email]',
      'span[email]',
      '.go'
    ];
    
    let sender = '';
    for (const selector of senderSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        sender = element.getAttribute('email') || element.innerText.trim();
        break;
      }
    }
    
    // Extract URLs from the email
    const urlElements = document.querySelectorAll('a[href]');
    const urls = Array.from(urlElements).map(a => a.href).join(', ');
    
    return {
      subject: subject,
      body: body,
      sender: sender,
      urls: urls,
      isGmail: true
    };
  }
  
  // Outlook extraction
  if (window.location.hostname.includes('outlook.office.com') || 
      window.location.hostname.includes('outlook.live.com')) {
    const subject = document.querySelector('[aria-label="Message subject"]')?.innerText || 
                   document.querySelector('.x_threadSubject')?.innerText ||
                   document.querySelector('h1')?.innerText || '';
    
    const body = document.querySelector('[aria-label="Message body"]')?.innerText || 
                document.querySelector('.x_messageContent')?.innerText ||
                '';
                
    const sender = document.querySelector('[aria-label^="From:"]')?.innerText || 
                  document.querySelector('.x_sender')?.innerText || '';
    
    const urlElements = document.querySelectorAll('a[href]');
    const urls = Array.from(urlElements).map(a => a.href).join(', ');
    
    return {
      subject: subject,
      body: body,
      sender: sender,
      urls: urls,
      isOutlook: true
    };
  }
  
  // Generic email page detection
  const emailIndicators = [
    'mail', 'email', 'message', 'inbox', 'subject', 'from', 'to'
  ];
  
  const pageText = document.body.innerText.toLowerCase();
  const isLikelyEmail = emailIndicators.some(indicator => pageText.includes(indicator));
  
  if (isLikelyEmail) {
    // Try to extract common email elements
    const subject = document.querySelector('h1, h2, .subject, [class*="subject"]')?.innerText || '';
    const body = document.querySelector('body').innerText;
    const urlElements = document.querySelectorAll('a[href]');
    const urls = Array.from(urlElements).map(a => a.href).join(', ');
    
    return {
      subject: subject,
      body: body,
      sender: '',
      urls: urls,
      isGeneric: true
    };
  }
  
  return {
    subject: '',
    body: '',
    sender: '',
    urls: '',
    error: 'No email content detected on this page'
  };
}

// Listen for requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getEmailContent") {
    const content = extractEmailContent();
    sendResponse(content);
  }
});