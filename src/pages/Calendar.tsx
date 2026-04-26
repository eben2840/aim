import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import { calendarApi } from "../api";

interface Event {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  color: string;
}

const COLORS = ["Primary", "Success", "Warning", "Danger"];

const colorClass = (color: string) => `fc-bg-${color.toLowerCase()}`;

export default function Calendar() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState<Event | null>(null);
  const [form, setForm] = useState({ title: "", startDate: "", endDate: "", color: "Primary" });
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  useEffect(() => {
    calendarApi.list().then(setEvents).catch(() => {});
  }, []);

  const toLocalDT = (s: string) => {
    if (!s) return "";
    if (s.length <= 10) return `${s}T00:00`;
    return s.slice(0, 16);
  };

  const openAdd = (start = "", end = "") => {
    setSelected(null);
    setForm({ title: "", startDate: toLocalDT(start), endDate: toLocalDT(end), color: "Primary" });
    openModal();
  };

  const openEdit = (event: Event) => {
    setSelected(event);
    setForm({ title: event.title, startDate: toLocalDT(event.startDate), endDate: toLocalDT(event.endDate ?? ""), color: event.color });
    openModal();
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (selected) {
      const updated = await calendarApi.update(selected.id, { title: form.title, startDate: form.startDate, endDate: form.endDate || undefined, color: form.color }) as Event;
      setEvents((prev) => prev.map((e) => (e.id === selected.id ? updated : e)));
    } else {
      const created = await calendarApi.create({ title: form.title, startDate: form.startDate, endDate: form.endDate || undefined, color: form.color }) as Event;
      setEvents((prev) => [...prev, created]);
    }
    closeModal();
  };

  const handleDelete = async () => {
    if (!selected) return;
    await calendarApi.delete(selected.id);
    setEvents((prev) => prev.filter((e) => e.id !== selected.id));
    closeModal();
  };

  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.startDate,
    end: e.endDate,
    extendedProps: { color: e.color },
  }));

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Calendar</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Schedule meetings, orders, and reminders. AbiTrack AI can create events for you.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="custom-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next addEventButton",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={fcEvents}
            selectable
            select={(info: DateSelectArg) => openAdd(info.startStr, info.endStr)}
            eventClick={(info: EventClickArg) => {
              const e = events.find((ev) => ev.id === info.event.id);
              if (e) openEdit(e);
            }}
            eventContent={(info) => (
              <div className={`event-fc-color flex fc-event-main ${colorClass(info.event.extendedProps.color)} p-1 rounded`}>
                <div className="fc-daygrid-event-dot" />
                <div className="fc-event-time">{info.timeText}</div>
                <div className="fc-event-title">{info.event.title}</div>
              </div>
            )}
            customButtons={{
              addEventButton: { text: "Add Event +", click: () => openAdd() },
            }}
          />
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[560px] p-6 lg:p-8">
        <h5 className="mb-1 text-xl font-semibold text-gray-800 dark:text-white/90">
          {selected ? "Edit Event" : "Add Event"}
        </h5>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {selected ? "Update or delete this event" : "Add a new event to your calendar"}
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Meeting with Nike supplier"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Start</label>
              <input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">End</label>
              <input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">Color</label>
            <div className="flex gap-3">
              {COLORS.map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <input type="radio" name="color" value={c} checked={form.color === c} onChange={() => setForm({ ...form, color: c })} className="sr-only" />
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 fc-bg-${c.toLowerCase()} ${form.color === c ? "ring-2 ring-offset-1 ring-brand-400" : "opacity-60"}`} />
                  {c}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-7 sm:justify-end">
          {selected && (
            <button onClick={handleDelete} className="rounded-lg border border-error-300 px-4 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50 dark:border-error-700 dark:text-error-400">
              Delete
            </button>
          )}
          <button onClick={closeModal} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            Cancel
          </button>
          <button onClick={handleSave} className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
            {selected ? "Update" : "Add Event"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
