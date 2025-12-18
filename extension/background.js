// Background service worker handles communication between content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzeEmail") {
    // Get the active tab
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (!tabs || tabs.length === 0) {
        sendResponse({error: "No active tab found"});
        return;
      }
      
      // Send message to content script to get email content
      chrome.tabs.sendMessage(tabs[0].id, {action: "getEmailContent"}, (emailContent) => {
        if (chrome.runtime.lastError) {
          sendResponse({error: "Could not extract email content: " + chrome.runtime.lastError.message});
          return;
        }
        
        if (!emailContent || emailContent.error) {
          sendResponse({error: emailContent?.error || "Failed to extract email content"});
          return;
        }
        
        // Send to Python backend for analysis
        fetch('http://localhost:5000/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailContent)
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => {
          // Add email metadata to response
          data.subject = emailContent.subject;
          data.sender = emailContent.sender;
          sendResponse(data);
        })
        .catch(error => {
          console.error('Fetch error:', error);
          sendResponse({error: "Failed to connect to analysis server: " + error.message});
        });
      });
    });
    
    return true; // Required for async response
  }
});