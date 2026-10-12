export function PageHeader({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-line bg-[linear-gradient(#fbfdff,#f8fafc)] px-4 pb-6 pt-8 sm:flex-row sm:items-end sm:justify-between sm:px-8 lg:pt-10">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">{title}</h1>
        <p className="mt-1 max-w-xl text-[14px] text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
