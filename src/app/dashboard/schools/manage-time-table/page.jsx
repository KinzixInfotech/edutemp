import BigCalendar from '@/components/big-calendar'
import BigCalendarContainer from '@/components/big-calendar-container'
import Timetable from '@/components/IA_Timetable'
import React from 'react'

const page = () => {
  return (
    <div className='px-3.5 py-2.5'>
        {/* <BigCalendar/> */}
        {/* <BigCalendarContainer/> */}
        <Timetable className="Class 1A"/>
        {/* <IATimetable/> */}
    </div>
  )
}

export default page