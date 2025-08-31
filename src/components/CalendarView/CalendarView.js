import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import './CalendarView.css';

const CalendarView = ({ hackathons = [] }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHackathons, setSelectedHackathons] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  // Update selectedHackathons when hackathons or selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const hackathonsOnDate = hackathons.filter(h => h.date === selectedDate);
      setSelectedHackathons(hackathonsOnDate);
    }
  }, [hackathons, selectedDate]);

  const handleDateClick = (arg) => {
    const clickedDate = arg.dateStr;
    setSelectedDate(clickedDate);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDate(null);
    setSelectedHackathons([]);
  };

  const getHackathonColor = (hackathonId) => {
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];
    const index = hackathons.findIndex(h => (h._id || h.id) === hackathonId);
    return colors[index % colors.length];
  };

  const calendarEvents = hackathons.flatMap(hackathon => {
    const hackathonId = hackathon._id || hackathon.id;
    const color = getHackathonColor(hackathonId);
    const events = [];
    
    // Create events for each round
    for (let round = 1; round <= hackathon.rounds; round++) {
      events.push({
        id: `${hackathonId}-r${round}`,
        title: `${hackathon.name} - R${round}`,
        date: hackathon.date,
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          hackathonId,
          platform: hackathon.platform,
          team: hackathon.team,
          rounds: hackathon.rounds,
          status: hackathon.status,
          round: round,
          originalHackathon: hackathon
        }
      });
    }
    
    return events;
  });

  return (
    <div className="calendar-view">
      <div className="container">
        <h2 className="section-title">📅 Hackathon Calendar</h2>
        <p className="section-description">
          Click on any date to view hackathons happening on that day
        </p>
        
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={calendarEvents}
            dateClick={handleDateClick}
            height="auto"
            eventDisplay="block"
            dayMaxEvents={true}
            moreLinkClick="popover"
            eventClick={(info) => {
              const hackathon = info.event.extendedProps.originalHackathon;
              if (hackathon) {
                setSelectedHackathons([hackathon]);
                setSelectedDate(hackathon.date);
                setShowModal(true);
              }
            }}
          />
        </div>
      </div>

      {/* Hackathon Details Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Hackathons on {selectedDate}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <div className="modal-body">
              {selectedHackathons.length === 0 ? (
                <p>No hackathons scheduled for this date.</p>
              ) : (
                selectedHackathons.map(hackathon => (
                  <div key={hackathon.id} className="hackathon-card">
                    <div className="hackathon-header">
                      <h4>{hackathon.name}</h4>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(hackathon.status) }}
                      >
                        {hackathon.status}
                      </span>
                    </div>
                    
                    <div className="hackathon-details grid grid-2">
                      <div>
                        <strong>Platform:</strong> {hackathon.platform}
                      </div>
                      <div>
                        <strong>Team:</strong> {hackathon.team}
                      </div>
                      <div>
                        <strong>Rounds:</strong> {hackathon.rounds}
                      </div>
                      <div>
                        <strong>Email:</strong> {hackathon.email}
                      </div>
                    </div>
                    
                    {hackathon.remarks && (
                      <div className="hackathon-remarks">
                        <strong>Remarks:</strong>
                        <ul>
                          {Object.entries(hackathon.remarks).map(([round, remark]) => (
                            <li key={round}>
                              <strong>{round}:</strong> {remark}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {hackathon.notifications && (
                      <div className="hackathon-notifications">
                        <strong>Notifications:</strong>
                        <ul>
                          {hackathon.notifications.map((notification, index) => (
                            <li key={index}>{notification.trigger}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
