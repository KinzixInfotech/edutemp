"use client";

import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const BigCalendar = ({ data, viewMode }) => {
    return (
        <Calendar
            localizer={localizer}
            events={data}
            startAccessor="start"
            endAccessor="end"
            views={["work_week", "day"]}
            view={viewMode}
            defaultDate={new Date()}
            style={{ height: "100%" }}
            min={new Date(0, 0, 0, 8, 0)}
            max={new Date(0, 0, 0, 14, 0)}
            eventPropGetter={(event) => ({
                style: {
                    backgroundColor: event.color,
                    borderRadius: "4px",
                    color: "white",
                    padding: "4px",
                },
            })}
        />
    );
};

export default BigCalendar;
