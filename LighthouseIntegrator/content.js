function fetchEvents(authToken) {
  fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log(data); // This contains the calendar events
    chrome.storage.local.set({ calendarEvents: data.items });
  })
  .catch(error => {
    console.error('Error fetching events:', error);
  });
}


function createEvent(title, location, startTime, endTime) {
  chrome.identity.getAuthToken({ interactive: true }, function (token) {
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

    fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}&q=${title}&singleEvents=true&orderBy=startTime`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
      },
    })
    .then(response => response.json())
    .then(data => {
      if (data.items && data.items.length > 0) {
        const duplicateEvent = data.items.find(item => item.location === location);
        if (duplicateEvent) {
          const confirmCreateDuplicate = confirm('An event with the same title, location, and time already exists. Do you want to create a duplicate event?');
          if (!confirmCreateDuplicate) {
            return;
          }
        }
      }

      fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })
      .then(response => response.json())
      .then(data => {
        if (data.id) {
          alert('Event created successfully!');
        } else {
          alert('Error creating event: ' + JSON.stringify(data));
        }
      })
      .catch(error => {
        console.error(error);
        alert('Error creating event: ' + error);
      });
    })
    .catch(error => {
      console.error(error);
      alert('Error checking for duplicate events: ' + error);
    });
  });
}
