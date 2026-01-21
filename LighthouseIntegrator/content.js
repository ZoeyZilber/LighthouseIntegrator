function fetchEvents(authToken) {
  fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log(data); 
    chrome.storage.local.set({ calendarEvents: data.items });
  })
  .catch(error => {
    console.error('Error fetching events:', error);
  });
}

autoScan();

function waitForElement(selector, timeout = 3000) {
  return new Promise(resolve => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}


async function autoScan() {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  await sleep(800);

  const target = [...document.querySelectorAll('span')]
    .find(el => el.textContent.trim() === 'Today');

  if (target) {
    console.log('Clicking Today');
    target.click();
  } else {
    console.log('Today button not found');
  }

  const observer = new MutationObserver(async () => {
    const cards = document.querySelectorAll('app-events-agenda div.cursor-pointer');
    if (!cards.length) return;

    observer.disconnect();

    console.log(`Found ${cards.length} cards — starting scan`);

    for (let day = 0; day < 3; day++) {
      await rotateSchedule();
      
      const nextBtn = await waitForElement('.e2e_schedule_next', 3000);

      if (!nextBtn) {
        console.log('Next button not found — ending autoscan.');
        return;
      }

      nextBtn.click();
      console.log('Advanced to next schedule');

      await sleep(1500);
    }

    console.log('Autoscan complete');
  });

  observer.observe(document.body, { childList: true, subtree: true });
}


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
  var eventTitleValue = "";

  if (filteredString.indexOf("Show Name") !== -1 && filteredString.indexOf("Order #") !== -1) {
      eventTitleValue = "Encore: " + 
      filteredString.slice(
        filteredString.indexOf("Show Name") + 10,
        filteredString.indexOf("Order #")
      );
  }

  const eventLocationValue =
    filteredString
      .substring(
        filteredString.indexOf("Working At") + "Working At".length,
        filteredString.indexOf("Client")
      )
      .trim();

  const roomRegex = /Room\s*([^\s]+.*?)(?=\s*PM|$)/i;
  const roomMatch = filteredString.match(roomRegex);

  if (roomMatch) {
    const eventLocationValue =
      " " + roomMatch[1].trim();
  }

  const regex = /\d{2}:\d{2}-\d{2}:\d{2}/;
  const hours = filteredString.match(regex);

  if (hours) {
    const [startTime, endTime] = hours[0].split("-");
    const reg2 = /\d{1,2}\/\d{1,2}\/\d{2}/;
    const date = filteredString.match(reg2);
    let [month, day, year] = date[0].split("/");

    let adjustedEndDate = 0;
    if (startTime >= endTime) {
      adjustedEndDate = 1;
    }

    function isDST(date) {
      const jan = new Date(date.getFullYear(), 0, 1);
      const jul = new Date(date.getFullYear(), 6, 1);
      const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
      return date.getTimezoneOffset() < stdOffset;
    }

    const baseDate = new Date(`20${year}`, month - 1, day);
    const dstActive = isDST(baseDate);

    const offsetHours = dstActive ? -4 : -5;

    const finalStartDate = new Date(
      2000 + Number(year),
      month - 1,
      Number(day),
      Number(startTime.slice(0, 2)) + offsetHours,
      Number(startTime.slice(3, 5))
    );

    const finalEndDate = new Date(
      2000 + Number(year),
      month - 1,
      Number(day) + adjustedEndDate,
      Number(endTime.slice(0, 2)) + offsetHours,
      Number(endTime.slice(3, 5))
    );

    const eventStartTimeValue = finalStartDate
      .toISOString()
      .slice(0, -1);
    const eventEndTimeValue = finalEndDate
      .toISOString()
      .slice(0, -1);
    
    createEvent(eventTitleValue, eventLocationValue, eventStartTimeValue, eventEndTimeValue);
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

function click(el) {
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    el.click();
  }

async function rotateSchedule() {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  var cards = Array.from(document.querySelectorAll('app-events-agenda div.cursor-pointer'));
  console.log(`Found ${cards.length} agenda cards`);

  for (let i = 0; i < cards.length; i++) {
    cards = Array.from(document.querySelectorAll('app-events-agenda div.cursor-pointer'));
    const card = cards[i];
    const clickable = card.querySelector('div.flex.truncate');
    if (!clickable) {
      console.warn(`No clickable row in card ${i + 1}`);
      continue;
    }

    click(clickable);
    await sleep(1200);

    const pageText = getVisibleText();
    showOverlay(pageText);

    await sleep(400);
       
const closeButton = document.querySelector('.mat-bottom-sheet-container .e2e_schedule_shift_close');

if (closeButton) {
    closeButton.click();
    console.log('Bottom sheet closed!');
} else {
    console.log('Close button not found.');
}
 
    await sleep(800);
  }

  console.log('Finished');
  await sleep(800);
}

function getToken() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "getToken" }, (response) => {
      if (response.error) reject(response.error);
      else resolve(response.token);
    });
  });
}


async function createEvent(title, location, startTime, endTime) {
  try {
    const token = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "getToken" }, (response) => {
        if (response.error) reject(response.error);
        else resolve(response.token);
      });
    });

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      alert('Invalid date format');
      return;
    }

    if (endDate <= startDate) {
      alert('End time must be after start time');
      return;
    }

    const event = {
      summary: title,
      location: location,
      start: { dateTime: startDate.toISOString(), timeZone: 'UTC' },
      end: { dateTime: endDate.toISOString(), timeZone: 'UTC' },
    };

    const dupCheckUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}&q=${encodeURIComponent(title)}&singleEvents=true&orderBy=startTime`;

    const dupResponse = await fetch(dupCheckUrl, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token },
    });
    const dupData = await dupResponse.json();

    if (dupData.items && dupData.items.length > 0) {
      const duplicateEvent = dupData.items.find(item => item.location === location);
      if (duplicateEvent) {
        const confirmCreateDuplicate = confirm('An event with the same title, location, and time already exists. Create a duplicate?');
        if (!confirmCreateDuplicate) return;
      }
    }

    const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    const createData = await createResponse.json();

    if (createData.id) {
      console.log('Event created successfully:', createData);
    } else {
      console.error('Error creating event:', createData);
    }

  } catch (error) {
    console.error('Error in createEvent:', error);
  }
}

