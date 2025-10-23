'use client'

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Plus, Trash } from 'lucide-react';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetableBuilder() {
  const [periods, setPeriods] = useState([
    { label: '1', time: '08:30-09:10' },
    { label: '2', time: '09:10-09:50' },
    { label: '3', time: '09:50-10:30' },
  ]);
  const [breakIndex, setBreakIndex] = useState(null);
  const [timetable, setTimetable] = useState({});

  const addPeriod = () => {
    const newIndex = periods.length + 1;
    setPeriods([...periods, { label: `${newIndex}`, time: '' }]);
  };

  const handleChange = (day, periodIndex, field, value) => {
    setTimetable(prev => {
      const updatedDay = prev[day] || [];
      updatedDay[periodIndex] = { ...updatedDay[periodIndex], [field]: value };
      return { ...prev, [day]: updatedDay };
    });
  };

  const handleSave = () => {
    console.log({ periods, breakIndex, timetable });
    // You can call a POST API here to save to your Prisma DB
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardContent className="space-y-4 pt-4">
          <h2 className="text-xl font-semibold">Period Settings</h2>
          {periods.map((p, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Label className="w-10">{p.label}</Label>
              <Input
                placeholder="08:30-09:10"
                value={p.time}
                onChange={e => {
                  const updated = [...periods];
                  updated[idx].time = e.target.value;
                  setPeriods(updated);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPeriods(periods.filter((_, i) => i !== idx))}
              >
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addPeriod}>
            <Plus className="w-4 h-4 mr-2" /> Add Period
          </Button>
          <div>
            <Label className="block mt-4">Lunch Break After Period</Label>
            <Select onValueChange={val => setBreakIndex(Number(val))}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    After Period {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 bg-white">
          <h2 className="text-xl font-semibold mb-4 bg-white">Timetable</h2>
          <div className="overflow-x-auto bg-white">
            <table className="table border text-sm bg-whi">
              <thead className='bg-white'>
                <tr>
                  <th className="border px-2 py-1">Day</th>
                  {periods.map((p, idx) => (
                    <th key={idx} className="border bg-white px-2 py-1">
                      {p.label}<br /><span className="text-xs text-muted-foreground">{p.time}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map(day => (
                  <tr key={day}>
                    <td className="border px-2 py-1 font-semibold whitespace-nowrap">{day}</td>
                    {periods.map((_, pIdx) => (
                      <td key={pIdx} className="border px-2 py-1 min-w-[150px]">
                        <Input
                          className="mb-1"
                          placeholder="Subject"
                          value={timetable[day]?.[pIdx]?.subject || ''}
                          onChange={e => handleChange(day, pIdx, 'subject', e.target.value)}
                        />
                        <Input
                          placeholder="Teacher"
                          value={timetable[day]?.[pIdx]?.teacher || ''}
                          onChange={e => handleChange(day, pIdx, 'teacher', e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button className="mt-6" onClick={handleSave}>
            Save Timetable
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
