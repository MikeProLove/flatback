export default function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="rounded-2xl shadow p-4 bg-white border">
      {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      {children}
    </div>
  );
}