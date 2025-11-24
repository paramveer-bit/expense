// components/Card.tsx
export default function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6 ${className}`}>
      {children}
    </div>
  );
}
