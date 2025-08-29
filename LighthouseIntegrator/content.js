document.getElementById('create-event').addEventListener('click', () => {
  const title = document.getElementById('event-title').value;
  const startTime = document.getElementById('event-start-time').value;
  const endTime = document.getElementById('event-end-time').value;

  if (!title || !startTime || !endTime) {
    alert('Please fill all fields');
    return;
  }

  createEvent(title, startTime, endTime);
});

function createEvent(title, startTime, endTime) {
  chrome.identity.getAuthToken({ interactive: true }, function (token) {
    const startISO = new Date(startTime).toISOString();
    const endISO = new Date(endTime).toISOString();

    const event = {
      summary: title,
      start: { dateTime: startISO, timeZone: 'UTC' },
      end: { dateTime: endISO, timeZone: 'UTC' },
    };

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
  });
}
