function Placeholder({ title }: { title: string }) {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      <p className="mt-2 text-gray-500">Coming next</p>
    </main>
  );
}

export function BookAppointmentPage() {
  return <Placeholder title="Book Appointment" />;
}

export function PatientAppointmentsPage() {
  return <Placeholder title="My Appointments" />;
}

export function PatientPrescriptionsPage() {
  return <Placeholder title="My Prescriptions" />;
}
