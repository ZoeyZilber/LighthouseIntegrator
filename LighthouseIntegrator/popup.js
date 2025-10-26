chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs.length > 0) {
    const activeTab = tabs[0];
    console.log("Sending message to tab:", activeTab.id);

    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: getVisibleText
    }, (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error injecting script:", chrome.runtime.lastError);
      } else {
        const pageText = result[0].result;
        showOverlay(pageText);
      }
    });
  }
});

function getVisibleText() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentNode;
      const style = window.getComputedStyle(parent);

      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        style.position !== "absolute" &&
        node.nodeValue.trim() !== ""
      )
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });

  let text = "";
  while (walker.nextNode()) {
    text += walker.currentNode.nodeValue + " ";
  }

  return text.trim();
}

function showOverlay(text) {
  const filteredString = filterString(text);
  if (filteredString.indexOf("Show Name") != -1 && filteredString.indexOf("Order #") != -1) {
    document.getElementById("event-title").value = filteredString.slice(filteredString.indexOf("Show Name") + 10, filteredString.indexOf("Order #"));
}

document.getElementById("event-location").value = 
  filteredString.substring(filteredString.indexOf("Working At") + "Working At".length, filteredString.indexOf("Client")).trim();

const roomRegex = /Room\s*([^\s]+.*?)(?=\s*PM|$)/i;
const roomMatch = filteredString.match(roomRegex);

if (roomMatch) {
  document.getElementById("event-location").value += " " + roomMatch[1].trim();
}

  const regex = /\d{2}:\d{2}-\d{2}:\d{2}/;
  const hours = filteredString.match(regex);

  if (hours) {
    const [startTime, endTime] = hours[0].split('-');
    const reg2 = /\d{1,2}\/\d{1,2}\/\d{2}/;
    const date = filteredString.match(reg2);
    let [month, day, year] = date[0].split('/');

    let adjustedEndDate = 0;
  if (startTime >= endTime) {
        adjustedEndDate = 1;
  }
    const finalStartDate = new Date("20" + year, "0" + month-1, day, startTime.slice(0, 2)-4, startTime.slice(3, 5), 0, 0);    
    const finalEndDate = new Date("20" + year, "0" + month-1, Number(day)+adjustedEndDate, endTime.slice(0,2)-4, endTime.slice(3, 5), 0, 0);
    document.getElementById("event-start-time").value = finalStartDate.toISOString().slice(0, finalStartDate.toISOString().length-1);
    document.getElementById("event-end-time").value = finalEndDate.toISOString().slice(0, finalEndDate.toISOString().length-1);
  } else {
    console.log("No time range found.");
  }
}

function filterString(inputString) {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const endString = "Onsite Contact";
  const datePattern = /\d{1,2}\/\d{1,2}\/\d{2}/;
  const requiredFollowup = "Shift Details Employee Name Zilber,Zoey";

  for (let day of daysOfWeek) {
    const dayPattern = new RegExp(`${day}\\s*(${datePattern.source})?\\s*${requiredFollowup}`, 'i');
    const startIndex = inputString.search(dayPattern);
    const endIndex = inputString.indexOf(endString);

    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      return inputString.slice(startIndex, endIndex).trim();
    }
  }

  return "The required strings were not found or are in the wrong order.";
}

document.getElementById('create-event').addEventListener('click', () => {
  console.log("Create event button clicked");

  const title = document.getElementById('event-title').value;
  const location = document.getElementById('event-location').value;
  const startTime = document.getElementById('event-start-time').value;
  const endTime = document.getElementById('event-end-time').value;

  if (!title || !startTime || !endTime) {
    alert('Please fill all fields');
    return;
  }

  createEvent(title, location, startTime, endTime);
});

