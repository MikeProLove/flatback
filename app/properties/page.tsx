// app/properties/page.tsx  — серверный компонент
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function PropertiesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">Раздел «Объекты»</h1>
      <p className="text-sm text-muted-foreground">Страница в разработке.</p>
    </div>
  );
}
