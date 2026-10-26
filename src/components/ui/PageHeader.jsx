// Standard page header. The top bar already shows the page name, so the title is only
// rendered when it adds information (`heading`, e.g. an estate's or show's own name).
export default function PageHeader({ title, heading = false, description, actions, children }) {
  const showTitle = heading && title;
  if (!showTitle && !description && !actions && !children) return null;
  return (
    <div className="mb-5">
      {(showTitle || description || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {showTitle && <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-[#101828]">{title}</h1>}
            {description && <p className={`${showTitle ? 'mt-1' : ''} text-[13px] text-[#475467] max-w-2xl`}>{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 flex-shrink-0 sm:ml-auto">{actions}</div>}
        </div>
      )}
      {children && <div className={showTitle || description || actions ? 'mt-4' : ''}>{children}</div>}
    </div>
  );
}
