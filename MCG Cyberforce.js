let originalUrls = [];
let urlCounts = {};

function checkDuplicates(urls) {
    const duplicateList = document.getElementById('duplicateList');

    // Get entered URLs and split them into an array
    originalUrls = urls;

    // Reset the counts
    urlCounts = {};

    // Iterate through each URL
    for (const url of originalUrls) {
        // Extract the domain from the URL
        const domain = url.split('/')[2];

        // Increment the count for the domain in the urlCounts object
        urlCounts[domain] = (urlCounts[domain] || 0) + 1;
    }

    // Clear previous duplicate list
    duplicateList.innerHTML = '';

    // Iterate through the urlCounts object and display duplicates
    for (const [domain, count] of Object.entries(urlCounts)) {
        if (count > 1) {
            // Display duplicate URLs and their count
            const duplicateItem = document.createElement('li');
            duplicateItem.textContent = `${domain}: ${count} duplicates`;
            duplicateList.appendChild(duplicateItem);
        }
    }
}

async function removeDuplicatesAndCheckUrls() {
    // Remove duplicates from the original array
    const uniqueUrls = originalUrls.filter(url => url.split('/')[2] && urlCounts[url.split('/')[2]] === 1);

    // Log the new array without duplicates
    console.log('New Array without Duplicates:', uniqueUrls);

    // Display the new array in the textarea
    const newArrayTextArea = document.getElementById('newArray');
    newArrayTextArea.value = uniqueUrls.join('\n');

    // Check Safe Browsing API for each unique URL
    for (const url of uniqueUrls) {
        await checkUrl(url);
    }
}

function disarrayAndCheckUrls(userLink) {
    // Call the duplicate check function
    checkDuplicates(userLink);

    removeDuplicatesAndCheckUrls();
}

const apiKey = 'AIzaSyD15HO4e-_237YMr3L_bkH2Lx9esV4Po0o';

// Safe Browsing API endpoint
const apiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;

async function checkUrl(urlInput) {
    // Example data for threatMatches.find request
    const requestData = {
        "client": {
            "clientId": "your_actual_company_name", // Replace with your actual company name
            "clientVersion": "1.5.2"
        },
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING"],
            "platformTypes": ["WINDOWS"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{
                "url": urlInput
            }]
        }
    };

    try {
        // Send HTTP POST request to Safe Browsing API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        // Handle the API response
        const data = await response.json();
        displayResult(data);
    } catch (error) {
        // Handle errors
        console.error('Error:', error);
    }
}


function displayResult(apiResponse) {
    const resultContainer = document.getElementById('resultContainer');

    if (apiResponse.matches && apiResponse.matches.length > 0) {
        Warning.innerHTML += 'WARNING!: This is a phishing URL.';
        apiResponse.matches.forEach(match => {
            resultContainer.innerHTML += `<p>${match.threatType} - ${match.threat.url}</p>`;
        });
    }
}



let scrapeLinks = document.getElementById('scrapeLinks');
let list = document.getElementById('linkList');

// Handler to receive emails from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Get links
    let links = request.links;

    // Display emails on popup
    if (links == null || links.length == 0) {
        // No links
        let li = document.createElement('li');
        li.innerText = "No links found";
        list.appendChild(li);
    } else {
        // Call the disarray and check URLs function
        disarrayAndCheckUrls(links);
    }
});

// Button's click event listener
scrapeLinks.addEventListener("click", async () => {
    // Get current active tab
    let [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    // Execute script to parse links on the page
    chrome.scripting.executeScript({
        target: {
            tabId: tab.id
        },
        function: scrapeLinksFromPage,
    });
});

// Function to scrape links
function scrapeLinksFromPage() {
    // RegEx to parse URLs from HTML code
    const linkRegEx = /https?:\/\/[^\s"]+/g;

    // Parse links from the HTML of the page
    const links = Array.from(document.body.getElementsByTagName('a'))
        .map(a => a.href)
        .filter(link => link.match(linkRegEx));

    // Send links to popup
    chrome.runtime.sendMessage({
        links
    });
}